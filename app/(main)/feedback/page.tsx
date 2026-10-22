"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ASPECT_TAGS = [
  "Produce Freshness",
  "Delivery Timing",
  "Packaging",
  "Rider Courtesy",
];

const RATING_LABELS: Record<number, string> = {
  5: "5 Stars · Dawn Fresh",
  4: "4 Stars · Very Good",
  3: "3 Stars · Fair",
  2: "2 Stars · Needs Improvement",
  1: "1 Star · Unsatisfied",
};

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [phoneOrOrder, setPhoneOrOrder] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Silent bot honeypot

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear errors when the user begins modifying form inputs
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, phoneOrOrder, comment, rating, selectedAspects]);

  const toggleAspect = (aspect: string) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect)
        ? prev.filter((a) => a !== aspect)
        : [...prev, aspect]
    );
  };

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
      setErrorMessage(
        "You recently sent feedback. Please wait a minute before sending another note."
      );
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
      setErrorMessage(
        "Please write a short sentence sharing your experience (at least 5 characters)."
      );
      return;
    }
    if (cleanComment.length > 500) {
      setErrorMessage("Feedback is limited to 500 characters.");
      return;
    }

    const cleanRating = Math.min(5, Math.max(1, Math.round(rating)));

    // Bundle phone / order ref and selected aspect tags into comment metadata
    const metaParts: string[] = [];
    if (phoneOrOrder.trim()) {
      metaParts.push(`Ref: ${phoneOrOrder.trim()}`);
    }
    if (selectedAspects.length > 0) {
      metaParts.push(`Tags: ${selectedAspects.join(", ")}`);
    }

    const finalComment =
      metaParts.length > 0
        ? `${cleanComment}\n\n[${metaParts.join(" · ")}]`
        : cleanComment;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("reviews").insert([
        {
          customer_name: cleanName,
          rating: cleanRating,
          comment: finalComment,
          source: "website",
          is_approved: false, // Mandatory moderation guard
        },
      ]);

      if (error) throw error;

      sessionStorage.setItem("last_feedback_timestamp", String(Date.now()));
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setErrorMessage("Could not submit your feedback. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-[#F8F6F0] text-[#2C332D]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* ── Left Column (5 Cols): Editorial Concierge & Direct Contact ── */}
          <div className="lg:col-span-5">
            <p className="text-[#1E3324] text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Customer Care & Caretaker
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1E3324] tracking-tight leading-snug">
              Your Morning Voice Shapes Tomorrow&apos;s Harvest.
            </h1>
            <p className="text-[#5A6E5F] text-sm leading-relaxed mt-4">
              Every evening, our team reviews your feedback to curate what we hand-select
              at wholesale hubs at 5 AM. Whether you loved today&apos;s coriander or had an
              issue with an item, your word directly guides our riders and packers.
            </p>

            {/* Urgent Issue Escalation Box */}
            <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs mt-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1E3324]/5 text-[#1E3324] flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm text-[#1E3324]">
                    Need immediate doorstep resolution?
                  </h2>
                  <p className="text-[#5A6E5F] text-xs leading-relaxed mt-1">
                    Our Dhanmondi morning logistics lead is on active morning dispatch for instant
                    item replacement or doorstep refund.
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/8801336986661?text=Hi%20Morning%20Basket%20team,%20I%20need%20assistance%20with%20my%20delivery."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1E3324]/5 text-[#1E3324] hover:bg-[#1E3324]/10 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold mt-4 transition-colors"
              >
                <span>Chat with Delivery Lead on WhatsApp</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Dispatch
                </span>
              </a>
            </div>
          </div>

          {/* ── Right Column (7 Cols): Elevated Feedback Form Card ─────────── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_8px_30px_rgba(30,51,36,0.04)] p-6 sm:p-8">
              {isSuccess ? (
                /* Success State */
                <div className="py-8 text-center animate-in fade-in duration-300">
                  <div className="w-14 h-14 bg-[#1E3324]/10 text-[#1E3324] rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-[#1E3324]/20">
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.25}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3324] mb-2 tracking-tight">
                    Thank you, {name.trim() || "Customer"}.
                  </h3>
                  <p className="text-[#5A6E5F] text-sm leading-relaxed max-w-md mx-auto mb-8">
                    Your feedback has reached our Dhanmondi morning logistics team. Every evening, our
                    sourcing caretakers review customer notes to determine which grower crates to select at 5 AM.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/"
                      className="w-full sm:w-auto bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] py-3 px-6 rounded-xl font-medium text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 text-center"
                    >
                      Return to Storefront →
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuccess(false);
                        setName("");
                        setPhoneOrOrder("");
                        setRating(5);
                        setSelectedAspects([]);
                        setComment("");
                      }}
                      className="w-full sm:w-auto text-xs text-[#5A6E5F] hover:text-[#1E3324] font-medium py-3 px-4 rounded-xl border border-transparent hover:border-[#EAE6DF] transition-all cursor-pointer"
                    >
                      Submit Another Note
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Honeypot anti-spam field */}
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                      <svg
                        className="w-4 h-4 shrink-0 text-amber-700"
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
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Name & Phone/Order ID Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="feedback-name"
                        className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                      >
                        Full Name <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        type="text"
                        id="feedback-name"
                        required
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tanvir Ahmed"
                        className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none p-3.5"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="feedback-ref"
                        className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                      >
                        Phone or Order ID <span className="text-[#8A9A8E] font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="feedback-ref"
                        maxLength={40}
                        value={phoneOrOrder}
                        onChange={(e) => setPhoneOrOrder(e.target.value)}
                        placeholder="e.g. 017... or #1042"
                        className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none p-3.5"
                      />
                    </div>
                  </div>

                  {/* Interactive Star Rating */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block">
                      Overall Experience
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#EAE6DF] p-2 rounded-xl">
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

                      <span className="text-xs font-semibold text-[#1E3324] bg-[#1E3324]/5 px-3 py-1.5 rounded-lg border border-[#1E3324]/10">
                        {RATING_LABELS[hoverRating || rating] || `${rating} Stars`}
                      </span>
                    </div>
                  </div>

                  {/* Quick-Select Aspect Chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-2 block">
                      What stood out? <span className="text-[#8A9A8E] font-normal lowercase">(optional)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_TAGS.map((tag) => {
                        const isSelected = selectedAspects.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleAspect(tag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#1E3324] text-white border-[#1E3324] shadow-xs"
                                : "bg-[#FAF9F6] text-[#4A5D4E] border-[#EAE6DF] hover:border-[#1E3324]"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="feedback-comment"
                        className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider block"
                      >
                        Your Experience <span className="text-emerald-700">*</span>
                      </label>
                      <span
                        className={`text-[11px] ${
                          comment.length > 450
                            ? "text-amber-700 font-bold"
                            : "text-[#7A8C7E]"
                        }`}
                      >
                        {comment.length}/500
                      </span>
                    </div>
                    <textarea
                      id="feedback-comment"
                      required
                      rows={4}
                      maxLength={500}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What did you think of today's harvest quality, delivery timing, or rider doorstep courtesy?"
                      className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none p-3.5 resize-none"
                    />
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] py-3.5 px-6 rounded-xl font-medium text-sm tracking-wide shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#F8F6F0] border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Your Voice...</span>
                      </>
                    ) : (
                      <span>Send Feedback →</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}