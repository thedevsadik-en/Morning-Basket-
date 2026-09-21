"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useTransition, Suspense } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart, CartUnit } from "@/lib/useCart";
import { supabase } from "@/lib/supabaseClient";
import ReviewCarousel from "./components/ReviewCarousel";


type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  is_best_seller: boolean;
};


// Discrete units that should not have fractional steps or Kg/g toggles
const DISCRETE_UNITS = [
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

function HomeContent() {
  const { cart, addOrUpdate, totalItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [minimumOrderValue, setMinimumOrderValue] = useState(450); // Default fallback
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDefaultLoad, setIsDefaultLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFeedbackId, setAddedFeedbackId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [drafts, setDrafts] = useState<Record<string, CardInput>>({});

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
    if (urlCategory) {
      setSelectedCategory(urlCategory.toLowerCase());
      setIsDefaultLoad(false);
    }
  }, [urlCategory]);

  useEffect(() => {
    if (searchQuery) setIsDefaultLoad(false);
  }, [searchQuery]);

  const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([{ label: "All Items", value: "all" }]);

  // Run catalog fetch ONCE on mount so adding items never flashes skeletons
  useEffect(() => {
    async function fetchStorefrontProducts() {
      setIsLoading(true);
      setFetchError(null);

      try {
        // Fetch store settings
        const { data: settingsData } = await supabase.from('store_settings').select('minimum_order_value').single();
        if (settingsData) {
          setMinimumOrderValue(settingsData.minimum_order_value);
        }

        const { data: catData } = await supabase.from('categories').select('*').order('name');
        if (catData) {
          const opts = catData.map(c => ({ label: c.name, value: c.name.toLowerCase() }));
          setCategoryOptions([{ label: "All Items", value: "all" }, ...opts]);
        }

        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, unit, category, image_url, is_active, is_best_seller")
          .eq("is_active", true)
          .order("is_best_seller", { ascending: false })
          .order("name", { ascending: true })
          .limit(60);

        if (error) throw error;

        const productList = (data as Product[]) || [];
        setProducts(productList);

        // Seed initial local drafts based on cart contents or defaults
        setDrafts((prevDrafts) => {
          const initialDrafts: Record<string, CardInput> = { ...prevDrafts };
          productList.forEach((p) => {
            if (!initialDrafts[p.id]) {
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
            }
          });
          return initialDrafts;
        });
      } catch (err: any) {
        console.error("Failed to fetch products:", err);
        setFetchError("Could not load fresh inventory. Please tap below to retry.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStorefrontProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let result = products;

    if (isDefaultLoad && selectedCategory === "all" && !searchQuery) {
      result = products.filter(p => p.is_best_seller).slice(0, 12);
    } else {
      result = products.filter((product) => {
        const matchesCategory =
          selectedCategory === "all" ||
          product.category?.toLowerCase() === selectedCategory.toLowerCase();

        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || product.name.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      });
    }
    return result;
  }, [products, selectedCategory, searchQuery, isDefaultLoad]);

  // Cart total computation supporting weight (Kg/g) and discrete count units
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

  const neededForMOV = Math.max(0, minimumOrderValue - cartTotal);
  const isMovReached = cartTotal >= minimumOrderValue;

  const handleAddToCart = (product: Product) => {
    const draft = drafts[product.id] ?? { qty: "1", unit: "Kg" as CartUnit };
    const parsedQty = parseFloat(draft.qty);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setDraft(product.id, { qty: "1" });
      return;
    }

    addOrUpdate(product.id, parsedQty, draft.unit, product.price);

    // Micro-interaction button feedback
    setAddedFeedbackId(product.id);
    setTimeout(() => {
      setAddedFeedbackId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="w-full pt-12 pb-6 px-6 flex flex-col items-center text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-green/80 mb-3">
          Dhanmondi&apos;s Freshest Delivery
        </p>
        <h1 className="font-serif font-bold text-[2.4rem] md:text-5xl lg:text-[3.8rem] text-text leading-[1.1] tracking-tight max-w-3xl mb-4">
          Sourced at 5 AM.{" "}
          <span className="text-accent-green">Cleaned at 6 AM.</span>
        </h1>
        <p className="text-sm md:text-base text-text/55 font-sans max-w-lg leading-relaxed mb-6">
          Hand-selected, pesticide-washed vegetables at your door by 9 AM.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: "M5 13l4 4L19 7", label: "100% Cash on Delivery" },
            {
              icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
              label: "Inspect Before Paying",
            },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 border border-text/10 rounded-full px-4 py-1.5 text-xs font-semibold text-text/70 bg-white/70 shadow-xs"
            >
              <svg className="w-3.5 h-3.5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
              </svg>
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* ── Trust Strip ──────────────────────────────────────── */}
      <div className="w-full border-y border-gray-200/60 bg-white/40 py-2.5 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
          {[
            { d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Farm to Door in 4 Hours" },
            { d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Triple-Washed for Safety" },
            { d: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6", label: "Zero-Questions Doorstep Return" },
          ].map(({ d, label }, i, arr) => (
            <div key={label} className="contents">
              <div className="flex items-center gap-2 text-accent-green text-[12px] font-semibold tracking-wide">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                </svg>
                {label}
              </div>
              {i < arr.length - 1 && <div className="hidden sm:block w-px h-3.5 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Catalog & Cart ──────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pt-8 pb-36 md:pb-12 flex flex-col md:flex-row md:items-start gap-8">
        <section className="flex-1 min-w-0">
          {/* Controls Bar: Category Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 whitespace-nowrap scrollbar-hide">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => startTransition(() => {
                    setSelectedCategory(cat.value);
                    setIsDefaultLoad(false);
                  })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide capitalize whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat.value
                    ? "bg-accent-green text-white shadow-xs"
                    : "bg-white/70 text-text/60 border border-text/10 hover:text-accent-green"
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-56 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh produce..."
                className="w-full bg-white px-3.5 py-1.5 rounded-xl border border-text/10 text-xs text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-accent-green/30"
              />
            </div>
          </div>

          {/* ── Error state ─────────────────────────────────── */}
          {fetchError && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-3">
              <svg className="w-10 h-10 text-text/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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

          {/* ── Product Cards Grid ──────────────────────────── */}
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
              filteredProducts.map((product, idx) => {
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
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                  >
                    {/* Image Area */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F0EDE6]">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          priority={idx < 3}
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

                    {/* Information Area */}
                    <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-[13.5px] text-text leading-snug">
                            {product.name}
                          </h3>
                          <span className="font-bold text-accent-green text-[13.5px] shrink-0">
                            ৳{product.price}/{product.unit ?? "kg"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {/* Quantity and Unit Controls */}
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

                          {/* Dynamic unit pill */}
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

                        {/* Add / Update CTA Button */}
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
                          {isFeedbackActive
                            ? "✓ Added"
                            : inCart
                              ? "Update Basket"
                              : "Add to Basket"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!isLoading && !fetchError && filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <p className="text-sm font-semibold text-text/40">
                  No matching produce found in this section.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Cart Sidebar ──────────────────────────────────── */}
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
                    width: `${Math.min((cartTotal / minimumOrderValue) * 100, 100)}%`,
                  }}
                />
              </div>
              <p
                className={`text-[11px] font-semibold text-center ${isMovReached ? "text-accent-green" : "text-text/40"
                  }`}
              >
                {isMovReached
                  ? "✓ Minimum order reached!"
                  : `Add ৳${neededForMOV.toFixed(0)} more to reach delivery minimum`}
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

      <ReviewCarousel />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}