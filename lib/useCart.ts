"use client";

import { useState, useEffect, useCallback } from "react";

export type CartUnit = "Kg" | "g";

export type CartItem = {
  qty: number;
  unit: CartUnit;
  price: number; // price per Kg, snapshotted at add-time so basket needs no second DB fetch
};

export type Cart = Record<string, CartItem>;

const CART_KEY = "mb_cart";

function readCart(): Cart {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as Cart) : {};
  } catch {
    return {};
  }
}

function writeCart(cart: Cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

const CART_EVENT = "mb_cart_change";

function broadcast() {
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const [cart, setCartState] = useState<Cart>({});

  useEffect(() => {
    setCartState(readCart());
    const handler = () => setCartState(readCart());
    window.addEventListener(CART_EVENT, handler);
    return () => window.removeEventListener(CART_EVENT, handler);
  }, []);

  const setCart = useCallback((updater: (prev: Cart) => Cart) => {
    setCartState((prev) => {
      const next = updater(prev);
      writeCart(next);
      broadcast();
      return next;
    });
  }, []);

  const addOrUpdate = useCallback(
    (productId: string, qty: number, unit: CartUnit, price: number) => {
      setCart((prev) => {
        if (qty <= 0) {
          const { [productId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [productId]: { qty, unit, price } };
      });
    },
    [setCart]
  );

  const removeItem = useCallback(
    (productId: string) => {
      setCart((prev) => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
    },
    [setCart]
  );

  const clearCart = useCallback(() => {
    setCart(() => ({}));
  }, [setCart]);

  const totalItems = Object.values(cart).reduce((s, i) => s + i.qty, 0);

  return { cart, addOrUpdate, removeItem, clearCart, totalItems };
}
