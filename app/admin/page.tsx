"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface CartItem {
  product_id: string | number;
  qty: number | string;
  unit?: string;
  price?: number | string;
}

interface Order {
  id: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  cart_total: number;
  cart_items: CartItem[] | null;
  order_status?: string | null;
}

interface Product {
  id: string | number;
  name: string;
  cost_price: number;
  is_active: boolean;
  unit?: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  created_at: string;
}

interface BlockedCustomer {
  phone: string;
  customer_name?: string;
  reason?: string;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [blockedCustomers, setBlockedCustomers] = useState<BlockedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Active Tab for Analytics View
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'today' | 'week' | 'ranking' | 'ai' | 'risk'>('today');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [ordersRes, productsRes, expensesRes, blockedRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, created_at, customer_name, customer_phone, cart_total, cart_items, order_status')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('products')
          .select('id, name, cost_price, is_active, unit'),
        supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('blocked_customers')
          .select('phone, customer_name, reason')
      ]);

      if (ordersRes.error) console.error("Orders fetch error:", ordersRes.error);
      if (productsRes.error) console.error("Products fetch error:", productsRes.error);
      if (expensesRes.error) console.error("Expenses fetch error:", expensesRes.error);

      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setExpenses(expensesRes.data || []);
      setBlockedCustomers(blockedRes.data || []);
    } catch (err) {
      console.error("Dashboard initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Product Name & Unit Quick Map
  const productMap = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();
    products.forEach((p) => {
      map.set(String(p.id), { name: p.name, unit: p.unit || "kg" });
    });
    return map;
  }, [products]);

  // Handle Expense Add
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expenseAmount);
    const cleanTitle = expenseTitle.trim();

    if (!cleanTitle || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmittingExpense(true);

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ title: cleanTitle, amount: parsedAmount }])
      .select();

    if (error) {
      console.error("Failed to log expense:", error);
      alert("Failed to log expense. Verify your database policies.");
    } else if (data && data[0]) {
      setExpenses((prev) => [data[0], ...prev]);
      setExpenseTitle("");
      setExpenseAmount("");
    }

    setIsSubmittingExpense(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    const previousExpenses = [...expenses];
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));

    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      alert("Failed to delete expense.");
      setExpenses(previousExpenses);
    }
  };

  // Toggle Customer Block
  const handleToggleBlockCustomer = async (phone: string, name?: string) => {
    const isCurrentlyBlocked = blockedCustomers.some((c) => c.phone === phone);
    const previous = [...blockedCustomers];

    if (isCurrentlyBlocked) {
      setBlockedCustomers((prev) => prev.filter((c) => c.phone !== phone));
      const { error } = await supabase.from('blocked_customers').delete().eq('phone', phone);
      if (error) {
        alert("Failed to unblock customer.");
        setBlockedCustomers(previous);
      }
    } else {
      const newEntry: BlockedCustomer = {
        phone,
        customer_name: name || "Anonymous",
        reason: "Excessive order cancellations"
      };
      setBlockedCustomers((prev) => [newEntry, ...prev]);
      const { error } = await supabase.from('blocked_customers').insert([newEntry]);
      if (error) {
        alert("Failed to block customer. Ensure the blocked_customers SQL table exists.");
        setBlockedCustomers(previous);
      }
    }
  };

  // Pure UTC GMT+6 11:00 AM cycle cutoff
  const cutoffDates = useMemo(() => {
    const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
    const dhakaNow = new Date(Date.now() + DHAKA_OFFSET_MS);

    const year = dhakaNow.getUTCFullYear();
    const month = dhakaNow.getUTCMonth();
    const date = dhakaNow.getUTCDate();
    const hour = dhakaNow.getUTCHours();

    let startDhaka: Date;
    let endDhaka: Date;

    if (hour < 11) {
      startDhaka = new Date(Date.UTC(year, month, date - 1, 11, 0, 0, 0));
      endDhaka = new Date(Date.UTC(year, month, date, 10, 59, 59, 999));
    } else {
      startDhaka = new Date(Date.UTC(year, month, date, 11, 0, 0, 0));
      endDhaka = new Date(Date.UTC(year, month, date + 1, 10, 59, 59, 999));
    }

    return {
      startUTC: new Date(startDhaka.getTime() - DHAKA_OFFSET_MS),
      endUTC: new Date(endDhaka.getTime() - DHAKA_OFFSET_MS),
    };
  }, []);

  // Standard Metrics excluding Cancelled orders
  const metrics = useMemo(() => {
    const validOrders = orders.filter(
      (o) => (o.order_status || '').trim().toLowerCase() !== 'cancelled'
    );

    const todays = validOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= cutoffDates.startUTC && orderDate <= cutoffDates.endUTC;
    });

    const sales = validOrders.reduce((sum, o) => sum + (Number(o.cart_total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const cogs = validOrders.reduce((orderSum, order) => {
      if (!Array.isArray(order.cart_items)) return orderSum;
      const itemsCogs = order.cart_items.reduce((itemSum, item) => {
        const product = products.find((p) => String(p.id) === String(item.product_id));
        const costPrice = Number(product?.cost_price) || 0;
        const rawQty = Number(item.qty) || 0;
        const unit = (item.unit || "").toLowerCase();

        const normalizedQty =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? rawQty / 1000
            : rawQty;

        return itemSum + normalizedQty * costPrice;
      }, 0);
      return orderSum + itemsCogs;
    }, 0);

    const netProfit = sales - cogs - totalExp;

    return {
      totalOrdersCount: orders.length,
      validOrdersCount: validOrders.length,
      cancelledCount: orders.length - validOrders.length,
      todaysOrdersCount: todays.length,
      totalSales: sales,
      totalExpenses: totalExp,
      netProfit,
      isProfitPositive: netProfit >= 0,
      activeInventoryCount: products.filter((p) => p.is_active).length,
    };
  }, [orders, products, expenses, cutoffDates]);

  // =========================================================================
  // 1. TODAY'S ORDERED PRODUCTS & QUANTITIES
  // =========================================================================
  const todaysProductQuantities = useMemo(() => {
    const validOrders = orders.filter(
      (o) => (o.order_status || '').trim().toLowerCase() !== 'cancelled'
    );

    const todays = validOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= cutoffDates.startUTC && orderDate <= cutoffDates.endUTC;
    });

    const summary: Record<string, { name: string; qtyKg: number; unit: string; ordersCount: number }> = {};

    todays.forEach((order) => {
      if (!Array.isArray(order.cart_items)) return;
      order.cart_items.forEach((item) => {
        const pId = String(item.product_id);
        const meta = productMap.get(pId) || { name: `Product #${pId.slice(0, 5)}`, unit: item.unit || "kg" };
        const rawQty = Number(item.qty) || 0;
        const unit = (item.unit || meta.unit || "").toLowerCase();

        const normalizedKg =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? rawQty / 1000
            : rawQty;

        if (!summary[pId]) {
          summary[pId] = {
            name: meta.name,
            qtyKg: 0,
            unit: ["piece", "pc", "jar", "bottle", "box", "packet"].includes(unit) ? unit : "kg",
            ordersCount: 0
          };
        }
        summary[pId].qtyKg += normalizedKg;
        summary[pId].ordersCount += 1;
      });
    });

    return Object.values(summary).sort((a, b) => b.qtyKg - a.qtyKg);
  }, [orders, cutoffDates, productMap]);

  // =========================================================================
  // 2. THIS WEEK'S ORDERED PRODUCTS & QUANTITIES (Rolling 7 Days)
  // =========================================================================
  const weeklyProductQuantities = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const validOrders = orders.filter((o) => {
      const isValid = (o.order_status || '').trim().toLowerCase() !== 'cancelled';
      return isValid && new Date(o.created_at) >= sevenDaysAgo;
    });

    const summary: Record<string, { name: string; qtyKg: number; unit: string; ordersCount: number }> = {};

    validOrders.forEach((order) => {
      if (!Array.isArray(order.cart_items)) return;
      order.cart_items.forEach((item) => {
        const pId = String(item.product_id);
        const meta = productMap.get(pId) || { name: `Product #${pId.slice(0, 5)}`, unit: item.unit || "kg" };
        const rawQty = Number(item.qty) || 0;
        const unit = (item.unit || meta.unit || "").toLowerCase();

        const normalizedKg =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? rawQty / 1000
            : rawQty;

        if (!summary[pId]) {
          summary[pId] = {
            name: meta.name,
            qtyKg: 0,
            unit: ["piece", "pc", "jar", "bottle", "box", "packet"].includes(unit) ? unit : "kg",
            ordersCount: 0
          };
        }
        summary[pId].qtyKg += normalizedKg;
        summary[pId].ordersCount += 1;
      });
    });

    return Object.values(summary).sort((a, b) => b.qtyKg - a.qtyKg);
  }, [orders, productMap]);

  // =========================================================================
  // 3. LAST 30 DAYS PRODUCT RANKING BASED ON TOTAL KG
  // =========================================================================
  const thirtyDayProductRanking = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const validOrders = orders.filter((o) => {
      const isValid = (o.order_status || '').trim().toLowerCase() !== 'cancelled';
      return isValid && new Date(o.created_at) >= thirtyDaysAgo;
    });

    const rankingMap: Record<
      string,
      { name: string; totalKg: number; unit: string; daysActive: Set<string>; totalOrders: number }
    > = {};

    validOrders.forEach((order) => {
      if (!Array.isArray(order.cart_items)) return;
      const dayKey = order.created_at.split('T')[0];

      order.cart_items.forEach((item) => {
        const pId = String(item.product_id);
        const meta = productMap.get(pId) || { name: `Product #${pId.slice(0, 5)}`, unit: item.unit || "kg" };
        const rawQty = Number(item.qty) || 0;
        const unit = (item.unit || meta.unit || "").toLowerCase();

        const normalizedKg =
          unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
            ? rawQty / 1000
            : rawQty;

        if (!rankingMap[pId]) {
          rankingMap[pId] = {
            name: meta.name,
            totalKg: 0,
            unit: ["piece", "pc", "jar", "bottle", "box", "packet"].includes(unit) ? unit : "kg",
            daysActive: new Set<string>(),
            totalOrders: 0
          };
        }

        rankingMap[pId].totalKg += normalizedKg;
        rankingMap[pId].daysActive.add(dayKey);
        rankingMap[pId].totalOrders += 1;
      });
    });

    return Object.values(rankingMap)
      .map((item) => ({
        ...item,
        dailyAverageKg: item.daysActive.size > 0 ? item.totalKg / 30 : 0
      }))
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [orders, productMap]);

  // =========================================================================
  // 4. SUPER INTELLIGENT CUSTOMER PREDICTIVE REPLENISHMENT ENGINE
  // =========================================================================
  const customerPredictions = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const validOrders = orders.filter((o) => {
      const isValid = (o.order_status || '').trim().toLowerCase() !== 'cancelled';
      return isValid && Boolean(o.customer_phone) && new Date(o.created_at) >= thirtyDaysAgo;
    });

    // Group orders chronologically by customer phone
    interface CustomerHistory {
      name: string;
      phone: string;
      orders: { date: Date; items: CartItem[] }[];
    }

    const customerMap: Record<string, CustomerHistory> = {};

    validOrders.forEach((o) => {
      const phone = o.customer_phone?.trim() || "";
      if (!phone) return;

      if (!customerMap[phone]) {
        customerMap[phone] = {
          name: o.customer_name || "Customer",
          phone,
          orders: []
        };
      }

      customerMap[phone].orders.push({
        date: new Date(o.created_at),
        items: Array.isArray(o.cart_items) ? o.cart_items : []
      });
    });

    interface Prediction {
      customerName: string;
      customerPhone: string;
      productName: string;
      predictedQty: string;
      confidence: number;
      cycleDays: number;
      daysSinceLast: number;
      status: 'Due Today' | 'Due in 1-2 Days' | 'Overdue Repurchase' | 'Regular Cycle';
      urgencyScore: number;
    }

    const predictions: Prediction[] = [];
    const nowMs = Date.now();

    Object.values(customerMap).forEach((customer) => {
      // Sort orders oldest to newest
      const sortedOrders = customer.orders.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Track purchase timeline per product: pId -> array of { date, qty, unit }
      const productPurchases: Record<string, { date: Date; qtyKg: number; unit: string }[]> = {};

      sortedOrders.forEach((order) => {
        order.items.forEach((item) => {
          const pId = String(item.product_id);
          const rawQty = Number(item.qty) || 0;
          const unit = (item.unit || "kg").toLowerCase();
          const normalizedKg =
            unit === "g" || unit === "gm" || unit === "gram" || unit === "grams"
              ? rawQty / 1000
              : rawQty;

          if (!productPurchases[pId]) productPurchases[pId] = [];
          productPurchases[pId].push({ date: order.date, qtyKg: normalizedKg, unit });
        });
      });

      // Analyze intervals and consumption velocity
      Object.entries(productPurchases).forEach(([pId, history]) => {
        const meta = productMap.get(pId);
        const productName = meta?.name || `Product #${pId.slice(0, 5)}`;
        const lastPurchase = history[history.length - 1];
        const daysSinceLast = Math.max(0.5, (nowMs - lastPurchase.date.getTime()) / (1000 * 60 * 60 * 24));

        let avgIntervalDays = 5; // Default replenishment anchor
        let confidence = 70;

        if (history.length >= 2) {
          // Compute true inter-purchase intervals
          const intervals: number[] = [];
          for (let i = 1; i < history.length; i++) {
            const diffDays = (history[i].date.getTime() - history[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(Math.max(1, diffDays));
          }

          avgIntervalDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          confidence = Math.min(98, Math.round(75 + history.length * 5));
        }

        // Average quantity purchased per order
        const avgQty = history.reduce((sum, h) => sum + h.qtyKg, 0) / history.length;
        const velocityRatio = daysSinceLast / avgIntervalDays;

        let status: Prediction['status'] = 'Regular Cycle';
        let urgencyScore = 1;

        if (velocityRatio >= 1.25) {
          status = 'Overdue Repurchase';
          urgencyScore = 4;
        } else if (velocityRatio >= 0.9) {
          status = 'Due Today';
          urgencyScore = 5;
        } else if (velocityRatio >= 0.75) {
          status = 'Due in 1-2 Days';
          urgencyScore = 3;
        }

        // Only surface items close to replenishment
        if (velocityRatio >= 0.7) {
          const unitStr = ["piece", "pc", "jar", "bottle", "box", "packet"].includes(lastPurchase.unit)
            ? lastPurchase.unit
            : "Kg";

          const formattedQty = unitStr === "Kg" ? `${avgQty.toFixed(1)} Kg` : `${Math.round(avgQty)} ${unitStr}`;

          predictions.push({
            customerName: customer.name,
            customerPhone: customer.phone,
            productName,
            predictedQty: formattedQty,
            confidence,
            cycleDays: Math.round(avgIntervalDays),
            daysSinceLast: Math.round(daysSinceLast),
            status,
            urgencyScore
          });
        }
      });
    });

    return predictions.sort((a, b) => b.urgencyScore - a.urgencyScore || b.confidence - a.confidence).slice(0, 15);
  }, [orders, productMap]);

  // =========================================================================
  // 5. SERIAL CANCELLATION RISK & CUSTOMER BLOCKER
  // =========================================================================
  const serialCancellers = useMemo(() => {
    const customerStats: Record<
      string,
      { name: string; phone: string; totalOrders: number; cancelledOrders: number; totalLoss: number }
    > = {};

    orders.forEach((o) => {
      const phone = o.customer_phone?.trim() || "";
      if (!phone) return;

      if (!customerStats[phone]) {
        customerStats[phone] = {
          name: o.customer_name || "Customer",
          phone,
          totalOrders: 0,
          cancelledOrders: 0,
          totalLoss: 0
        };
      }

      customerStats[phone].totalOrders += 1;

      if ((o.order_status || '').trim().toLowerCase() === 'cancelled') {
        customerStats[phone].cancelledOrders += 1;
        customerStats[phone].totalLoss += Number(o.cart_total) || 0;
      }
    });

    return Object.values(customerStats)
      .filter((c) => c.cancelledOrders > 0)
      .map((c) => ({
        ...c,
        cancellationRate: Math.round((c.cancelledOrders / c.totalOrders) * 100),
        isBlocked: blockedCustomers.some((b) => b.phone === c.phone)
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss || b.cancelledOrders - a.cancelledOrders);
  }, [orders, blockedCustomers]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-[#2C5F2D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24">
      {/* Header */}
      <header>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-[#23301B]">
          Morning Basket ERP
        </h1>
        <p className="mt-2 text-base opacity-75 text-[#23301B]">
          Real-time operations, inventory velocity, AI predictions &amp; customer risk analytics.
        </p>
      </header>

      {/* Main Financial Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Total Orders</h3>
          <p className="mt-3 text-3xl font-bold text-[#23301B]">{metrics.validOrdersCount}</p>
          <div className="mt-2.5 flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 w-fit px-2.5 py-0.5 rounded-full">
            {metrics.cancelledCount > 0 ? `${metrics.cancelledCount} Cancelled` : 'Lifetime Active'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Today&apos;s Orders</h3>
          <p className="mt-3 text-3xl font-bold text-[#2C5F2D]">{metrics.todaysOrdersCount}</p>
          <div className="mt-2.5 flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 w-fit px-2.5 py-0.5 rounded-full">
            Cycle (11 AM - 11 AM)
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Gross Sales</h3>
          <p className="mt-3 text-3xl font-bold text-[#23301B]">৳{metrics.totalSales.toLocaleString()}</p>
          <div className="mt-2.5 flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 w-fit px-2.5 py-0.5 rounded-full">
            Net Revenue
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Net Profit</h3>
          <p className={`mt-3 text-3xl font-bold ${metrics.isProfitPositive ? 'text-[#2C5F2D]' : 'text-red-600'}`}>
            ৳{metrics.netProfit.toLocaleString()}
          </p>
          <div className={`mt-2.5 flex items-center text-[11px] font-semibold w-fit px-2.5 py-0.5 rounded-full ${metrics.isProfitPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
            Sales - COGS - Exp
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 col-span-2 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Active Inventory</h3>
          <p className="mt-3 text-3xl font-bold text-[#23301B]">{metrics.activeInventoryCount}</p>
          <div className="mt-2.5 flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 w-fit px-2.5 py-0.5 rounded-full">
            Listed Products
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5 ADVANCED OPERATIONAL MODULES (CHARTS, PREDICTIONS & BLOCKER) */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#23301B]">Intelligence &amp; Operations Center</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Live consumption tracking, 30-day rankings, automated AI customer forecasting &amp; risk control.
            </p>
          </div>

          {/* Module Selector Pill Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-100 rounded-2xl">
            {[
              { id: 'today', label: "Today's Harvest", badge: todaysProductQuantities.length },
              { id: 'week', label: '7-Day Volume', badge: weeklyProductQuantities.length },
              { id: 'ranking', label: '30-Day KG Ranking', badge: thirtyDayProductRanking.length },
              { id: 'ai', label: 'AI Replenishment', badge: customerPredictions.length },
              { id: 'risk', label: 'Cancellation Risk', badge: serialCancellers.length }
            ].map((tab) => {
              const isActive = activeAnalyticsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveAnalyticsTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#23301B] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. TODAY'S ORDERED PRODUCTS CHART */}
        {activeAnalyticsTab === 'today' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-xs text-neutral-500">
              <span>Ordered in current 11:00 AM cycle cutoff</span>
              <span className="font-semibold text-[#2C5F2D]">{todaysProductQuantities.length} unique items ordered today</span>
            </div>

            {todaysProductQuantities.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium border border-dashed border-neutral-200 rounded-2xl">
                No produce has been ordered yet in today&apos;s cycle.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todaysProductQuantities.map((item, idx) => {
                  const maxQty = todaysProductQuantities[0]?.qtyKg || 1;
                  const percent = Math.min(100, Math.round((item.qtyKg / maxQty) * 100));

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-2">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-[#23301B]">{item.name}</span>
                        <span className="text-[#2C5F2D] font-bold">
                          {item.unit === "kg" ? `${item.qtyKg.toFixed(1)} Kg` : `${item.qtyKg} ${item.unit}`}
                        </span>
                      </div>

                      {/* SVG/Tailwind Progress Meter */}
                      <div className="w-full bg-neutral-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2C5F2D] rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>Rank #{idx + 1} today</span>
                        <span>Across {item.ordersCount} customer baskets</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. THIS WEEK'S ORDERED PRODUCTS CHART */}
        {activeAnalyticsTab === 'week' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-xs text-neutral-500">
              <span>Cumulative quantities over the last 7 rolling days</span>
              <span className="font-semibold text-[#2C5F2D]">{weeklyProductQuantities.length} active weekly items</span>
            </div>

            {weeklyProductQuantities.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium border border-dashed border-neutral-200 rounded-2xl">
                No completed orders recorded over the last 7 days.
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyProductQuantities.map((item, idx) => {
                  const maxWeekly = weeklyProductQuantities[0]?.qtyKg || 1;
                  const percent = Math.min(100, Math.round((item.qtyKg / maxWeekly) * 100));

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="w-full md:w-56 shrink-0">
                        <div className="text-sm font-semibold text-[#23301B] truncate">{item.name}</div>
                        <div className="text-[11px] text-neutral-400">{item.ordersCount} orders this week</div>
                      </div>

                      <div className="flex-1 w-full bg-neutral-200/80 h-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#23301B] rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-sm text-[#2C5F2D] shrink-0">
                        {item.unit === "kg" ? `${item.qtyKg.toFixed(1)} Kg` : `${item.qtyKg} ${item.unit}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. 30-DAY PRODUCT RANKING BY KG PURCHASE */}
        {activeAnalyticsTab === 'ranking' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-xs text-neutral-500">
              <span>All-time monthly leaderboard sorted by total KG throughput</span>
              <span className="font-semibold text-[#23301B]">Top 30-Day Volume</span>
            </div>

            {thirtyDayProductRanking.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium border border-dashed border-neutral-200 rounded-2xl">
                No orders recorded over the last 30 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Produce Name</th>
                      <th className="py-3 px-3">Total Volume (30D)</th>
                      <th className="py-3 px-3">Daily Avg Demand</th>
                      <th className="py-3 px-3">Active Order Days</th>
                      <th className="py-3 px-3 text-right">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {thirtyDayProductRanking.map((item, idx) => {
                      const topVolume = thirtyDayProductRanking[0]?.totalKg || 1;
                      const sharePercent = Math.round((item.totalKg / topVolume) * 100);

                      return (
                        <tr key={idx} className="hover:bg-neutral-50/80 transition-colors font-medium">
                          <td className="py-3 px-3">
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[11px] ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-neutral-200 text-neutral-700' : idx === 2 ? 'bg-amber-700/10 text-amber-900' : 'text-neutral-400'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neutral-900 font-semibold">{item.name}</td>
                          <td className="py-3 px-3 font-bold text-[#2C5F2D]">
                            {item.unit === "kg" ? `${item.totalKg.toFixed(1)} Kg` : `${item.totalKg} ${item.unit}`}
                          </td>
                          <td className="py-3 px-3 text-neutral-600">
                            {item.unit === "kg" ? `${item.dailyAverageKg.toFixed(2)} Kg/day` : `${(item.totalKg / 30).toFixed(1)} ${item.unit}/day`}
                          </td>
                          <td className="py-3 px-3 text-neutral-500">
                            {item.daysActive.size} of 30 days ({item.totalOrders} baskets)
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-neutral-500 font-mono text-[11px]">{sharePercent}%</span>
                              <div className="w-16 bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#2C5F2D] h-full rounded-full" style={{ width: `${sharePercent}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. AI CUSTOMER PREDICTIVE REPLENISHMENT BOX */}
        {activeAnalyticsTab === 'ai' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-neutral-500">
              <p>
                Algorithmic purchase interval analysis: predicts what each customer is about to run out of based on their 30-day velocity.
              </p>
              <span className="font-bold text-[#2C5F2D] bg-[#2C5F2D]/10 px-2.5 py-1 rounded-full shrink-0">
                1-Tap WhatsApp Prompts Ready
              </span>
            </div>

            {customerPredictions.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium border border-dashed border-neutral-200 rounded-2xl">
                Need at least 2 repeat orders to compute customer consumption velocity.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerPredictions.map((pred, idx) => {
                  const encodedMsg = encodeURIComponent(
                    `Hello ${pred.customerName}, your fresh ${pred.productName} from Morning Basket is estimated to run out around now! Would you like us to deliver ${pred.predictedQty} fresh at 9 AM tomorrow?`
                  );

                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-[#23301B]">{pred.customerName}</h4>
                            <p className="text-xs text-neutral-500 font-mono">{pred.customerPhone}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            pred.status === 'Due Today'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pred.status === 'Overdue Repurchase'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {pred.status}
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-neutral-100 space-y-1">
                          <div className="text-xs text-neutral-400 font-medium">Predicted Item &amp; Restock Qty:</div>
                          <div className="text-sm font-bold text-[#2C5F2D]">
                            {pred.productName} &rarr; {pred.predictedQty}
                          </div>
                          <div className="text-[11px] text-neutral-500 flex justify-between pt-1 border-t border-neutral-100">
                            <span>Every ~{pred.cycleDays} days cycle</span>
                            <span className="font-semibold text-neutral-700">{pred.confidence}% Match</span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Tap WhatsApp Customer Engagement */}
                      <a
                        href={`https://wa.me/${pred.customerPhone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-[#23301B] hover:bg-[#2C5F2D] text-white rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Prompt on WhatsApp</span>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.947 2.801.947 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                        </svg>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. CANCELLATION RISK & MANUAL BLOCKED CUSTOMERS BOX */}
        {activeAnalyticsTab === 'risk' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-neutral-500">
              <p>
                Identifies serial cancellers driving operational and food-waste losses. Block abusive numbers with 1 tap.
              </p>
              <span className="font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                {blockedCustomers.length} Numbers Currently Blocked
              </span>
            </div>

            {serialCancellers.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium border border-dashed border-neutral-200 rounded-2xl">
                No customer order cancellations recorded in the database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Mobile Number</th>
                      <th className="py-3 px-3">Cancelled Orders</th>
                      <th className="py-3 px-3">Cancellation Rate</th>
                      <th className="py-3 px-3">Total Lost Revenue</th>
                      <th className="py-3 px-3 text-right">Access Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {serialCancellers.map((customer, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-neutral-900">{customer.name}</td>
                        <td className="py-3 px-3 font-mono text-neutral-600">{customer.phone}</td>
                        <td className="py-3 px-3 font-bold text-red-600">
                          {customer.cancelledOrders} of {customer.totalOrders}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            customer.cancellationRate >= 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {customer.cancellationRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-neutral-900">
                          ৳{customer.totalLoss.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleBlockCustomer(customer.phone, customer.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                              customer.isBlocked
                                ? 'bg-neutral-800 hover:bg-neutral-900 text-white'
                                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                            }`}
                          >
                            {customer.isBlocked ? 'Unblock Phone' : 'Block Customer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Expenses & Logs Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
        {/* Log Expense Form */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-xl font-serif font-bold text-[#23301B] mb-6">Log Operational Expense</h2>
          <form onSubmit={handleLogExpense} className="space-y-4">
            <div>
              <label htmlFor="expTitle" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                Expense Title
              </label>
              <input
                id="expTitle"
                type="text"
                required
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="e.g. Delivery packaging, ice bags, transport"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] transition-all text-neutral-800"
              />
            </div>
            <div>
              <label htmlFor="expAmount" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                Amount (৳)
              </label>
              <input
                id="expAmount"
                type="number"
                required
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] transition-all text-neutral-800"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingExpense}
              className="w-full bg-[#23301B] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#2C5F2D] transition-colors disabled:opacity-50 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmittingExpense ? 'Recording...' : 'Record Expense'}
            </button>
          </form>
        </div>

        {/* Recent Expenses List with Delete Ability */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col">
          <h2 className="text-xl font-serif font-bold text-[#23301B] mb-6">Recent Expenses</h2>
          <div className="flex-1 overflow-y-auto max-h-[260px] pr-2 space-y-3">
            {expenses.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">No expenses logged yet.</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-4 bg-[#F6F1E4]/30 rounded-xl border border-neutral-100 group">
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm">{expense.title}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(expense.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-red-600">
                      -৳{Number(expense.amount).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-neutral-400 hover:text-red-600 text-xs font-semibold p-1 transition-colors"
                      title="Delete expense"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}