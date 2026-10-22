"use client";

import Image from "next/image";

export default function StorefrontHero() {
  const scrollToCatalog = () => {
    const catalogSection = document.getElementById("product-catalog");
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-[#1B3823] to-[#254A32] min-h-[290px] sm:min-h-[350px] md:min-h-[390px] shadow-sm border border-[#EAE6DF]/60">
        {/* Background Produce Image with Vibrant Natural Food Colors */}
        <div className="absolute inset-0">
          <Image
            src="/hero-produce.jpg"
            alt="Fresh farm produce — red tomatoes, yellow lemons, herbs, and greens"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover object-right sm:object-center"
          />
          {/* Softened Botanical Forest Gradient: solid on left for text legibility, fading smoothly to transparent on right */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#1B3823] via-[#1B3823]/80 md:via-[#1B3823]/30 to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex items-center h-full min-h-[290px] sm:min-h-[350px] md:min-h-[390px] px-8 sm:px-12 md:px-16 py-10 md:py-14">
          <div className="max-w-md">
            {/* Headline */}
            <h1 className="font-serif font-bold text-[#FDFBF7] text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-3 drop-shadow-xs">
              Stay home &amp; get your daily fresh need&apos;s
            </h1>

            {/* Subtitle */}
            <p className="text-[#FDFBF7]/90 text-sm sm:text-base leading-relaxed mb-6 max-w-sm drop-shadow-xs">
              Start Your Daily Shopping with Morning Basket
            </p>

            {/* CTA Button */}
            <button
              type="button"
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2 bg-[#F8F6F0] text-[#1B3823] font-semibold text-sm px-7 py-3.5 rounded-xl shadow-sm hover:bg-white hover:text-[#142419] active:scale-[0.98] transition-all cursor-pointer"
            >
              Order Now
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
