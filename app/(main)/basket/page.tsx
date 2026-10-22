"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, CartUnit } from "@/lib/useCart";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { supabase } from "@/lib/supabaseClient";

interface VerifiedProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
}

const DISCRETE_UNITS = [
  "piece",
  "pc",
  "pcs",
  "pack",
  "packet",
  "box",
  "jar",
  "bottle",
  "bunch",
  "dozen",
];

export default function BasketPage() {
  const { cart, removeItem, clearCart, addOrUpdate } = useCart();
  const { settings } = useStoreSettings();

  const minOrderValue = settings.min_order_value;
  const freeDeliveryThreshold = settings.free_delivery_threshold;
  const deliveryFee = settings.delivery_fee;
  const bkashNumber = settings.bkash_number;

  // Safe Hydration Guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [zone, setZone] = useState("Dhanmondi");
  const [phone, setPhone] = useState("");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bkash">("cod");
  const [trxId, setTrxId] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // App & Verification states
  const [verifiedProducts, setVerifiedProducts] = useState<Record<string, VerifiedProduct>>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrderSummary, setPlacedOrderSummary] = useState<{
    name: string;
    total: number;
    method: "cod" | "bkash";
    itemCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedBkash, setCopiedBkash] = useState(false);

  const cartEntries = useMemo(() => Object.entries(cart), [cart]);
  const cartProductIds = useMemo(() => Object.keys(cart), [cart]);

  // Sync catalog details and live prices from Supabase
  const syncCartItems = useCallback(async () => {
    if (cartProductIds.length === 0) {
      setIsLoadingCatalog(false);
      return;
    }

    try {
      setIsLoadingCatalog(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, unit, image_url, is_active")
        .in("id", cartProductIds);

      if (!error && data) {
        const map: Record<string, VerifiedProduct> = {};
        data.forEach((item) => {
          map[String(item.id)] = item as VerifiedProduct;
        });
        setVerifiedProducts(map);
      }
    } catch (err) {
      console.warn("Cart sync verification notice:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [cartProductIds]);

  useEffect(() => {
    if (mounted) {
      syncCartItems();
    }
  }, [mounted, syncCartItems]);

  // Check if any item in cart is deactivated
  const inactiveItemsInCart = useMemo(() => {
    return cartEntries.filter(([id]) => {
      const product = verifiedProducts[id];
      return product && !product.is_active;
    });
  }, [cartEntries, verifiedProducts]);

  // Subtotal calculation strictly using live verified prices when available
  const subtotal = useMemo(() => {
    return cartEntries.reduce((sum, [id, item]) => {
      const livePrice = verifiedProducts[id]?.price ?? item.price;
      const unit = (item.unit || "").toLowerCase();
      const normalizedQty =
        unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
          ? item.qty / 1000
          : item.qty;
      return sum + normalizedQty * livePrice;
    }, 0);
  }, [cartEntries, verifiedProducts]);

  // Two-tier calculations
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const currentDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const totalPayable = subtotal + currentDeliveryFee;

  const isMovReached = subtotal >= minOrderValue;
  const neededForMOV = Math.max(0, minOrderValue - subtotal);

  // Doorstep collection depending on payment method
  const totalDueAtDoorstep = useMemo(() => {
    if (paymentMethod === "cod") {
      return totalPayable;
    }
    // For bKash pre-pay, slot fee is paid now via bKash; produce subtotal is due at doorstep
    return subtotal;
  }, [paymentMethod, totalPayable, subtotal]);

  // Clear errors when the user edits form inputs
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, zone, phone, detailedAddress, trxId, paymentMethod]);

  const handleCopyBkash = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(bkashNumber);
      } else {
        const input = document.createElement("input");
        input.value = bkashNumber;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedBkash(true);
      setTimeout(() => setCopiedBkash(false), 2000);
    } catch {
      setCopiedBkash(false);
    }
  };

  const handleUpdateQty = (
    id: string,
    currentQty: number,
    delta: number,
    unit: CartUnit,
    price: number
  ) => {
    const isWeight = !DISCRETE_UNITS.includes(unit.toLowerCase());
    const step = unit.toLowerCase() === "g" ? 100 : isWeight ? 0.5 : 1;
    const nextQty = Math.round((currentQty + delta * step) * 10) / 10;

    if (nextQty <= 0) {
      removeItem(id);
    } else if (nextQty <= 100) {
      addOrUpdate(id, nextQty, unit, price);
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Bot trap rejection
    if (honeypot.trim()) {
      setIsSuccess(true);
      return;
    }

    if (inactiveItemsInCart.length > 0) {
      setErrorMessage(
        "Your basket contains items that are currently out of stock. Please remove them to proceed."
      );
      return;
    }

    if (!isMovReached) {
      setErrorMessage(
        `Minimum order value is ৳${minOrderValue}. Please add ৳${Math.ceil(neededForMOV)} more to checkout.`
      );
      return;
    }

    // Sanitize user inputs
    const cleanName = customerName.replace(/[<>]/g, "").trim();
    const cleanAddress = detailedAddress.replace(/[<>]/g, "").trim();
    const rawPhone = phone.replace(/[\s-]/g, "");

    if (!cleanName || cleanName.length < 2 || cleanName.length > 80) {
      setErrorMessage("Please enter a valid full name (2–80 characters).");
      return;
    }
    if (!zone) {
      setErrorMessage("Please select your delivery zone.");
      return;
    }

    // Bangladeshi phone validation
    const bdPhoneRegex = /^(?:\+?880|0)?1[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(rawPhone)) {
      setErrorMessage(
        "Please provide a valid 11-digit Bangladeshi phone number (01XXXXXXXXX)."
      );
      return;
    }

    const standardPhone = rawPhone.startsWith("+880")
      ? rawPhone
      : rawPhone.startsWith("880")
      ? `+${rawPhone}`
      : rawPhone.startsWith("0")
      ? `+88${rawPhone}`
      : `+880${rawPhone}`;

    if (!cleanAddress || cleanAddress.length < 5 || cleanAddress.length > 250) {
      setErrorMessage(
        "Please provide a detailed address including house, road, and area."
      );
      return;
    }

    // Validate payment method specifics
    let cleanTrx = "COD";
    if (paymentMethod === "bkash") {
      cleanTrx = trxId.trim().toUpperCase();
      const trxRegex = /^[A-Z0-9]{8,15}$/;
      if (!trxRegex.test(cleanTrx)) {
        setErrorMessage(
          "Please enter a valid bKash Transaction ID (8–15 letters or digits)."
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Re-query live product database to prevent tampering
      const { data: freshProducts, error: freshError } = await supabase
        .from("products")
        .select("id, name, price, unit, is_active")
        .in("id", cartProductIds);

      if (freshError || !freshProducts) {
        throw new Error("Failed to verify live product pricing. Please try again.");
      }

      const freshMap = new Map(freshProducts.map((p) => [String(p.id), p]));

      let authoritativeSubtotal = 0;
      const verifiedSnapshot = [];

      for (const [id, item] of cartEntries) {
        const liveRecord = freshMap.get(id);

        if (!liveRecord || !liveRecord.is_active) {
          setErrorMessage(
            `"${item.qty} ${item.unit} of item #${id}" is no longer available. Please update your basket.`
          );
          setIsSubmitting(false);
          return;
        }

        const unit = (item.unit || "").toLowerCase();
        const normalizedQty =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? item.qty / 1000
            : item.qty;

        const lineTotal = normalizedQty * Number(liveRecord.price);
        authoritativeSubtotal += lineTotal;

        verifiedSnapshot.push({
          product_id: id,
          name: liveRecord.name,
          qty: item.qty,
          unit: item.unit,
          price: Number(liveRecord.price),
          line_total: Math.round(lineTotal),
        });
      }

      if (authoritativeSubtotal < minOrderValue) {
        setErrorMessage(
          `Verified produce total is ৳${Math.round(
            authoritativeSubtotal
          )}, which is below our ৳${minOrderValue} minimum.`
        );
        setIsSubmitting(false);
        return;
      }

      // Check duplicate bKash Transaction IDs if using bKash
      if (paymentMethod === "bkash") {
        try {
          const { data: existingTrx } = await supabase
            .from("orders")
            .select("id")
            .eq("bkash_trx_id", cleanTrx)
            .limit(1);

          if (existingTrx && existingTrx.length > 0) {
            setErrorMessage(
              "This bKash Transaction ID has already been submitted for a previous order."
            );
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Non-blocking if table or index is missing
        }
      }

      const authoritativeDeliveryFee = authoritativeSubtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
      const authoritativeFinalTotal = Math.round(authoritativeSubtotal + authoritativeDeliveryFee);

      // Commit order
      const { error: insertError } = await supabase.from("orders").insert([
        {
          customer_name: cleanName,
          delivery_zone: zone,
          customer_phone: standardPhone,
          delivery_address: cleanAddress,
          bkash_trx_id: cleanTrx,
          cart_total: authoritativeFinalTotal,
          cart_items: verifiedSnapshot,
          order_status: "Pending",
        },
      ]);

      if (insertError) throw insertError;

      setPlacedOrderSummary({
        name: cleanName,
        total: authoritativeFinalTotal,
        method: paymentMethod,
        itemCount: cartEntries.length,
      });

      clearCart();
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Order submission failure:", err);
      setErrorMessage(
        err.message || "Could not complete order. Please verify your connection."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Hydration Mount Guard
  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#1E3324]/40 font-medium">
        Loading basket...
      </div>
    );
  }

  // Success Confirmation View
  if (isSuccess) {
    return (
      <div className="min-h-[85vh] bg-[#F8F6F0] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-[#EAE6DF] shadow-[0_8px_30px_rgba(30,51,36,0.06)] p-8 sm:p-10 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-[#1E3324]/10 text-[#1E3324] flex items-center justify-center mx-auto mb-6 ring-1 ring-[#1E3324]/20">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <p className="text-[#1E3324] text-xs font-semibold uppercase tracking-[0.2em] mb-2">
            Dawn Booking Confirmed
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E3324] tracking-tight mb-3">
            Morning Basket Scheduled.
          </h1>
          <p className="text-[#5A6E5F] text-sm leading-relaxed mb-6">
            Thank you, <strong className="text-[#1E3324] font-semibold">{placedOrderSummary?.name || "Neighbor"}</strong>. Our caretakers begin hand-selecting your items at wholesale hubs at <strong className="text-[#1E3324]">5 AM</strong>. Your delivery will arrive at your doorstep between <strong className="text-[#1E3324]">8 AM – 12 PM</strong>.
          </p>

          <div className="bg-[#FAF9F6] border border-[#EAE6DF] rounded-2xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between items-center text-xs text-[#5A6E5F]">
              <span>Delivery Slot</span>
              <span className="font-semibold text-[#1E3324]">Tomorrow Dawn (8 AM – 12 PM)</span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#5A6E5F]">
              <span>Payment Protocol</span>
              <span className="font-semibold text-[#1E3324]">
                {placedOrderSummary?.method === "cod"
                  ? "100% Cash on Delivery (Inspect First)"
                  : "bKash Pre-paid Slot (Balance at door)"}
              </span>
            </div>
            <div className="border-t border-[#F0EDE6] pt-2 flex justify-between items-center text-xs">
              <span className="font-semibold text-[#1E3324]">Amount Due at Doorstep</span>
              <span className="font-bold text-base text-[#1E3324]">
                ৳{placedOrderSummary?.total || totalDueAtDoorstep}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] py-3.5 px-8 rounded-xl font-medium text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 text-center"
            >
              Return to Storefront →
            </Link>
            <Link
              href="/feedback"
              className="w-full sm:w-auto text-xs text-[#5A6E5F] hover:text-[#1E3324] font-medium py-3.5 px-6 rounded-xl border border-[#EAE6DF] hover:border-[#1E3324] transition-all text-center"
            >
              Leave Concierge Note
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty Cart State (Editorial Empty Basket Card)
  if (cartEntries.length === 0) {
    return (
      <div className="min-h-[85vh] bg-[#F8F6F0] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#EAE6DF] shadow-[0_8px_30px_rgba(30,51,36,0.04)] p-8 sm:p-10 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-[#1E3324]/5 text-[#1E3324] flex items-center justify-center mx-auto mb-5 ring-1 ring-[#1E3324]/10">
            <svg
              className="w-8 h-8"
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
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#1E3324] mb-2 tracking-tight">
            Your basket is currently empty
          </h2>
          <p className="text-[#5A6E5F] text-xs sm:text-sm leading-relaxed mb-6">
            Hand-select dawn fresh vegetables and daily essentials for morning delivery in Dhanmondi.
          </p>
          <Link
            href="/#catalog"
            className="inline-flex items-center justify-center gap-2 bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] px-7 py-3.5 rounded-xl font-medium text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            Explore Morning Harvest →
          </Link>
        </div>
      </div>
    );
  }

  // Populated Cart State (Two-Column Sticky Checkout)
  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#2C332D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb */}
        <Link
          href="/#catalog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5A6E5F] hover:text-[#1E3324] transition-colors mb-8 group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Continue Shopping Produce</span>
        </Link>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ── Left Column (7 Cols on desktop): Elevated Basket Items List ── */}
          <section className="lg:col-span-7 w-full">
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(30,51,36,0.04)] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[#F0EDE6] flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[#1E3324] font-serif text-2xl tracking-tight">
                  Your Morning Basket
                </h1>
                <span className="text-xs font-semibold text-[#1E3324] bg-[#1E3324]/5 px-3 py-1.5 rounded-full border border-[#1E3324]/10">
                  {cartEntries.length} {cartEntries.length === 1 ? "Item" : "Items"} · Dhanmondi Dawn Slot
                </span>
              </div>

              {/* Inactive Items Warning */}
              {inactiveItemsInCart.length > 0 && (
                <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    One or more items in your cart are currently out of stock. Please remove them to proceed with booking.
                  </span>
                </div>
              )}

              {/* Item Rows */}
              <div className="divide-y divide-[#F0EDE6]">
                {cartEntries.map(([id, item]) => {
                  const product = verifiedProducts[id];
                  const price = product?.price ?? item.price;
                  const unit = (item.unit || "kg").toLowerCase();
                  const isWeight = !DISCRETE_UNITS.includes(unit);
                  const normalizedQty =
                    unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
                      ? item.qty / 1000
                      : item.qty;
                  const lineTotal = normalizedQty * price;
                  const isOutOfStock = product && !product.is_active;

                  return (
                    <div
                      key={id}
                      className={`p-4 sm:p-5 flex items-center gap-4 transition-colors hover:bg-[#FAF9F6] ${
                        isOutOfStock ? "bg-red-50/30" : ""
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] overflow-hidden shrink-0 relative flex items-center justify-center">
                        {product?.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#8A9A8E]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[#1E3324] font-medium text-base truncate">
                            {product?.name || `Produce #${id.slice(0, 6)}`}
                          </h2>
                          {isOutOfStock && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md shrink-0">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <p className="text-[#7A8C7E] text-xs mt-0.5">
                          ৳{price} / {product?.unit || (isWeight ? "kg" : "unit")}
                        </p>

                        {/* Stepper (-, qty, +) */}
                        <div className="bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-2 py-1 text-xs flex items-center gap-2 mt-2 w-fit">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(id, item.qty, -1, item.unit, price)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#EAE6DF] text-[#1E3324] font-bold flex items-center justify-center hover:bg-[#FAF8F5] transition-colors cursor-pointer text-xs disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-xs font-semibold text-[#1E3324] px-1 min-w-[3rem] text-center">
                            {item.qty} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(id, item.qty, 1, item.unit, price)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#EAE6DF] text-[#1E3324] font-bold flex items-center justify-center hover:bg-[#FAF8F5] transition-colors cursor-pointer text-xs"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Line Price & Remove Button */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <p className="text-[#1E3324] font-semibold text-base">
                          ৳{lineTotal.toFixed(0)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(id)}
                          className="text-[#8A9A8E] hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          aria-label={`Remove ${product?.name || "item"} from basket`}
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Basket Card Footer Info */}
              <div className="p-4 bg-[#FAF9F6] border-t border-[#F0EDE6] flex items-center justify-between text-xs text-[#5A6E5F]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  5 AM Dawn Hand-Selected at Wholesale Hubs
                </span>
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-xs text-[#7A8C7E] hover:text-red-600 transition-colors cursor-pointer"
                >
                  Clear Basket
                </button>
              </div>
            </div>
          </section>

          {/* ── Right Column (5 Cols on desktop): Sticky Order Summary & Booking Card ── */}
          <aside className="lg:col-span-5 w-full sticky top-24">
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_8px_30px_rgba(30,51,36,0.06)] p-6 sm:p-7">
              {/* 1. Order Summary Breakdown */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-[#5A6E5F] mb-2.5">
                  <span>Produce Subtotal</span>
                  <span className="font-semibold text-[#1E3324]">৳{subtotal.toFixed(0)}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-[#5A6E5F] mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span>Dawn Delivery Fee</span>
                    {isFreeDelivery && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold px-2 py-0.5 rounded-full">
                        FREE UNLOCKED
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#1E3324]">
                    {isFreeDelivery ? (
                      <span className="text-emerald-700 font-bold tracking-wide">FREE</span>
                    ) : (
                      `৳${deliveryFee}`
                    )}
                  </span>
                </div>

                {paymentMethod === "bkash" && !isFreeDelivery && (
                  <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/50 mb-2.5">
                    <span>Pre-paid Slot via bKash</span>
                    <span className="font-semibold">-৳{deliveryFee}</span>
                  </div>
                )}

                <div className="border-t border-[#F0EDE6] my-3.5" />

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3324] block">
                      Total Payable
                    </span>
                    <span className="text-[11px] text-[#7A8C7E] leading-tight block mt-0.5">
                      {paymentMethod === "cod"
                        ? "100% Cash on Delivery at doorstep"
                        : isFreeDelivery
                        ? "Full amount due upon doorstep inspection"
                        : "Slot fee prepaid; balance due at doorstep"}
                    </span>
                  </div>
                  <span className="text-[#1E3324] font-serif font-bold text-2xl">
                    ৳{totalPayable.toFixed(0)}
                  </span>
                </div>

                {/* Minimum Order Alert */}
                {!isMovReached && (
                  <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Minimum order value is ৳{minOrderValue}. Please add ৳{Math.ceil(neededForMOV)} more to checkout.
                    </span>
                  </div>
                )}
              </div>

              {/* Customer Address & Booking Form */}
              <form onSubmit={handleConfirmOrder} className="space-y-4">
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

                {/* Honeypot anti-spam */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="basket-customer-name"
                    className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                  >
                    Full Name <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    id="basket-customer-name"
                    required
                    maxLength={80}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl p-3 text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none"
                  />
                </div>

                {/* Zone & WhatsApp Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="basket-delivery-zone"
                      className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                    >
                      Delivery Zone <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      id="basket-delivery-zone"
                      required
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl p-3 text-sm text-[#1E3324] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none cursor-pointer"
                    >
                      <option value="Dhanmondi">Dhanmondi</option>
                      <option value="Mohammadpur">Mohammadpur</option>
                      <option value="Bosila">Bosila</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="basket-customer-phone"
                      className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                    >
                      Phone (WhatsApp) <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="tel"
                      id="basket-customer-phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl p-3 text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Detailed Address */}
                <div>
                  <label
                    htmlFor="basket-delivery-address"
                    className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1.5 block"
                  >
                    Delivery Address <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    id="basket-delivery-address"
                    required
                    maxLength={250}
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="House #, Road #, Apartment / Flat, Floor..."
                    className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl p-3 text-sm text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none"
                  />
                </div>

                {/* Payment Method Toggle */}
                <div>
                  <span className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-2 block">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* COD Pill */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        paymentMethod === "cod"
                          ? "bg-[#1E3324] text-[#F8F6F0] border-[#1E3324] shadow-xs"
                          : "bg-[#FAF9F6] text-[#4A5D4E] border-[#EAE6DF] hover:border-[#1E3324]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-semibold">100% Cash on Delivery</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            paymentMethod === "cod"
                              ? "border-white bg-white"
                              : "border-[#8A9A8E]"
                          }`}
                        >
                          {paymentMethod === "cod" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3324]" />
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] leading-tight ${
                          paymentMethod === "cod" ? "text-[#E0E7E1]" : "text-[#7A8C7E]"
                        }`}
                      >
                        Inspect First, pay at door
                      </span>
                    </button>

                    {/* bKash Pre-pay Pill */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bkash")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        paymentMethod === "bkash"
                          ? "bg-[#1E3324] text-[#F8F6F0] border-[#1E3324] shadow-xs"
                          : "bg-[#FAF9F6] text-[#4A5D4E] border-[#EAE6DF] hover:border-[#1E3324]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-semibold">bKash</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            paymentMethod === "bkash"
                              ? "border-white bg-white"
                              : "border-[#8A9A8E]"
                          }`}
                        >
                          {paymentMethod === "bkash" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3324]" />
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] leading-tight ${
                          paymentMethod === "bkash" ? "text-[#E0E7E1]" : "text-[#7A8C7E]"
                        }`}
                      >
                        {isFreeDelivery ? "Full amount / tip" : `Send ৳${deliveryFee} slot fee`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Conditional bKash Drawer */}
                {paymentMethod === "bkash" && (
                  <div className="bg-[#FAF9F6] border border-[#EAE6DF] rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3324]">
                      <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {isFreeDelivery
                          ? "Send via bKash Personal"
                          : `Send ৳${deliveryFee} Slot Fee via bKash Personal`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-[#EAE6DF]">
                      <span className="font-mono text-xs font-bold tracking-wider text-[#1E3324]">
                        {bkashNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyBkash}
                        className="text-xs font-semibold text-[#1E3324] hover:underline cursor-pointer"
                      >
                        {copiedBkash ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    <p className="text-[11px] text-[#5A6E5F] leading-relaxed">
                      {isFreeDelivery
                        ? "Delivery is free on this order! You can prepay your order total or tip our caretakers."
                        : `Send Money ৳${deliveryFee} to guarantee tomorrow's morning slot. Balance produce total of ৳${subtotal.toFixed(0)} is paid after inspecting items at your door.`}
                    </p>

                    <div>
                      <label
                        htmlFor="basket-trx-id"
                        className="text-[11px] font-semibold text-[#1E3324] uppercase tracking-wider mb-1 block"
                      >
                        bKash Transaction ID <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        type="text"
                        id="basket-trx-id"
                        required={paymentMethod === "bkash"}
                        maxLength={15}
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        placeholder="e.g. BLA7X8Y9Z0"
                        className="w-full bg-white border border-[#EAE6DF] rounded-xl p-2.5 text-xs text-[#1E3324] font-mono uppercase tracking-wider placeholder-[#8A9A8E] focus:border-[#1E3324] focus:ring-1 focus:ring-[#1E3324]/10 transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  id="confirm-order-btn"
                  disabled={
                    !isMovReached ||
                    isSubmitting ||
                    isLoadingCatalog ||
                    inactiveItemsInCart.length > 0
                  }
                  className="w-full bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] py-4 rounded-xl font-medium text-base tracking-wide shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#F8F6F0] border-t-transparent rounded-full animate-spin" />
                      <span>Securing Dawn Slot...</span>
                    </>
                  ) : (
                    <span>Confirm Order &amp; Lock Dawn Slot →</span>
                  )}
                </button>

                {/* Reassurance Badge */}
                <div className="flex items-center justify-center gap-1.5 text-center mt-3 text-[11px] text-[#5A6E5F]">
                  <svg
                    className="w-3.5 h-3.5 text-[#1E3324] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <span>Backed by 100% Doorstep Inspection &amp; Instant Refund Guarantee.</span>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}