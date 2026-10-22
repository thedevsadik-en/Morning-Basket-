"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface StoreSettings {
  min_order_value: number;
  free_delivery_threshold: number;
  delivery_fee: number;
  bkash_number: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  min_order_value: 300,
  free_delivery_threshold: 700,
  delivery_fee: 60,
  bkash_number: "01712069030",
};

const SETTINGS_KEY = "mb_store_settings";
const SETTINGS_EVENT = "mb_settings_change";

function readCachedSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_STORE_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_STORE_SETTINGS;
    return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

function writeCachedSettings(settings: StoreSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function broadcastSettingsChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const cached = readCachedSettings();
      setSettings(cached);

      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();

      if (!error && data) {
        const merged: StoreSettings = {
          min_order_value: Number(
            data.min_order_value ?? data.minimum_order_value ?? cached.min_order_value ?? 300
          ),
          free_delivery_threshold: Number(
            data.free_delivery_threshold ?? cached.free_delivery_threshold ?? 700
          ),
          delivery_fee: Number(
            data.delivery_fee ?? cached.delivery_fee ?? 60
          ),
          bkash_number: String(
            data.bkash_number ?? cached.bkash_number ?? "01712069030"
          ),
        };
        setSettings(merged);
        writeCachedSettings(merged);
      }
    } catch (err) {
      console.warn("Could not fetch remote store settings, using defaults/cached:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const handleSync = () => {
      setSettings(readCachedSettings());
    };

    window.addEventListener(SETTINGS_EVENT, handleSync);
    return () => window.removeEventListener(SETTINGS_EVENT, handleSync);
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (newSettings: Partial<StoreSettings>) => {
      const updated: StoreSettings = {
        ...settings,
        ...newSettings,
      };

      // Optimistically update cache and broadcast immediately
      setSettings(updated);
      writeCachedSettings(updated);
      broadcastSettingsChange();

      // Persist to Supabase
      try {
        // Attempt full update first
        const payload: Record<string, any> = {
          bkash_number: updated.bkash_number,
          minimum_order_value: updated.min_order_value,
          min_order_value: updated.min_order_value,
          free_delivery_threshold: updated.free_delivery_threshold,
          delivery_fee: updated.delivery_fee,
        };

        const { error: fullError } = await supabase
          .from("store_settings")
          .update(payload)
          .eq("id", 1);

        if (fullError) {
          // If columns don't exist in Postgres schema cache yet, update existing columns
          if (fullError.code === "PGRST204") {
            const fallbackPayload = {
              bkash_number: updated.bkash_number,
              minimum_order_value: updated.min_order_value,
            };
            const { error: fallbackError } = await supabase
              .from("store_settings")
              .update(fallbackPayload)
              .eq("id", 1);

            if (fallbackError) throw fallbackError;
          } else {
            throw fullError;
          }
        }
        return { success: true };
      } catch (err: any) {
        console.error("Failed to update store settings:", err);
        return { success: false, error: err.message || "Failed to save settings" };
      }
    },
    [settings]
  );

  return { settings, loading, updateSettings, refreshSettings: fetchSettings };
}
