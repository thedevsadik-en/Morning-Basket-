"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useStoreSettings } from "@/lib/useStoreSettings";

export interface FloatingBasketDockProps {
  totalItems?: number;
  cartTotal?: number;
  minimumOrderValue?: number;
  isMovReached?: boolean;
  neededForMOV?: number;
}

export default function FloatingBasketDock(props: FloatingBasketDockProps = {}) {
  const pathname = usePathname();
  const cartHook = useCart();
  const { settings } = useStoreSettings();

  const [isMinimized, setIsMinimized] = useState(false);

  const MIN_ORDER = props.minimumOrderValue ?? settings.min_order_value;
  const FREE_DELIVERY_THRESHOLD = settings.free_delivery_threshold;
  const DELIVERY_FEE = settings.delivery_fee;

  const itemCount = props.totalItems ?? cartHook.totalItems;
  const subtotal =
    props.cartTotal ??
    Object.values(cartHook.cart).reduce((sum, item) => {
      const unit = (item.unit || "").toLowerCase();
      const normalizedQty =
        unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
          ? item.qty / 1000
          : item.qty;
      return sum + normalizedQty * item.price;
    }, 0);

  // Auto-expand on product add: whenever itemCount increases, auto-open the dock
  const prevItemCountRef = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevItemCountRef.current) {
      setIsMinimized(false);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount]);

  // Hide on empty or on checkout / basket page / admin routes
  if (
    pathname === "/basket" ||
    pathname?.startsWith("/admin") ||
    itemCount === 0
  ) {
    return null;
  }

  // Tier progress calculations
  const tier1Progress = Math.min((subtotal / MIN_ORDER) * 100, 100);
  const tier2Progress = Math.min(
    (subtotal / FREE_DELIVERY_THRESHOLD) * 100,
    100
  );

  return (
    <aside
      aria-label="Floating Basket Summary"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
    >
      <div
        role={isMinimized ? "button" : undefined}
        tabIndex={isMinimized ? 0 : undefined}
        aria-label={isMinimized ? "Open basket overview" : undefined}
        onKeyDown={(e) => {
          if (isMinimized && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsMinimized(false);
          }
        }}
        onClick={() => {
          if (isMinimized) setIsMinimized(false);
        }}
        className={`
          pointer-events-auto
          bg-[#1E3324]/95 backdrop-blur-md text-[#F8F6F0] border border-[#2D4834]
          shadow-[0_16px_36px_rgba(30,51,36,0.32)]
          rounded-full flex items-center overflow-hidden
          transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isMinimized
            ? "px-3 py-2 gap-2 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
            : "px-4 py-2.5 gap-3 sm:gap-5 cursor-default"
          }
        `}
      >
        {/* ── Persistent Left Anchor (Bag Icon + Price + Minimized Badge Count) ── */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 transition-transform duration-300">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="font-serif text-sm font-bold text-white tracking-tight">
              ৳{Math.round(subtotal)}
            </span>
            {isMinimized && (
              <span className="text-[10px] text-white/60 font-medium">
                ({itemCount})
              </span>
            )}
          </div>
        </div>

        {/* ── Expandable Center & Right Section (Smooth Width & Fade Collapse) ── */}
        <div
          className={`
            flex items-center gap-3 sm:gap-5 overflow-hidden
            transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isMinimized
              ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
              : "max-w-[600px] opacity-100 translate-x-0"
            }
          `}
        >
          {/* Divider */}
          <div className="h-5 w-px bg-white/15 shrink-0 hidden sm:block" />

          {/* Progress Bar & Sub-labels */}
          <div className="shrink-0 hidden sm:flex flex-col justify-center min-w-[130px]">
            {subtotal < MIN_ORDER ? (
              <div className="flex flex-col justify-center">
                <span className="text-[11px] text-amber-200 font-medium leading-tight whitespace-nowrap">
                  Add ৳{Math.ceil(MIN_ORDER - subtotal)} for ৳{MIN_ORDER} min order
                </span>
                <div className="h-1 w-28 bg-white/15 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-amber-400"
                    style={{ width: `${tier1Progress}%` }}
                  />
                </div>
              </div>
            ) : subtotal < FREE_DELIVERY_THRESHOLD ? (
              <div className="flex flex-col justify-center">
                <span className="text-[11px] text-white/90 font-medium leading-tight whitespace-nowrap">
                  ৳{MIN_ORDER} Min ✓ · Add ৳{Math.ceil(FREE_DELIVERY_THRESHOLD - subtotal)} for Free Delivery
                </span>
                <div className="h-1 w-28 bg-white/15 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-[#E5C378]"
                    style={{ width: `${tier2Progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-center">
                <span className="text-[11px] text-emerald-300 font-medium leading-tight whitespace-nowrap">
                  🎉 Free Dawn Delivery Unlocked!
                </span>
                <div className="h-1 w-28 bg-white/15 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-400"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Checkout Action Button */}
          <div className="shrink-0">
            {subtotal < MIN_ORDER ? (
              <button
                disabled
                className="bg-white/15 text-white/50 text-[11px] font-medium px-3.5 py-1.5 rounded-full cursor-not-allowed whitespace-nowrap select-none"
              >
                Add ৳{Math.ceil(MIN_ORDER - subtotal)} to Order
              </button>
            ) : (
              <Link
                href="/basket"
                id="floating-basket-checkout-btn"
                className="bg-[#F8F6F0] hover:bg-white text-[#1E3324] font-semibold text-xs tracking-wide px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-sm whitespace-nowrap cursor-pointer"
              >
                <span>Checkout</span>
                <span className="font-bold">→</span>
              </Link>
            )}
          </div>

          {/* Smooth Close / Minimize Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            title="Minimize cart"
            aria-label="Minimize cart"
            className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 ml-0.5 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export const FloatingCart = FloatingBasketDock;
