"use client";

import Link from "next/link";

interface FloatingBasketDockProps {
  totalItems: number;
  cartTotal: number;
  minimumOrderValue: number;
  isMovReached: boolean;
  neededForMOV: number;
}

export default function FloatingBasketDock({
  totalItems,
  cartTotal,
  minimumOrderValue,
  isMovReached,
  neededForMOV,
}: FloatingBasketDockProps) {
  if (totalItems === 0) {
    return null;
  }

  const progressPercentage = Math.min(
    (cartTotal / (minimumOrderValue || 450)) * 100,
    100
  );

  return (
    <aside
      aria-label="Floating Basket Summary"
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300 ease-out"
    >
      <div className="bg-[#1E3324]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3.5 sm:p-4 text-[#F8F6F0] shadow-[0_16px_48px_rgba(30,51,36,0.35)] flex flex-col gap-2.5">
        {/* Top row: Item count and Subtotal */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F8F6F0]/70">Your Basket</p>
              <p className="text-xs font-bold text-white">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium text-[#F8F6F0]/70">Subtotal</p>
            <p className="font-extrabold text-lg text-[#F8F6F0] tracking-tight">
              ৳{cartTotal.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Middle row: Minimum Order Value progress bar */}
        <div className="space-y-1 bg-black/25 p-2 rounded-xl border border-white/5">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isMovReached ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p
            className={`text-[11px] font-semibold text-center ${
              isMovReached ? "text-emerald-200" : "text-[#F8F6F0]/80"
            }`}
          >
            {isMovReached
              ? "✓ Minimum order reached for morning delivery!"
              : `Add ৳${neededForMOV.toFixed(0)} more to meet ৳${minimumOrderValue} delivery minimum`}
          </p>
        </div>

        {/* Bottom row: Review Basket Action Button */}
        <Link
          href="/basket"
          id="floating-basket-checkout-btn"
          className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm tracking-wide text-center transition-all duration-200 flex items-center justify-center gap-2 ${
            isMovReached
              ? "bg-[#2D4A35] text-[#F8F6F0] hover:bg-[#385B42] active:scale-[0.98] shadow-md shadow-black/20"
              : "bg-white/10 text-white/50 pointer-events-none cursor-not-allowed"
          }`}
          aria-disabled={!isMovReached}
          tabIndex={isMovReached ? 0 : -1}
        >
          <span>Review Basket & Checkout</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
