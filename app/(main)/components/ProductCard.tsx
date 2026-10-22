"use client";

import { CartUnit } from "@/lib/useCart";

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  is_best_seller: boolean;
};

export type CardInput = { qty: string; unit: CartUnit };

// Discrete packaging units that should not use fractional steps or Kg/g toggles
export const DISCRETE_UNITS = [
  "piece",
  "pc",
  "pcs",
  "jar",
  "bottle",
  "box",
  "packet",
  "pack",
  "bunch",
  "dozen",
];

interface ProductCardProps {
  product: Product;
  draft: CardInput;
  inCart: boolean;
  isFeedbackActive: boolean;
  onDraftChange: (patch: Partial<CardInput>) => void;
  onAddToCart: (product: Product) => void;
  isPriority?: boolean;
}

export default function ProductCard({
  product,
  draft,
  inCart,
  isFeedbackActive,
  onDraftChange,
  onAddToCart,
  isPriority = false,
}: ProductCardProps) {
  const cleanUnit = (product.unit || "").toLowerCase();
  const isWeightUnit = !DISCRETE_UNITS.includes(cleanUnit);
  const isBestSeller = product.is_best_seller;

  const handleStep = (direction: "up" | "down") => {
    const current = parseFloat(draft.qty) || (isWeightUnit ? 1 : 1);
    let step = 1;
    if (draft.unit === "g") {
      step = 100;
    } else if (isWeightUnit) {
      step = 0.5;
    }

    const delta = direction === "up" ? step : -step;
    let nextVal = Math.round((current + delta) * 10) / 10;
    const minVal = draft.unit === "g" ? 100 : isWeightUnit ? 0.1 : 1;

    if (nextVal < minVal) {
      nextVal = minVal;
    }
    onDraftChange({ qty: String(nextVal) });
  };

  const displayUnit =
    cleanUnit.includes("pc") || cleanUnit === "piece"
      ? "pc"
      : cleanUnit === "bunch"
      ? "bunch"
      : cleanUnit === "packet" || cleanUnit === "pack"
      ? "pack"
      : product.unit || "kg";

  return (
    <article
      className="group flex flex-col justify-between bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      aria-labelledby={`product-title-${product.id}`}
    >
      {/* 1. FULL-WIDTH IMAGE STAGE (FLUSH TO EDGES, NO INNER PADDING, NO INNER BORDER) */}
      <div className="relative w-full aspect-square bg-[#F7F5F0] overflow-hidden">
        {/* Minimalist Dawn Pick Badge */}
        {product.is_best_seller && (
          <span className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md text-[#1E3324] text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#EAE6DF] shadow-xs">
            Dawn Pick
          </span>
        )}

        {/* In Basket Indicator */}
        {inCart && (
          <span className="absolute top-3 right-3 z-10 bg-[#1E3324] text-[#F8F6F0] text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            In Basket
          </span>
        )}

        {/* The Image Fills 100% of the Space */}
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image_url}
            alt={product.name}
            loading={isPriority ? "eager" : "lazy"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#1E3324]/30 bg-[#F7F5F0]">
            <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px] uppercase font-medium tracking-wider">Fresh Daily</span>
          </div>
        )}
      </div>

      {/* 2. CARD CONTENT & ACTIONS (PADDED INSIDE) */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        {/* Product Info */}
        <div>
          <span className="text-[#6B7D6F] text-[11px] font-semibold uppercase tracking-wider block">
            {product.category || "Vegetables"}
          </span>
          <h3
            id={`product-title-${product.id}`}
            className="text-[#1E3324] font-medium text-base tracking-tight mt-0.5 line-clamp-1"
          >
            {product.name}
          </h3>
        </div>

        {/* Stepper & Units Row */}
        <div className="flex items-center justify-between bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-2 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700 font-medium">
            <button
              type="button"
              onClick={() => handleStep("down")}
              aria-label={`Decrease quantity for ${product.name}`}
              className="hover:text-black px-1.5 py-0.5 text-sm font-bold cursor-pointer select-none active:scale-95"
            >
              -
            </button>
            <input
              id={`qty-${product.id}`}
              type="number"
              min={draft.unit === "g" ? "100" : isWeightUnit ? "0.1" : "1"}
              step={draft.unit === "g" ? "100" : isWeightUnit ? "0.1" : "1"}
              value={draft.qty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || parseFloat(val) >= 0) {
                  onDraftChange({ qty: val });
                }
              }}
              className="w-10 bg-transparent text-center font-bold text-xs text-[#1E3324] focus:outline-none no-spinner"
              aria-label={`Quantity for ${product.name}`}
            />
            <button
              type="button"
              onClick={() => handleStep("up")}
              aria-label={`Increase quantity for ${product.name}`}
              className="hover:text-black px-1.5 py-0.5 text-sm font-bold cursor-pointer select-none active:scale-95"
            >
              +
            </button>
          </div>

          {isWeightUnit ? (
            <div className="flex items-center gap-1 font-semibold text-[11px]">
              {(["Kg", "g"] as CartUnit[]).map((u) => {
                const isSelected = draft.unit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      if (draft.unit !== u) {
                        const currentQty = parseFloat(draft.qty) || 1;
                        let nextQty = draft.qty;
                        if (u === "g" && draft.unit === "Kg") {
                          nextQty = String(Math.round(currentQty * 1000));
                        } else if (u === "Kg" && draft.unit === "g") {
                          nextQty = String(
                            Math.round((currentQty / 1000) * 10) / 10 || 0.5
                          );
                        }
                        onDraftChange({ unit: u, qty: nextQty });
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1E3324] text-white shadow-2xs"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-[#5A6E5F] uppercase px-1.5">
              {product.unit || "pc"}
            </span>
          )}
        </div>

        {/* Price & Add to Basket Button */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[#1E3324] font-bold text-lg font-serif">
              ৳{product.price}
            </span>
            <span className="text-[#7A8C7E] text-xs"> / {displayUnit}</span>
          </div>

          <button
            type="button"
            id={`add-${product.id}`}
            onClick={() => onAddToCart(product)}
            className={`bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 ${
              isFeedbackActive
                ? "bg-[#142419] ring-2 ring-[#1E3324]/30 scale-[1.02]"
                : inCart
                ? "bg-[#1E3324]/90"
                : ""
            }`}
          >
            {isFeedbackActive ? (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Added</span>
              </>
            ) : inCart ? (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Update</span>
              </>
            ) : (
              <span>+ Add</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
