"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/useCart";

const NAV_LINKS = [
  { label: "Vegetables", href: "/vegetables" },
  { label: "Fish & Meat", href: "/fish-meat" },
  { label: "Other", href: "/other" },
  { label: "Feedback", href: "/feedback" },
];

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { totalItems } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navRef = useRef<HTMLElement>(null);

  // Sync search input if already on search page
  useEffect(() => {
    if (pathname === "/search") {
      setSearchTerm(searchParams.get("q") || "");
    }
  }, [pathname, searchParams]);

  // Handle click outside and escape key to dismiss mobile drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

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
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`text-[13px] font-medium transition-colors duration-200 ${
                  active
                    ? "text-accent-green font-semibold"
                    : "text-text/60 hover:text-accent-green"
                }`}
              >
                {label}
              </Link>
            );
          })}
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