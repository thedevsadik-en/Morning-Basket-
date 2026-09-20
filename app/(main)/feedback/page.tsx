"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot detection field
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear errors when the user begins modifying the form
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [name, comment, rating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Silent rejection for spam bots filling out hidden fields
    if (honeypot.trim()) {
      setIsSuccess(true);
      return;
    }

    // Cooldown check (max 1 review every 60 seconds per session)
    const lastSubmission = sessionStorage.getItem("last_feedback_timestamp");
    if (lastSubmission && Date.now() - Number(lastSubmission) < 60000) {
      setErrorMessage("You recently sent feedback. Please wait a minute before sending another.");
      return;
    }

    const cleanName = name.trim();
    const cleanComment = comment.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please provide your name (at least 2 characters).");
      return;
    }
    if (cleanName.length > 80) {
      setErrorMessage("Name must be under 80 characters.");
      return;
    }
    if (!cleanComment || cleanComment.length < 5) {
      setErrorMessage("Please write at least a short sentence sharing your experience.");
      return;
    }
    if (cleanComment.length > 500) {
      setErrorMessage("Reviews are limited to 500 characters.");
      return;
    }

    const cleanRating = Math.min(5, Math.max(1, Math.round(rating)));
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("reviews").insert([
        {
          customer_name: cleanName,
          rating: cleanRating,
          comment: cleanComment,
          source: "website",
          is_approved: false, // Mandatory moderation guard
        },
      ]);

      if (error) throw error;

      sessionStorage.setItem("last_feedback_timestamp", String(Date.now()));
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setErrorMessage("Could not record your review. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-[#2C5F2D]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#2C5F2D]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            Your review has been safely received. To ensure a verified community experience, feedback is verified before publishing.
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Link
              href="/"
              className="w-full py-3 bg-[#2C5F2D] hover:bg-[#224A23] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              Back to Storefront
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setName("");
                setRating(5);
                setComment("");
              }}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors py-2"
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#2C5F2D] mb-2">
            Customer Community
          </p>
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 font-bold mb-3">
            Share Your Experience
          </h1>
          <p className="text-gray-600 text-sm md:text-base max-w-md mx-auto">
            Help us maintain the highest standard of fresh morning deliveries in Dhanmondi.
          </p>
        </div>

        <div className="bg-white p-7 md:p-10 rounded-3xl shadow-sm border border-gray-100">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot anti-spam field (hidden from real users) */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F0EDE6]/40 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2C5F2D]/20 focus:border-[#2C5F2D] outline-none transition-all text-sm text-gray-800 placeholder-gray-400"
                placeholder="e.g. Tanvir Ahmed"
              />
            </div>

            {/* Interactive Star Rating */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Rating
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#F0EDE6]/40 px-3 py-2 rounded-xl border border-neutral-200 w-fit">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                      >
                        <svg
                          className="w-6 h-6 transition-colors"
                          fill={isFilled ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={isFilled ? "0" : "1.5"}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-gray-600 ml-1">
                  {rating === 5 && "Excellent (5/5)"}
                  {rating === 4 && "Very Good (4/5)"}
                  {rating === 3 && "Good (3/5)"}
                  {rating === 2 && "Fair (2/5)"}
                  {rating === 1 && "Poor (1/5)"}
                </span>
              </div>
            </div>

            {/* Review Comment with Character Limit */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="comment" className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Your Feedback
                </label>
                <span className={`text-[11px] ${comment.length > 450 ? "text-amber-600 font-bold" : "text-gray-400"}`}>
                  {comment.length}/500
                </span>
              </div>
              <textarea
                id="comment"
                required
                rows={4}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-[#F0EDE6]/40 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2C5F2D]/20 focus:border-[#2C5F2D] outline-none transition-all text-sm text-gray-800 placeholder-gray-400 resize-none"
                placeholder="What did you think of the freshness and delivery timing?"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#2C5F2D] hover:bg-[#224A23] text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-md flex justify-center items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                "Send Feedback"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}