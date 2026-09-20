"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface Review {
  id: number | string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  is_approved: boolean;
}

type FilterTab = 'all' | 'pending' | 'approved';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedReviewId, setExpandedReviewId] = useState<number | string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Unexpected fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleApprove = async (id: number | string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setActionLoadingId(id);

    // Optimistic update
    setReviews((prev) =>
      prev.map((review) =>
        review.id === id ? { ...review, is_approved: newStatus } : review
      )
    );

    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating review:', error);
      alert('Failed to update review status. Please check your Supabase table permissions / RLS policies.');
      // Revert optimistic state
      setReviews((prev) =>
        prev.map((review) =>
          review.id === id ? { ...review, is_approved: currentStatus } : review
        )
      );
    }

    setActionLoadingId(null);
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;

    setActionLoadingId(id);
    const previousReviews = [...reviews];

    // Optimistic update
    setReviews((prev) => prev.filter((review) => review.id !== id));

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      alert("Failed to delete review. Please verify Supabase delete permissions.");
      // Revert on failure
      setReviews(previousReviews);
    }

    setActionLoadingId(null);
  };

  const filteredReviews = useMemo(() => {
    if (activeTab === 'pending') return reviews.filter((r) => !r.is_approved);
    if (activeTab === 'approved') return reviews.filter((r) => r.is_approved);
    return reviews;
  }, [reviews, activeTab]);

  const counts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter((r) => !r.is_approved).length,
    approved: reviews.filter((r) => r.is_approved).length,
  }), [reviews]);

  const renderStars = (rating: number) => {
    const cleanRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={`text-lg select-none ${
          i < cleanRating ? 'text-amber-400' : 'text-neutral-200'
        }`}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-[#23301B]">
            Reviews Management
          </h1>
          <p className="mt-2 text-base text-[#23301B]/70">
            Moderate customer feedback before it is published on the storefront.
          </p>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-neutral-200 shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#23301B] text-[#F6F1E4] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-[#2C5F2D] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Live ({counts.approved})
          </button>
        </div>
      </header>

      <section className="bg-white rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[#2C5F2D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center text-neutral-400 font-medium">
            {activeTab === 'pending'
              ? 'No reviews awaiting moderation.'
              : activeTab === 'approved'
              ? 'No approved reviews yet.'
              : 'No reviews found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500">
                  <th className="p-6 font-bold text-xs uppercase tracking-widest">Customer</th>
                  <th className="p-6 font-bold text-xs uppercase tracking-widest">Rating</th>
                  <th className="p-6 font-bold text-xs uppercase tracking-widest">Review Content</th>
                  <th className="p-6 font-bold text-xs uppercase tracking-widest">Date</th>
                  <th className="p-6 font-bold text-xs uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredReviews.map((review) => {
                  const isBusy = actionLoadingId === review.id;
                  const isExpanded = expandedReviewId === review.id;

                  return (
                    <tr key={review.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-6 align-top">
                        <div className="font-semibold text-neutral-900 text-sm">
                          {review.customer_name || 'Anonymous'}
                        </div>
                        <div className="mt-1">
                          {review.is_approved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
                              Live on Store
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Needs Approval
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-6 align-top whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </td>

                      <td className="p-6 align-top max-w-md text-sm text-neutral-700">
                        <p className={isExpanded ? '' : 'line-clamp-2'}>
                          {review.comment}
                        </p>
                        {review.comment && review.comment.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setExpandedReviewId(isExpanded ? null : review.id)}
                            className="text-xs text-[#2C5F2D] hover:underline font-medium mt-1 inline-block cursor-pointer"
                          >
                            {isExpanded ? 'Show less' : 'Read full review'}
                          </button>
                        )}
                      </td>

                      <td className="p-6 align-top text-xs text-neutral-500 whitespace-nowrap">
                        {review.created_at ? (
                          new Date(review.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-6 align-top whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleApprove(review.id, review.is_approved)}
                          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all text-xs shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                            review.is_approved
                              ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                              : 'bg-[#2C5F2D] text-white hover:bg-[#224A23]'
                          }`}
                        >
                          {isBusy ? '...' : review.is_approved ? 'Hide' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(review.id)}
                          className="px-3.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold transition-all text-xs shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}