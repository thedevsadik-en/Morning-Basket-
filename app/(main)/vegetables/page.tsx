"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, CartUnit } from "@/lib/useCart";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  is_best_seller?: boolean;
};

const MINIMUM_ORDER_VALUE = 450;

const DISCRETE_UNITS = [
  "piece",
  "pc",
  "pcs",
  "bunch",
  "packet",
  "pack",
  "box",
  "jar",
  "bottle",
];

type CardInput = { qty: string; unit: CartUnit };

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
      <div className="w-full aspect-[4/3] bg-gray-100" />
      <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-3">
        <div className="flex justify-between gap-2">
          <div className="h-3.5 bg-gray-100 rounded w-2/3" />
          <div className="h-3.5 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-9 bg-gray-100 rounded-xl" />
        <div className="h-8 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function VegetablesPage() {
  const { cart, addOrUpdate, totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CardInput>>({});
  const [addedFeedbackId, setAddedFeedbackId] = useState<string | null>(null);

  const setDraft = (id: string, patch: Partial<CardInput>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { qty: "1", unit: "Kg" as CartUnit }),
        ...patch,
      },
    }));
  };

  useEffect(() => {
    async function fetchVegetables() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, unit, category, image_url, is_active, is_best_seller")
          .eq("category", "vegetables")
          .eq("is_active", true)
          .order("is_best_seller", { ascending: false })
          .order("name", { ascending: true });

        if (error) throw error;

        const productList = (data as Product[]) || [];
        setProducts(productList);

        // Pre-populate card draft states matching items currently in cart
        const initialDrafts: Record<string, CardInput> = {};
        productList.forEach((p) => {
          const inCartItem = cart[p.id];
          const cleanUnit = (p.unit || "").toLowerCase();
          const isWeight = !DISCRETE_UNITS.includes(cleanUnit);

          initialDrafts[p.id] = {
            qty: inCartItem ? String(inCartItem.qty) : "1",
            unit: inCartItem
              ? (inCartItem.unit as CartUnit)
              : isWeight
                ? ("Kg" as CartUnit)
                : ((p.unit || "piece") as CartUnit),
          };
        });

        setDrafts(initialDrafts);
      } catch (err: any) {
        console.error("Failed to fetch vegetables:", err);
        setFetchError("Could not load vegetable catalog. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchVegetables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => {
      const unit = (item.unit || "").toLowerCase();
      const normalizedQty =
        unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
          ? item.qty / 1000
          : item.qty;
      return sum + normalizedQty * item.price;
    }, 0);
  }, [cart]);

  const neededForMOV = Math.max(0, MINIMUM_ORDER_VALUE - cartTotal);
  const isMovReached = cartTotal >= MINIMUM_ORDER_VALUE;

  const handleAddToCart = (product: Product) => {
    const draft = drafts[product.id] ?? { qty: "1", unit: "Kg" as CartUnit };
    const parsedQty = parseFloat(draft.qty);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setDraft(product.id, { qty: "1" });
      return;
    }

    addOrUpdate(product.id, parsedQty, draft.unit, product.price);

    setAddedFeedbackId(product.id);
    setTimeout(() => {
      setAddedFeedbackId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="w-full pt-12 pb-8 px-6 flex flex-col items-center text-center">
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-text leading-tight mb-2">
          Fresh Vegetables
        </h1>
        <p className="text-text/60 max-w-lg leading-relaxed text-sm md:text-base">
          Hand-picked at 5 AM, triple-washed, and delivered to your doorstep in Dhanmondi.
        </p>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pb-36 md:pb-12 flex flex-col md:flex-row md:items-start gap-8">
        <section className="flex-1 min-w-0">
          {fetchError && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-sm font-semibold text-text/50">{fetchError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs font-bold text-accent-green underline underline-offset-2 hover:opacity-70 transition-opacity cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && !fetchError && (
              <>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </>
            )}

            {!isLoading &&
              !fetchError &&
              products.map((product) => {
                const inCart = !!cart[product.id];
                const cleanUnit = (product.unit || "").toLowerCase();
                const isWeightUnit = !DISCRETE_UNITS.includes(cleanUnit);

                const draft = drafts[product.id] ?? {
                  qty: "1",
                  unit: isWeightUnit ? ("Kg" as CartUnit) : ((product.unit || "piece") as CartUnit),
                };

                const isFeedbackActive = addedFeedbackId === product.id;

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F0EDE6]">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-10 h-10 text-text/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {inCart && (
                        <span className="absolute top-2 right-2 bg-accent-green text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-xs">
                          In Basket
                        </span>
                      )}
                      {product.is_best_seller && (
                        <span className="absolute top-2 left-2 bg-[#23301B]/85 backdrop-blur-xs text-[#F6F1E4] text-[9.5px] font-bold tracking-wide rounded-md px-2 py-0.5 shadow-xs">
                          ★ Best Seller
                        </span>
                      )}
                    </div>

                    <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-[13.5px] text-text leading-snug">{product.name}</h3>
                          <span className="font-bold text-accent-green text-[13.5px] shrink-0">
                            ৳{product.price}/{product.unit ?? "kg"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 rounded-xl bg-[#F0EDE6] p-1 border border-black/5">
                          <input
                            id={`qty-${product.id}`}
                            type="number"
                            min={isWeightUnit ? "0.1" : "1"}
                            step={isWeightUnit ? "0.1" : "1"}
                            value={draft.qty}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || parseFloat(val) >= 0) {
                                setDraft(product.id, { qty: val });
                              }
                            }}
                            className="flex-1 min-w-0 bg-transparent text-center text-sm font-bold text-text py-1 focus:outline-none"
                            aria-label={`Quantity for ${product.name}`}
                          />

                          {isWeightUnit ? (
                            <div className="flex shrink-0 gap-0.5">
                              {(["Kg", "g"] as CartUnit[]).map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setDraft(product.id, { unit: u })}
                                  className={`px-2.5 py-1 text-[11px] font-bold transition-all duration-150 rounded-lg cursor-pointer ${draft.unit === u
                                      ? "bg-accent-green text-white shadow-xs"
                                      : "bg-transparent text-text/50 hover:text-accent-green"
                                    }`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold px-3 text-text/60 uppercase">
                              {product.unit || "Unit"}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          id={`add-${product.id}`}
                          onClick={() => handleAddToCart(product)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-[0.98] cursor-pointer ${isFeedbackActive
                              ? "bg-emerald-700 text-white shadow-xs"
                              : inCart
                                ? "bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green hover:text-white"
                                : "bg-accent-green text-white hover:bg-accent-green/90 shadow-xs"
                            }`}
                        >
                          {isFeedbackActive ? "✓ Added" : inCart ? "Update Basket" : "Add to Basket"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!isLoading && !fetchError && products.length === 0 && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-[#F0EDE6] rounded-2xl border border-[#E3DFD5]">
                <div className="w-16 h-16 bg-[#2C5F2D]/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#2C5F2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">0 vegetables available</h3>
                <p className="text-gray-600 font-medium">Fresh harvest arriving tomorrow at 5 AM!</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Sticky Cart Sidebar (md:top-24 fixes navbar collision) ───────────────── */}
        <aside
          className={`
            fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-6px_20px_-4px_rgba(0,0,0,0.07)] p-4 pb-6 rounded-t-2xl
            md:static md:w-[285px] lg:w-[320px] md:h-fit md:rounded-2xl md:border md:border-gray-100 md:shadow-lg md:p-5 md:sticky md:top-24 shrink-0
          `}
        >
          <div className="hidden md:flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <h2 className="font-serif font-bold text-[17px] text-text">Your Basket</h2>
            {totalItems > 0 && (
              <span className="text-[11px] font-bold text-accent-green bg-accent-green/10 px-2.5 py-1 rounded-full">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text/55 font-medium">Subtotal</span>
              <span className="font-extrabold text-xl text-text">৳{cartTotal.toFixed(0)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-accent-green"
                  style={{
                    width: `${Math.min((cartTotal / MINIMUM_ORDER_VALUE) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className={`text-[11px] font-semibold text-center ${isMovReached ? "text-accent-green" : "text-text/40"}`}>
                {isMovReached ? "✓ Minimum order reached!" : `Add ৳${neededForMOV.toFixed(0)} more to reach delivery minimum`}
              </p>
            </div>

            <Link
              href="/basket"
              id="review-basket-btn"
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-center transition-all duration-300 block ${isMovReached
                  ? "bg-accent-green text-white hover:bg-accent-green/90 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 pointer-events-none"
                }`}
              aria-disabled={!isMovReached}
              tabIndex={isMovReached ? 0 : -1}
            >
              Review Basket →
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-text/40 font-medium">
              <svg className="w-3 h-3 text-accent-green/60" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                  clipRule="evenodd"
                />
              </svg>
              100% Cash on Delivery · Inspect at doorstep
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}