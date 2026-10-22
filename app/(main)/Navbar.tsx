"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { supabase } from "@/lib/supabaseClient";

interface Category {
  id: string;
  name: string;
}

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { totalItems } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navRef = useRef<HTMLElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch dynamic categories
  useEffect(() => {
    async function fetchCats() {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (!error && data && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback default luxury categories
        setCategories([
          { id: "1", name: "Fish & Meat" },
          { id: "2", name: "Fruits" },
          { id: "3", name: "Spices & Dry" },
          { id: "4", name: "Vegetables" },
        ]);
      }
    }
    fetchCats();
  }, []);

  // Sync search input if on search page, otherwise clear it to prevent test text lingering
  useEffect(() => {
    if (pathname === "/search") {
      setSearchTerm(searchParams.get("q") || "");
    } else {
      setSearchTerm("");
    }
  }, [pathname, searchParams]);

  // Handle click outside and escape key to dismiss menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setMobileMenuOpen(false);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    // 1. Update your category state or navigate:
    router.push(`/?category=${encodeURIComponent(categoryName)}#catalog`, { scroll: false });

    // 2. Smoothly scroll down to the product catalog:
    const catalogElement = document.getElementById("catalog");
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeCategoryParam = (searchParams.get("category") || "").toLowerCase();

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 w-full bg-[#F8F6F0]/95 backdrop-blur-md"
    >
      {/* ── Top Row: Logo · Search · Cart ────────────────────────────── */}
      <div className="border-b border-[#EAE6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link
            href="/"
            className="font-serif font-extrabold text-[#1E3324] text-xl sm:text-2xl tracking-tight shrink-0"
          >
            Morning Basket<span className="text-[#2D4A35]">.</span>
          </Link>

          {/* Centered Search Bar — Desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center relative flex-1 max-w-xl mx-auto"
          >
            <svg
              className="w-4 h-4 text-[#5A6E5F] absolute left-4 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fresh vegetables, fruits, herbs..."
              className="w-full bg-white pl-11 pr-4 py-2.5 rounded-full text-sm text-[#2C332D] placeholder:text-[#5A6E5F]/70 border border-[#E8E4DC] focus:outline-none focus:border-[#1E3324] focus:ring-1 focus:ring-[#1E3324]/20 transition-all shadow-xs"
            />
          </form>

          {/* Right: Cart + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Basket Link */}
            <Link
              href="/basket"
              id="nav-basket-link"
              className="relative flex items-center justify-center w-10 h-10 rounded-xl text-[#2C332D] hover:text-[#1E3324] hover:bg-white/80 border border-transparent hover:border-[#EAE6DF] transition-all shrink-0"
              aria-label="View basket"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#1E3324] text-[#F8F6F0] text-[10px] font-bold rounded-full w-5 h-5 min-w-[20px] min-h-[20px] flex items-center justify-center leading-none shadow-xs">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-xl text-[#2C332D] hover:text-[#1E3324] hover:bg-white/80 transition-colors cursor-pointer border border-[#EAE6DF]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Category Navigation (Split Layout) ───────────── */}
      <div className="border-b border-[#EAE6DF]/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5">
            {/* Left Side: Clean Category Links with Dropdown Chevrons */}
            <div className="flex items-center gap-7 lg:gap-8">
              {categories.map((c) => {
                const isActive = Boolean(
                  activeCategoryParam &&
                    (activeCategoryParam === c.name.toLowerCase() ||
                      activeCategoryParam.replace(/[^a-z0-9]/g, "") ===
                        c.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
                );

                return (
                  <Link
                    key={c.id || c.name}
                    href={`/?category=${encodeURIComponent(c.name.toLowerCase())}#catalog`}
                    onClick={(e) => {
                      if (pathname === "/") {
                        e.preventDefault();
                      }
                      handleCategoryClick(c.name.toLowerCase());
                    }}
                    className={`text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "text-[#1E3324] font-semibold"
                        : "text-[#2C332D]/80 hover:text-[#1E3324] font-medium"
                    }`}
                  >
                    <span>{c.name}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isActive
                          ? "text-[#1E3324] rotate-180"
                          : "text-[#5A6E5F]"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Link>
                );
              })}
            </div>

            {/* Right Side: Feedback Link (Pinned directly under basket icon) */}
            <Link
              href="/feedback"
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === "/feedback"
                  ? "text-[#1E3324] font-semibold"
                  : "text-[#2C332D]/70 hover:text-[#1E3324]"
              }`}
            >
              Feedback
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EAE6DF] bg-[#F8F6F0] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <svg
              className="w-4 h-4 text-[#5A6E5F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fresh vegetables, fruits, herbs..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E4DC] rounded-full text-sm text-[#2C332D] placeholder:text-[#5A6E5F]/70 focus:outline-none focus:border-[#1E3324]"
            />
          </form>

          {/* Mobile Navigation Links */}
          <div className="flex flex-col space-y-1 pt-1">
            {categories.map((c) => {
              const isActive = Boolean(
                activeCategoryParam &&
                  (activeCategoryParam === c.name.toLowerCase() ||
                    activeCategoryParam.replace(/[^a-z0-9]/g, "") ===
                      c.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
              );

              return (
                <Link
                  key={c.id || c.name}
                  href={`/?category=${encodeURIComponent(c.name.toLowerCase())}#catalog`}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (pathname === "/") {
                      e.preventDefault();
                    }
                    handleCategoryClick(c.name.toLowerCase());
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-[#1E3324] text-[#F8F6F0] font-semibold"
                      : "text-[#2C332D]/80 hover:bg-black/5 hover:text-[#1E3324] font-medium"
                  }`}
                >
                  <span>{c.name}</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive ? "text-[#F8F6F0]" : "text-[#5A6E5F]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-[#EAE6DF]/60">
              <Link
                href="/feedback"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                  pathname === "/feedback"
                    ? "bg-[#1E3324] text-[#F8F6F0] font-semibold"
                    : "text-[#2C332D]/70 hover:bg-black/5 hover:text-[#1E3324] font-medium"
                }`}
              >
                Feedback
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={
        <div className="h-16 sm:h-20 w-full bg-[#F8F6F0] sticky top-0 z-50 border-b border-[#EAE6DF]" />
      }
    >
      <NavbarContent />
    </Suspense>
  );
}