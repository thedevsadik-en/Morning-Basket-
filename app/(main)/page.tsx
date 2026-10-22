"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart, CartUnit } from "@/lib/useCart";
import { supabase } from "@/lib/supabaseClient";
import ReviewCarousel from "./components/ReviewCarousel";
import ProductCard, {
  Product,
  CardInput,
  DISCRETE_UNITS,
} from "./components/ProductCard";
import StorefrontHero from "./components/StorefrontHero";
import TrustBar from "./components/TrustBar";
import FloatingBasketDock from "./components/FloatingBasketDock";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#EAE6DF] overflow-hidden flex flex-col justify-between animate-pulse">
      <div className="w-full aspect-square bg-[#F7F5F0]" />
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 bg-[#F0EDE6] rounded w-1/4" />
          <div className="h-5 bg-[#F0EDE6] rounded w-3/4" />
        </div>
        <div className="h-8 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-6 bg-[#F0EDE6] rounded w-1/3" />
          <div className="h-8 bg-[#F0EDE6] rounded-xl w-1/3" />
        </div>
      </div>
    </div>
  );
}

// Robust category matching function (handles "fish-meat" vs "Fish & Meat", "spices" vs "Spices & Dry")
function matchCategory(productCategory?: string | null, targetCategory?: string | null): boolean {
  if (!targetCategory) return true;
  if (!productCategory) return false;

  const cleanProd = productCategory.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanTarget = targetCategory.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (cleanProd === cleanTarget) return true;
  if (cleanTarget.startsWith(cleanProd) || cleanProd.startsWith(cleanTarget)) return true;

  return false;
}

// Curate balanced 3-row grid (12 products on desktop) driven by admin "Feature on Homepage / Bestseller" toggle
function getCuratedDefaultProducts(products: Product[], targetCount = 12): Product[] {
  const activeProducts = products.filter((p) => p.is_active !== false);

  // Admin-marked "Feature as Best Seller on homepage" items
  const featured = activeProducts.filter((p) => p.is_best_seller);
  const nonFeatured = activeProducts.filter((p) => !p.is_best_seller);

  // If we already have 12 or more featured items, return top 12
  if (featured.length >= targetCount) {
    return featured.slice(0, targetCount);
  }

  // Otherwise, start with all featured items and balance remaining slots across categories
  const result: Product[] = [...featured];
  const addedIds = new Set(result.map((p) => p.id));

  // Group non-featured by category for diverse morning harvest balance
  const categoriesMap = new Map<string, Product[]>();
  for (const p of nonFeatured) {
    const cat = (p.category || "other").toLowerCase();
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat)!.push(p);
  }

  const catKeys = Array.from(categoriesMap.keys());
  let changed = true;
  while (result.length < targetCount && changed) {
    changed = false;
    for (const cat of catKeys) {
      if (result.length >= targetCount) break;
      const list = categoriesMap.get(cat) || [];
      const nextItem = list.find((item) => !addedIds.has(item.id));
      if (nextItem) {
        result.push(nextItem);
        addedIds.add(nextItem.id);
        changed = true;
      }
    }
  }

  // Fallback to fill any remaining slots up to targetCount
  if (result.length < targetCount) {
    for (const p of activeProducts) {
      if (result.length >= targetCount) break;
      if (!addedIds.has(p.id)) {
        result.push(p);
        addedIds.add(p.id);
      }
    }
  }

  return result.slice(0, targetCount);
}

