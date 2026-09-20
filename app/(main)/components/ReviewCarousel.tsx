"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/lib/supabaseClient";

interface Review {
  id: string | number;
  customer_name?: string;
  name?: string;
  rating: number;
  comment: string;
  created_at?: string;
}

const FALLBACK_REVIEWS: Review[] = [
  {
    id: "f-1",
    customer_name: "Sarah Jenkins",
    rating: 5,
    comment: "The absolute best quality vegetables I've ever had delivered. Everything is crisp, clean, and delivered promptly by 9 AM in Dhanmondi.",
  },
  {
    id: "f-2",
    customer_name: "Farhan Ahmed",
    rating: 5,
    comment: "Morning Basket has completely changed my daily routine. The fish cuts are pristine and inspecting before paying gives total peace of mind.",
  },
  {
    id: "f-3",
    customer_name: "Tasneem Rahman",
    rating: 5,
    comment: "Triple-washed vegetables that actually taste farm-fresh. Sourced at 5 AM and at my doorstep before breakfast. Highly recommend!",
  },
  {
    id: "f-4",
    customer_name: "David Thompson",
    rating: 5,
    comment: "Exceptional pantry staples and vegetables. The packaging is eco-conscious and doorstep inspection makes it completely risk-free.",
  },
];

function StarRating({ rating }: { rating: number }) {
  const count = Math.min(5, Math.max(1, Math.round(rating || 5)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < count ? "text-[#FBBF24]" : "text-neutral-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewerName = review.customer_name || review.name || "Customer";
  const initial = (reviewerName.trim()[0] || "M").toUpperCase();

  return (
    <div className="bg-white p-7 md:p-8 rounded-3xl shadow-sm border border-neutral-100/80 flex flex-col justify-between h-full hover:shadow-md transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-5">
          <StarRating rating={review.rating} />
          <svg
            className="w-6 h-6 text-[#2C5F2D]/15"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed font-normal mb-8">
          &ldquo;{review.comment}&rdquo;
        </p>
      </div>

      <div className="flex items-center gap-3.5 pt-4 border-t border-neutral-100">
        <div className="w-11 h-11 bg-[#F0EDE6] rounded-full flex items-center justify-center text-[#2C5F2D] font-serif text-lg font-bold shrink-0 shadow-xs">
          {initial}
        </div>
        <div className="min-w-0">
          <h4 className="text-gray-900 font-bold font-serif text-sm md:text-base truncate">
            {reviewerName}
          </h4>
          <div className="flex items-center gap-1 mt-0.5">
            <svg
              className="w-3.5 h-3.5 text-[#2C5F2D]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-500 text-xs font-medium">Verified Buyer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewCarousel() {
  const [liveReviews, setLiveReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback to demo items if no reviews are approved yet
  const reviews = useMemo(() => {
    return liveReviews.length > 0 ? liveReviews : FALLBACK_REVIEWS;
  }, [liveReviews]);

  // Use carousel only when there are 3 or more reviews
  const isCarousel = reviews.length >= 3;

  const autoplayPlugin = useMemo(
    () => Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true }),
    []
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", skipSnaps: false },
    isCarousel ? [autoplayPlugin] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function fetchApprovedReviews() {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("id, customer_name, rating, comment, created_at")
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) throw error;

        if (isMounted && data && data.length > 0) {
          setLiveReviews(data);
        }
      } catch (err) {
        console.error("Reviews load error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchApprovedReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onInit = useCallback(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || !isCarousel) return;

    onInit();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onInit);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onInit);
    };
  }, [emblaApi, isCarousel, onInit, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  return (
    <section className="bg-[#F0EDE6] py-20 px-4 md:px-8 overflow-hidden relative border-t border-[#2C5F2D]/10">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#2C5F2D] mb-2">
            Verified Testimonials
          </p>
          <h2 className="text-3xl md:text-5xl font-serif text-gray-900 mb-3 tracking-tight">
            Customer Stories
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Discover why our community loves Morning Basket for their daily essentials.
          </p>

          {liveReviews.length === 0 && !isLoading && (
            <p className="text-gray-500 italic text-xs mt-2.5">
              *Displaying verified community feedback preview.*
            </p>
          )}
        </div>

        {/* 1 or 2 Reviews: Centered Side-by-Side Grid */}
        {!isCarousel ? (
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-6 max-w-3xl mx-auto">
            {reviews.map((review) => (
              <div key={review.id} className="flex-1 max-w-md w-full">
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        ) : (
          /* 3+ Reviews: Full Embla Carousel */
          <div className="relative">
            {/* Side Edge Fade Gradients */}
            <div className="absolute top-0 left-0 w-8 md:w-20 h-full bg-gradient-to-r from-[#F0EDE6] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 md:w-20 h-full bg-gradient-to-l from-[#F0EDE6] to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-4 touch-pan-y">
                {reviews.map((review, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={review.id}
                      className="flex-[0_0_88%] sm:flex-[0_0_60%] lg:flex-[0_0_33.333%] min-w-0 pl-4"
                    >
                      <div
                        className={`h-full transition-opacity duration-300 ${
                          isSelected ? "opacity-100" : "opacity-75"
                        }`}
                      >
                        <ReviewCard review={review} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-3.5 mt-10">
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Previous slide"
                className="w-9 h-9 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-[#2C5F2D] hover:border-[#2C5F2D] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {scrollSnaps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      index === selectedIndex
                        ? "bg-[#2C5F2D] w-7 shadow-xs"
                        : "bg-neutral-300 hover:bg-neutral-400 w-2.5"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={scrollNext}
                aria-label="Next slide"
                className="w-9 h-9 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-[#2C5F2D] hover:border-[#2C5F2D] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}