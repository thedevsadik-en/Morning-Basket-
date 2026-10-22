"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useStoreSettings } from "@/lib/useStoreSettings";

interface Category {
  id: string;
  name: string;
}

export default function ConfigurationPage() {
  const { settings, loading: isLoadingSettings, updateSettings } = useStoreSettings();

  // --- Store Settings State ---
  const [minOrderValue, setMinOrderValue] = useState("");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state once settings load
  useEffect(() => {
    if (!isLoadingSettings) {
      setMinOrderValue(settings.min_order_value.toString());
      setFreeDeliveryThreshold(settings.free_delivery_threshold.toString());
      setDeliveryFee(settings.delivery_fee.toString());
      setBkashNumber(settings.bkash_number);
    }
  }, [isLoadingSettings, settings]);

  // --- Categories State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // Fetch Categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        if (catError) throw catError;
        setCategories(catData || []);
      } catch (err: any) {
        console.error("Error fetching categories:", err);
        setCategoryError("Failed to load categories.");
      } finally {
        setIsLoadingCategories(false);
      }
    }

    fetchCategories();
  }, []);

  // --- Handlers ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setToastMessage(null);
    setErrorMessage(null);

    const mov = Number(minOrderValue) || 300;
    const fdt = Number(freeDeliveryThreshold) || 700;
    const fee = Number(deliveryFee) || 60;
    const bk = bkashNumber.trim() || "01712069030";

    const result = await updateSettings({
      min_order_value: mov,
      free_delivery_threshold: fdt,
      delivery_fee: fee,
      bkash_number: bk,
    });

    setIsSavingSettings(false);

    if (result.success) {
      setToastMessage("Store configuration updated successfully.");
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setErrorMessage(result.error || "Failed to save settings.");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsAddingCategory(true);
    setCategoryError("");
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategory.trim() }]);

      if (error) throw error;
      setNewCategory("");

      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error adding category:", err);
      setCategoryError("Failed to add category. It might already exist.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error deleting category:", err);
      setCategoryError("Failed to delete category.");
    }
  };

  const fieldClass =
    "w-full border border-[#EAE6DF] rounded-xl px-4 py-3 bg-[#FAF9F6] text-[#1E3324] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all";
  const labelClass =
    "block text-xs font-semibold uppercase tracking-wider text-[#5A6E5F] mb-1.5";

  if (isLoadingSettings || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#1E3324] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1E3324] mb-2 tracking-tight">
          Configuration &amp; Policies
        </h1>
        <p className="text-sm text-[#5A6E5F]">
          Control delivery thresholds, minimum order requirements, bKash routing, and dynamic produce categories.
        </p>
      </div>

      {/* --- Toast / Alert Notification --- */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-900 border border-red-200 text-sm font-medium flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* --- Store Settings Card (4-Field Grid) --- */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE6DF] shadow-xs">
        <div className="border-b border-[#F0EDE6] pb-4 mb-6">
          <h2 className="text-xl font-serif font-bold text-[#1E3324]">
            Store Delivery &amp; Order Policies
          </h2>
          <p className="text-xs text-[#5A6E5F] mt-1">
            These values immediately dictate checkout limits and delivery fee calculations across the storefront and floating cart.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. Minimum Order Value (MOV) */}
            <div>
              <label className={labelClass}>
                Minimum Order Value (MOV ৳) <span className="text-[#1E3324]">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 300"
              />
              <span className="text-[11px] text-[#7A8C7E] mt-1 block">
                Absolute minimum cart subtotal required to place an order.
              </span>
            </div>

            {/* 2. Free Delivery Threshold */}
            <div>
              <label className={labelClass}>
                Free Delivery Threshold (৳) <span className="text-[#1E3324]">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 700"
              />
              <span className="text-[11px] text-[#7A8C7E] mt-1 block">
                Subtotal where the delivery fee automatically drops to ৳0 (FREE).
              </span>
            </div>

            {/* 3. Standard Delivery Fee */}
            <div>
              <label className={labelClass}>
                Standard Delivery Fee (৳) <span className="text-[#1E3324]">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="5"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 60"
              />
              <span className="text-[11px] text-[#7A8C7E] mt-1 block">
                Delivery charge applied when order subtotal is below the free threshold.
              </span>
            </div>

            {/* 4. bKash Number */}
            <div>
              <label className={labelClass}>
                Store bKash Number <span className="text-[#1E3324]">*</span>
              </label>
              <input
                type="text"
                required
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 01712069030"
              />
              <span className="text-[11px] text-[#7A8C7E] mt-1 block">
                Official merchant/personal bKash wallet number displayed at checkout.
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 cursor-pointer ${
                isSavingSettings
                  ? "bg-[#1E3324]/60 text-white/70 cursor-not-allowed"
                  : "bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] shadow-sm active:scale-98"
              }`}
            >
              {isSavingSettings ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#F8F6F0] border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </form>
      </section>

      {/* --- Categories Card --- */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE6DF] shadow-xs">
        <div className="border-b border-[#F0EDE6] pb-4 mb-6">
          <h2 className="text-xl font-serif font-bold text-[#1E3324]">
            Storefront Categories
          </h2>
          <p className="text-xs text-[#5A6E5F] mt-1">
            Manage the produce collections that appear on the storefront navbar and filter tabs.
          </p>
        </div>

        {categoryError && (
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 mb-4 rounded-xl text-sm font-medium">
            {categoryError}
          </div>
        )}

        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className={labelClass}>New Category Name</label>
              <input
                type="text"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Dairy & Eggs"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingCategory || !newCategory.trim()}
              className="w-full sm:w-auto bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer h-[46px] shadow-sm"
            >
              {isAddingCategory ? "Adding..." : "Add Category"}
            </button>
          </form>

          <div className="border border-[#EAE6DF] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EAE6DF] text-[#5A6E5F]">
                  <th className="p-4 font-bold text-xs uppercase tracking-widest">Category Name</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-[#FAF9F6]/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-[#1E3324] text-sm">{category.name}</div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-[#8A9A8E] font-medium text-sm">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
