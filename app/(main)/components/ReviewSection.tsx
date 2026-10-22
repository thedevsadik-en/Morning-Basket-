"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabaseClient";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

function StarIcons({ rating }: { rating: number }) {
  const rounded = Math.min(5, Math.max(1, Math.round(rating || 5)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rounded ? "text-[#FBBF24]" : "text-neutral-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="bg-white p-7 rounded-3xl border border-neutral-100 shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-4 bg-neutral-100 rounded w-28" />
          <div className="h-3 bg-neutral-100 rounded w-20" />
        </div>
        <div className="h-5 bg-neutral-100 rounded-full w-16" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-neutral-100 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function ReviewSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    let isMounted = true;

    async function fetchApprovedReviews() {
      setIsLoading(true);
      try {
        // Enforce moderation: only retrieve approved testimonials
        const { data, error } = await supabase
          .from('reviews')
          .select('id, customer_name, rating, comment, created_at')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(60);

        if (error) throw error;
        if (isMounted) setReviews(data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchApprovedReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate stats
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 5.0, count: 0, fiveStarCount: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = sum / reviews.length;
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    return {
      avg: Number(avg.toFixed(1)),
      count: reviews.length,
      fiveStarCount,
    };
  }, [reviews]);

  // Filter computation
  const filteredReviews = useMemo(() => {
    if (selectedFilter === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedFilter);
  }, [reviews, selectedFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 space-y-12">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-neutral-200/60">
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#2C5F2D] mb-2">
            Verified Feedback
          </p>
          <h2 className="text-3xl md:text-5xl font-serif text-gray-900 font-bold tracking-tight">
            Customer Reviews
          </h2>
          <p className="text-gray-600 text-sm md:text-base mt-2 max-w-md leading-relaxed">
            Real experiences from families receiving fresh morning deliveries in Dhanmondi.
          </p>
        </div>

        {/* Aggregate Score Card */}
        <div className="bg-white px-7 py-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-6 shrink-0">
          <div className="text-center">
            <span className="font-serif text-4xl font-bold text-gray-900 leading-none">
              {stats.avg}
            </span>
            <div className="mt-1.5">
              <StarIcons rating={stats.avg} />
            </div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
              {stats.count} {stats.count === 1 ? 'Review' : 'Reviews'}
            </p>
          </div>

          <div className="w-px h-12 bg-neutral-100" />

          <Link
            href="/feedback"
            className="px-5 py-3 rounded-2xl bg-[#2C5F2D] hover:bg-[#224A23] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md active:scale-95"
          >
            Leave Review
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      {reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#23301B] text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
            if (count === 0) return null;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setSelectedFilter(stars)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedFilter === stars
                    ? 'bg-[#23301B] text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>{stars}</span>
                <span className="text-amber-400">★</span>
                <span>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <ReviewSkeleton key={n} />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-sm max-w-2xl mx-auto p-8 space-y-4">
          <div className="w-14 h-14 bg-[#F0EDE6] rounded-full flex items-center justify-center mx-auto text-[#2C5F2D]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-serif font-bold text-gray-900">
            {selectedFilter === 'all' ? 'No verified reviews yet' : `No ${selectedFilter}-star reviews found`}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {selectedFilter === 'all'
              ? 'Be the first to share your experience with morning basket delivery.'
              : 'Try clearing the star filter to see other customer feedback.'}
          </p>
          <div className="pt-2">
            <Link
              href="/feedback"
              className="inline-block px-6 py-2.5 bg-[#2C5F2D] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#224A23] transition-colors"
            >
              Share Your Feedback
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((review) => {
            const initial = (review.customer_name.trim()[0] || 'C').toUpperCase();
            return (
              <div
                key={review.id}
                className="bg-white p-7 md:p-8 rounded-3xl shadow-sm border border-neutral-100 hover:border-neutral-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <StarIcons rating={review.rating} />
                    <span className="text-[11px] font-medium text-neutral-400">
                      {new Date(review.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-[14.5px] font-normal mb-6">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3.5 pt-4 border-t border-neutral-100">
                  <div className="w-10 h-10 bg-[#F0EDE6] rounded-full flex items-center justify-center text-[#2C5F2D] font-serif text-base font-bold shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {review.customer_name}
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-[#2C5F2D]" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[11px] text-gray-500 font-medium">Verified Buyer</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}