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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch dynamic categories
  useEffect(() => {
    async function fetchCats() {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (!error && data) setCategories(data);
    }
    fetchCats();
  }, []);

  const pinnedNames = ["Vegetables", "Fish & Meat"];
  const pinnedCats = categories.filter(c => pinnedNames.some(p => p.toLowerCase() === c.name.toLowerCase()));
  const otherCats = categories.filter(c => !pinnedNames.some(p => p.toLowerCase() === c.name.toLowerCase()));

  // Fallback if not yet loaded
  const displayPinned = pinnedCats.length > 0
    ? pinnedCats.map(c => ({ label: c.name, href: `/?category=${encodeURIComponent(c.name.toLowerCase())}` }))
    : pinnedNames.map(name => ({ label: name, href: `/?category=${encodeURIComponent(name.toLowerCase())}` }));

  // Add standard feedback link
  const NAV_LINKS = [...displayPinned, { label: "Feedback", href: "/feedback" }];

  // Sync search input if already on search page
  useEffect(() => {
    if (pathname === "/search") {
      setSearchTerm(searchParams.get("q") || "");
    }
  }, [pathname, searchParams]);

  // Handle click outside and escape key to dismiss menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setDropdownOpen(false);
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

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 w-full bg-[#F0EDE6]/90 backdrop-blur-md border-b border-[#2C5F2D]/10"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="font-serif font-bold text-accent-green text-xl tracking-tight shrink-0"
        >
          Morning Basket
        </Link>

        {/* Center Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {displayPinned.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-[13px] font-medium transition-colors duration-200 text-text/60 hover:text-accent-green"
            >
              {label}
            </Link>
          ))}

          {/* Other Dropdown */}
          {otherCats.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 text-[13px] font-medium text-text/60 hover:text-accent-green transition-colors duration-200 cursor-pointer"
              >
                Other
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                className={`absolute top-full left-0 mt-3 w-48 bg-[#F0EDE6] border border-green-900/10 rounded-xl shadow-lg py-2 origin-top transition-all duration-200 ease-out ${
                  dropdownOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                }`}
              >
                {otherCats.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                    onClick={() => setDropdownOpen(false)}
                    className="block w-full text-left px-4 py-2.5 text-sm text-text/70 hover:bg-green-900/5 hover:text-green-900 transition-colors duration-200"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/feedback"
            className="text-[13px] font-medium transition-colors duration-200 text-text/60 hover:text-accent-green"
          >
            Feedback
          </Link>
        </div>

        {/* Right Section: Search, Basket, Mobile Toggle */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center relative"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-44 lg:w-60 px-4 py-1.5 bg-[#E8E4D9]/60 border border-transparent rounded-full text-[13px] text-text placeholder-text/50 focus:bg-white focus:border-accent-green/30 focus:ring-2 focus:ring-accent-green/20 outline-none transition-all duration-300"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-3 text-text/40 hover:text-accent-green transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Basket Link */}
          <Link
            href="/basket"
            id="nav-basket-link"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-text/70 hover:text-accent-green transition-colors duration-200 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden sm:inline">Basket</span>
            {totalItems > 0 && (
              <span className="bg-accent-green text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-1.5 rounded-lg text-text/70 hover:text-accent-green hover:bg-black/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2C5F2D]/10 bg-[#F0EDE6] px-4 pt-3 pb-4 space-y-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-accent-green"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Mobile Navigation Links */}
          <div className="flex flex-col space-y-1 pt-1">
            {NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent-green/10 text-accent-green"
                      : "text-text/70 hover:bg-black/5 hover:text-accent-green"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            
            {/* Mobile Other Categories */}
            {otherCats.length > 0 && (
              <div className="px-3 py-2 text-xs font-semibold text-text/40 uppercase tracking-widest mt-2">
                Other Categories
              </div>
            )}
            {otherCats.map(cat => (
              <Link
                key={cat.id}
                href={`/?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-text/70 hover:bg-black/5 hover:text-accent-green pl-6"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<div className="h-14 w-full bg-[#F0EDE6]/90 sticky top-0 z-50 border-b border-[#2C5F2D]/10" />}>
      <NavbarContent />
    </Suspense>
  );
}