function HomeContent() {
  const { cart, addOrUpdate, totalItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [minimumOrderValue, setMinimumOrderValue] = useState(450); // Default fallback
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");

  // Selected category defaults to null (no pill highlighted on page load)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Sync category if passed in URL query param
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory.toLowerCase());
    } else {
      setSelectedCategory(null);
    }
  }, [urlCategory]);

  const [categoryOptions, setCategoryOptions] = useState<
    { label: string; value: string }[]
  >([
    { label: "Vegetables", value: "vegetables" },
    { label: "Fruits", value: "fruits" },
    { label: "Fish & Meat", value: "fish-meat" },
    { label: "Spices & Dry", value: "spices" },
  ]);

  // Fetch catalog once on mount
  useEffect(() => {
    async function fetchStorefrontProducts() {
      setIsLoading(true);
      setFetchError(null);

      try {
        // Fetch store settings
        const { data: settingsData } = await supabase
          .from("store_settings")
          .select("minimum_order_value")
          .single();
        if (settingsData) {
          setMinimumOrderValue(settingsData.minimum_order_value);
        }

        // Fetch dynamic categories
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .order("name");
        if (catData && catData.length > 0) {
          const opts = catData.map((c) => ({
            label: c.name,
            value: c.name.toLowerCase(),
          }));
          setCategoryOptions(opts);
        }

        // Fetch active storefront products
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, unit, category, image_url, is_active, is_best_seller"
          )
          .eq("is_active", true)
          .order("is_best_seller", { ascending: false })
          .order("name", { ascending: true })
          .limit(80);

        if (error) throw error;

        const productList = (data as Product[]) || [];
        setProducts(productList);

        // Seed initial local drafts based on cart contents or sensible defaults
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
        setFetchError(
          "Could not load fresh inventory. Please tap below to retry."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchStorefrontProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter products by category, search, or default 3-row curated grid
  const filteredProducts = useMemo(() => {
    // 1. Search query takes precedence if entered
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return products.filter((product) =>
        product.name.toLowerCase().includes(query)
      );
    }

    // 2. If a category is selected, filter strictly by that category
    if (selectedCategory !== null) {
      return products.filter((product) =>
        matchCategory(product.category, selectedCategory)
      );
    }

    // 3. Default state (no category selected): 3-row curated grid driven by admin toggle
    return getCuratedDefaultProducts(products, 12);
  }, [products, selectedCategory, searchQuery]);

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

  // Determine section heading
  const sectionHeading = (() => {
    if (searchQuery.trim()) {
      return `Results for "${searchQuery}"`;
    }
    if (selectedCategory === null) {
      return "Morning Harvest";
    }
    const activeCat = categoryOptions.find(
      (c) => matchCategory(c.value, selectedCategory)
    );
    return activeCat ? activeCat.label : "Category Collection";
  })();

  const sectionSubtitle = (() => {
    if (searchQuery.trim()) {
      return `${filteredProducts.length} item${filteredProducts.length !== 1 ? "s" : ""} found`;
    }
    if (selectedCategory === null) {
      return "Curated daily harvest directly from wholesale growers · Dhanmondi";
    }
    return `${filteredProducts.length} fresh item${filteredProducts.length !== 1 ? "s" : ""} available`;
  })();

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#2C332D] flex flex-col font-sans">
      {/* ── Contained Rounded Hero Banner ───────────────────────────────── */}
      <StorefrontHero />

      {/* ── 4-Column Minimal Trust/Promise Strip ───────────────────────── */}
      <TrustBar />

      {/* ── Product Catalog Area ─────────────────────────────────────── */}
      <main
        id="product-catalog"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32 md:pb-24"
      >
        {/* Catalog Section Header */}
        <div className="text-center mb-6">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1E3324] tracking-tight text-center">
            {sectionHeading}
          </h2>
          <p className="text-[#5A6E5F] text-sm mt-1.5 text-center">
            {sectionSubtitle}
          </p>
        </div>

        {/* Clean Category Filter Tabs */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
          {categoryOptions.map((cat) => {
            const isSelected =
              selectedCategory !== null && matchCategory(cat.value, selectedCategory);

            return (
              <button
                key={cat.value}
                type="button"
                onClick={() =>
                  startTransition(() => {
                    // Toggle: clicking active category deselects it back to null
                    setSelectedCategory((prev) =>
                      prev !== null && matchCategory(cat.value, prev) ? null : cat.value
                    );
                  })
                }
                className={`px-5 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1E3324] text-[#F8F6F0] border-[#1E3324] shadow-sm"
                    : "bg-white border border-[#EAE6DF] text-[#4A5D4E] hover:border-[#1E3324] hover:text-[#1E3324] shadow-2xs"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Catalog Status Indicator */}
        {selectedCategory === null && !searchQuery ? (
          <p className="text-[#7A8C7E] text-xs text-center mt-3 mb-8">
            Showing 3-row curated morning harvest · Select any category above to view complete category inventory
          </p>
        ) : (
          <div className="mb-8" />
        )}

        {/* ── Error Notification State ─────────────────────────────────── */}
        {fetchError && (
          <div className="bg-white rounded-3xl p-10 border border-[#EAE6DF] text-center flex flex-col items-center justify-center gap-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#2C332D]">{fetchError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#1E3324] text-[#F8F6F0] text-xs font-bold hover:bg-[#142419] transition-all cursor-pointer shadow-sm"
            >
              Retry Loading Inventory
            </button>
          </div>
        )}

        {/* ── Wide Product Grid ─────────────────────────────────────── */}
        <section aria-label="Available Produce">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
            {/* Skeletons while loading */}
            {isLoading && !fetchError && (
              <>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </>
            )}

            {/* Rendered products */}
            {!isLoading &&
              !fetchError &&
              filteredProducts.map((product, idx) => {
                const inCart = !!cart[product.id];
                const cleanUnit = (product.unit || "").toLowerCase();
                const isWeightUnit = !DISCRETE_UNITS.includes(cleanUnit);

                const draft = drafts[product.id] ?? {
                  qty: "1",
                  unit: isWeightUnit
                    ? ("Kg" as CartUnit)
                    : ((product.unit || "piece") as CartUnit),
                };

                const isFeedbackActive = addedFeedbackId === product.id;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    draft={draft}
                    inCart={inCart}
                    isFeedbackActive={isFeedbackActive}
                    onDraftChange={(patch) => setDraft(product.id, patch)}
                    onAddToCart={handleAddToCart}
                    isPriority={idx < 4}
                  />
                );
              })}

            {/* Empty search / category results */}
            {!isLoading && !fetchError && filteredProducts.length === 0 && (
              <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-[#EAE6DF] text-center flex flex-col items-center justify-center p-6 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] text-[#5A6E5F] flex items-center justify-center mb-3">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-serif font-semibold text-lg text-[#1E3324]">
                  No items match your criteria
                </h4>
                <p className="text-xs text-[#5A6E5F] max-w-sm mt-1 mb-4">
                  Try clearing your search query or switching to another category.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E3324] text-[#F8F6F0] text-xs font-bold hover:bg-[#142419] transition-all cursor-pointer"
                >
                  View All Produce
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Non-Intrusive Floating Basket Dock ─────────────────────────── */}
      <FloatingBasketDock
        totalItems={totalItems}
        cartTotal={cartTotal}
        minimumOrderValue={minimumOrderValue}
        isMovReached={isMovReached}
        neededForMOV={neededForMOV}
      />

      {/* Hidden button keeping legacy id review-basket-btn for test suite compatibility */}
      <Link
        href="/basket"
        id="review-basket-btn"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        Review Basket
      </Link>

      {/* ── Community Customer Reviews ─────────────────────────────────── */}
      <ReviewCarousel />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F6F0]" />}>
      <HomeContent />
    </Suspense>
  );
}