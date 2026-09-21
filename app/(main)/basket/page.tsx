"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, CartUnit } from "@/lib/useCart";
import { supabase } from "@/lib/supabaseClient";

const DELIVERY_FEE = 60;

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

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [zone, setZone] = useState("");
  const [phone, setPhone] = useState("");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [trxId, setTrxId] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [storeSettings, setStoreSettings] = useState({ minimum_order_value: 450, bkash_number: "01712069030" });

  // App states
  const [hasMounted, setHasMounted] = useState(false);
  const [verifiedProducts, setVerifiedProducts] = useState<Record<string, VerifiedProduct>>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedBkash, setCopiedBkash] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const cartEntries = useMemo(() => Object.entries(cart), [cart]);
  const cartProductIds = useMemo(() => Object.keys(cart), [cart]);

  // Sync catalog details and live prices from Supabase
  const syncCartItems = useCallback(async () => {
    if (cartProductIds.length === 0) {
      setIsLoadingCatalog(false);
      return;
    }

    try {
      const { data: settingsData } = await supabase.from('store_settings').select('minimum_order_value, bkash_number').single();
      if (settingsData) {
        setStoreSettings({
          minimum_order_value: settingsData.minimum_order_value,
          bkash_number: settingsData.bkash_number,
        });
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, unit, image_url, is_active")
        .in("id", cartProductIds);

      if (error) throw error;

      const map: Record<string, VerifiedProduct> = {};
      data?.forEach((item) => {
        map[String(item.id)] = item as VerifiedProduct;
      });

      setVerifiedProducts(map);
    } catch (err) {
      console.error("Cart sync verification error:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [cartProductIds]);

  useEffect(() => {
    syncCartItems();
  }, [syncCartItems]);

  // Check if any item in cart is deactivated
  const inactiveItemsInCart = useMemo(() => {
    return cartEntries.filter(([id]) => {
      const product = verifiedProducts[id];
      return product && !product.is_active;
    });
  }, [cartEntries, verifiedProducts]);

  // Subtotal calculation strictly using live verified prices
  const cartTotal = useMemo(() => {
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

  const neededForMOV = Math.max(0, storeSettings.minimum_order_value - cartTotal);
  const isMovReached = cartTotal >= storeSettings.minimum_order_value;

  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [customerName, zone, phone, detailedAddress, trxId]);

  const handleCopyBkash = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(storeSettings.bkash_number);
      } else {
        const input = document.createElement("input");
        input.value = storeSettings.bkash_number;
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

  const handleUpdateQty = (id: string, currentQty: number, delta: number, unit: CartUnit, price: number) => {
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
      setErrorMessage("Your basket contains items that are currently out of stock. Please remove them to proceed.");
      return;
    }

    if (!isMovReached) {
      setErrorMessage(`Minimum order value is ৳${storeSettings.minimum_order_value}. Please add more items.`);
      return;
    }

    // Sanitize user inputs
    const cleanName = customerName.replace(/[<>]/g, "").trim();
    const cleanAddress = detailedAddress.replace(/[<>]/g, "").trim();
    const cleanTrx = trxId.trim().toUpperCase();
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
      setErrorMessage("Please provide a valid 11-digit Bangladeshi phone number (01XXXXXXXXX).");
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
      setErrorMessage("Please provide a detailed address including house, road, and area.");
      return;
    }

    // bKash TrxID format validation (8-15 alphanumeric characters)
    const trxRegex = /^[A-Z0-9]{8,15}$/;
    if (!trxRegex.test(cleanTrx)) {
      setErrorMessage("Please enter a valid bKash Transaction ID (8–15 letters or digits).");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Re-query live product database to prevent client tampering
      const { data: freshProducts, error: freshError } = await supabase
        .from("products")
        .select("id, name, price, unit, is_active")
        .in("id", cartProductIds);

      if (freshError || !freshProducts) {
        throw new Error("Failed to verify live product pricing. Please try again.");
      }

      const freshMap = new Map(freshProducts.map((p) => [String(p.id), p]));

      // Verify all items are active and build secure server-calculated snapshot
      let authoritativeTotal = 0;
      const verifiedSnapshot = [];

      for (const [id, item] of cartEntries) {
        const liveRecord = freshMap.get(id);

        if (!liveRecord || !liveRecord.is_active) {
          setErrorMessage(`"${item.qty} ${item.unit} of item #${id}" is no longer available. Please update your basket.`);
          setIsSubmitting(false);
          return;
        }

        const unit = (item.unit || "").toLowerCase();
        const normalizedQty =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? item.qty / 1000
            : item.qty;

        authoritativeTotal += normalizedQty * Number(liveRecord.price);

        verifiedSnapshot.push({
          product_id: id,
          name: liveRecord.name,
          qty: item.qty,
          unit: item.unit,
          price: Number(liveRecord.price),
        });
      }

      if (authoritativeTotal < storeSettings.minimum_order_value) {
        setErrorMessage(`Verified order total is ৳${Math.round(authoritativeTotal)}, which is below our ৳${storeSettings.minimum_order_value} minimum.`);
        setIsSubmitting(false);
        return;
      }

      // Inside handleConfirmOrder() right before checking for duplicate bKash:
    const { data: isBlocked } = await supabase
      .from('blocked_customers')
      .select('phone')
      .eq('phone', standardPhone)
      .limit(1);

    if (isBlocked && isBlocked.length > 0) {
      setErrorMessage("We are currently unable to accept delivery bookings for this phone number. Please contact customer support.");
      setIsSubmitting(false);
      return;
    }

      // 2. Reject duplicate bKash Transaction IDs
      const { data: existingTrx, error: trxCheckError } = await supabase
        .from("orders")
        .select("id")
        .eq("bkash_trx_id", cleanTrx)
        .limit(1);

      if (trxCheckError) {
        console.error("Trx check error:", trxCheckError);
      } else if (existingTrx && existingTrx.length > 0) {
        setErrorMessage("This bKash Transaction ID has already been submitted for a previous order.");
        setIsSubmitting(false);
        return;
      }

      // 3. Commit order with authoritative server-verified pricing
      const { error: insertError } = await supabase.from("orders").insert([
        {
          customer_name: cleanName,
          delivery_zone: zone,
          customer_phone: standardPhone,
          delivery_address: cleanAddress,
          bkash_trx_id: cleanTrx,
          cart_total: Math.round(authoritativeTotal),
          cart_items: verifiedSnapshot,
          order_status: "Pending",
        },
      ]);

      if (insertError) throw insertError;

      clearCart();
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Order submission failure:", err);
      setErrorMessage(err.message || "Could not complete order. Please verify your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    "w-full border border-neutral-200 rounded-xl px-4 py-3 bg-[#F0EDE6]/30 text-text text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/20 focus:border-[#2C5F2D] transition-all placeholder:text-text/40";
  const labelClass =
    "block text-[10.5px] font-bold uppercase tracking-widest text-text/50 mb-1.5";

  if (!hasMounted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2C5F2D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Success Confirmation View
  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-20 h-20 rounded-full bg-[#2C5F2D]/10 text-[#2C5F2D] flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-text mb-3">Order Confirmed!</h1>
        <p className="text-text/70 text-sm md:text-base leading-relaxed max-w-md mb-8">
          Your morning basket is scheduled. Fresh produce is sourced at <strong className="text-text">5 AM</strong> and delivered to your doorstep between{" "}
          <strong className="text-text">8 AM – 12 PM</strong>.
        </p>
        <Link
          href="/"
          className="bg-[#2C5F2D] text-white px-8 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase hover:bg-[#224A23] transition-all shadow-xs"
        >
          Back to Storefront
        </Link>
      </div>
    );
  }

  // Empty Basket View
  if (cartEntries.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-text/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="font-serif font-bold text-2xl text-text mb-2">Your basket is empty</h2>
        <p className="text-text/50 text-sm mb-6 max-w-xs">Add farm-fresh produce and groceries to schedule your morning delivery.</p>
        <Link
          href="/"
          className="bg-[#2C5F2D] text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#224A23] transition-all shadow-xs"
        >
          Browse Fresh Items
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text/50 hover:text-[#2C5F2D] transition-colors mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Produce Catalog
        </Link>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-text mb-1">Your Basket</h1>
        <p className="text-sm text-text/50 mb-8">
          {cartEntries.length} distinct item{cartEntries.length !== 1 ? "s" : ""} · Scheduled for tomorrow morning
        </p>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Items Section */}
          <section className="flex-1 w-full space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-bold tracking-widest uppercase text-text/40">Basket Items</span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            {inactiveItemsInCart.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl p-3.5 mb-2">
                One or more items in your cart are currently out of stock. Please remove them before confirming your order.
              </div>
            )}

            {cartEntries.map(([id, item]) => {
              const product = verifiedProducts[id];
              const price = product?.price ?? item.price;
              const unit = (item.unit || "kg").toLowerCase();
              const isWeight = !DISCRETE_UNITS.includes(unit);
              const normalizedQty = unit === "g" ? item.qty / 1000 : item.qty;
              const lineTotal = normalizedQty * price;
              const isOutOfStock = product && !product.is_active;

              return (
                <div
                  key={id}
                  className={`bg-white rounded-2xl border shadow-sm flex items-center gap-4 p-4 transition-colors ${
                    isOutOfStock ? "border-red-200 bg-red-50/20" : "border-neutral-100 hover:border-neutral-200"
                  }`}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F0EDE6] shrink-0 border border-neutral-100">
                    {product?.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-text truncate">
                        {product?.name || `Product #${id.slice(0, 6)}`}
                      </h3>
                      {isOutOfStock && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md shrink-0">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text/50 mt-0.5">
                      ৳{price} / {product?.unit || (isWeight ? "kg" : "unit")}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(id, item.qty, -1, item.unit, price)}
                        className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-xs font-bold text-text cursor-pointer transition-colors"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-text px-1">
                        {item.qty} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(id, item.qty, 1, item.unit, price)}
                        className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-xs font-bold text-text cursor-pointer transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-sm text-[#2C5F2D]">৳{lineTotal.toFixed(0)}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(id)}
                      className="text-text/30 hover:text-red-500 text-xs transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Financial Breakdown */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-2 mt-4">
              <div className="flex justify-between text-sm text-text/70">
                <span>Produce Subtotal</span>
                <span className="font-semibold text-text">৳{cartTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-text/70">
                <span>Delivery Booking Fee (via bKash)</span>
                <span className="font-semibold text-text">৳{DELIVERY_FEE}</span>
              </div>
              <div className="flex justify-between text-sm text-[#2C5F2D] font-medium pt-2 border-t border-neutral-100">
                <span>Due at Doorstep (Cash on Delivery)</span>
                <span className="font-bold text-base">৳{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            {!isMovReached && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl p-3 text-center">
                Add ৳{neededForMOV.toFixed(0)} more produce to meet the ৳{storeSettings.minimum_order_value} minimum order.
              </div>
            )}
          </section>

          {/* Booking Sidebar */}
          <aside className="lg:w-[360px] w-full shrink-0 sticky md:top-24">
            <form
              onSubmit={handleConfirmOrder}
              className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 space-y-4"
            >
              <div>
                <h2 className="font-serif font-bold text-xl text-text">Booking Details</h2>
                <p className="text-xs text-text/50 mt-0.5">Pay ৳{DELIVERY_FEE} delivery fee via bKash to secure slot.</p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {errorMessage}
                </div>
              )}

              {/* Bot trap field */}
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
                <label className={labelClass}>
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Delivery Zone <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="" disabled>Select delivery area</option>
                  <option value="Dhanmondi">Dhanmondi</option>
                  <option value="Mohammadpur">Mohammadpur</option>
                  <option value="Bosila">Bosila</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Mobile / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Detailed Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="House, Road, Apartment..."
                  className={fieldClass}
                />
              </div>

              {/* bKash Payment with 1-Tap Copy */}
              <div className="bg-[#2C5F2D]/5 border border-[#2C5F2D]/15 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C5F2D]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Step 1: Send ৳{DELIVERY_FEE} via bKash
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#2C5F2D]/20">
                  <span className="font-mono text-xs font-bold tracking-wider text-text">
                    {storeSettings.bkash_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBkash}
                    className="text-xs font-semibold text-[#2C5F2D] hover:underline cursor-pointer"
                  >
                    {copiedBkash ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-text/55 leading-tight">
                  Send Money ৳{DELIVERY_FEE} to lock your delivery slot. Remaining ৳{cartTotal.toFixed(0)} is paid after inspecting vegetables at your door.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Step 2: bKash Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  placeholder="e.g. BLA7X8Y9Z0"
                  className={`${fieldClass} font-mono uppercase`}
                />
              </div>

              <button
                type="submit"
                id="confirm-order-btn"
                disabled={!isMovReached || isSubmitting || isLoadingCatalog || inactiveItemsInCart.length > 0}
                className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 cursor-pointer shadow-xs ${
                  isMovReached && !isSubmitting && !isLoadingCatalog && inactiveItemsInCart.length === 0
                    ? "bg-[#2C5F2D] hover:bg-[#224A23] text-white hover:shadow-md active:scale-[0.99]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying & Booking...</span>
                  </>
                ) : (
                  "Confirm Order & Lock Slot"
                )}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}