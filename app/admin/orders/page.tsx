"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface CartItem {
  product_id: string | number;
  qty: number;
  unit: string;
  price: number;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_zone: string;
  bkash_trx_id: string;
  cart_total: number;
  cart_items: CartItem[] | string | null;
  order_status: string | null;
}

const STATUS_OPTIONS = ['Pending', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Filters & Search
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('products').select('id, name')
      ]);

      if (ordersRes.error) {
        console.error('Error fetching orders:', ordersRes.error);
      } else {
        setOrders(ordersRes.data || []);
      }

      if (productsRes.error) {
        console.error('Error fetching products:', productsRes.error);
      } else if (productsRes.data) {
        const map: Record<string, string> = {};
        productsRes.data.forEach((p: { id: string | number; name: string }) => {
          map[String(p.id)] = p.name;
        });
        setProductsMap(map);
      }
    } catch (err) {
      console.error('Unexpected fetch failure:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    const previousOrders = [...orders];

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, order_status: newStatus } : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update status. Check your Supabase table permissions / RLS policies.');
      setOrders(previousOrders);
    }

    setUpdatingOrderId(null);
  };

  const handleCopyTrx = async (trxId: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trxId);
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = trxId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedTrxId(trxId);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Processing':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Out for Delivery':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Delivered':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const parseCartItems = (items: CartItem[] | string | null): CartItem[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === 'All' ||
        (order.order_status || 'Pending').toLowerCase() === selectedStatus.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus;

      const customerName = (order.customer_name || '').toLowerCase();
      const customerPhone = (order.customer_phone || '').toLowerCase();
      const trxId = (order.bkash_trx_id || '').toLowerCase();
      const orderId = (order.id || '').toLowerCase();

      return (
        matchesStatus &&
        (customerName.includes(query) ||
          customerPhone.includes(query) ||
          trxId.includes(query) ||
          orderId.includes(query))
      );
    });
  }, [orders, selectedStatus, searchQuery]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: orders.length };
    STATUS_OPTIONS.forEach((opt) => {
      map[opt] = orders.filter(
        (o) => (o.order_status || 'Pending').toLowerCase() === opt.toLowerCase()
      ).length;
    });
    return map;
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground">
            Orders Management
          </h1>
          <p className="mt-2 text-base text-foreground/70">
            Fulfill daily customer baskets, track deliveries, and verify payments.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone, name, TrxID..."
            className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-neutral-800 shadow-xs"
          />
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        {['All', ...STATUS_OPTIONS].map((tab) => {
          const isActive = selectedStatus.toLowerCase() === tab.toLowerCase();
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedStatus(tab)}
              className={`px-4 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                isActive
                  ? 'text-[#23301B] font-bold bg-[#23301B]/10 border border-[#23301B]/20 shadow-xs'
                  : 'text-neutral-500 hover:text-[#23301B] hover:bg-neutral-50 font-medium'
              }`}
            >
              {tab} ({counts[tab] || 0})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-16 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-16 text-center text-neutral-400 font-medium">
          No orders match the selected criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const currentStatus = order.order_status || 'Pending';
            const isUpdating = updatingOrderId === order.id;
            const parsedItems = parseCartItems(order.cart_items);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl shadow-sm p-6 md:p-8 flex flex-col lg:flex-row gap-6 border border-neutral-100 hover:border-neutral-200 transition-all"
              >
                {/* Order Details (Left Column) */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-foreground">
                        Order #{String(order.id).slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={currentStatus}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-4 py-2 border outline-none cursor-pointer appearance-none ${getStatusColor(
                          currentStatus
                        )} shadow-xs transition-all disabled:opacity-50`}
                        style={{
                          paddingRight: '2.2rem',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.6rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                        }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Customer Info */}
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                        Customer Details
                      </h4>
                      <div className="text-sm text-neutral-700 space-y-1">
                        <p className="font-semibold text-neutral-900">{order.customer_name || 'Guest User'}</p>
                        <p>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {order.customer_phone || 'No phone provided'}
                          </a>
                        </p>
                        <p className="text-xs text-neutral-600 leading-relaxed">{order.delivery_address}</p>
                        <p className="text-neutral-500 text-xs mt-1">Zone: {order.delivery_zone || 'Standard'}</p>

                        {order.bkash_trx_id && (
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs font-mono bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-200">
                              bKash: {order.bkash_trx_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTrx(order.bkash_trx_id)}
                              className="text-xs text-primary hover:underline font-medium cursor-pointer"
                            >
                              {copiedTrxId === order.bkash_trx_id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                        Total Amount
                      </h4>
                      <p className="text-3xl font-bold text-primary">
                        ৳{Number(order.cart_total || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {parsedItems.length} distinct basket items
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Purchased (Right Column) */}
                <div className="lg:w-72 xl:w-80 bg-background/50 rounded-2xl p-5 border border-neutral-200/60 shrink-0">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-3 border-b border-neutral-200 pb-2">
                    Items Purchased
                  </h4>
                  <ul className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {parsedItems.map((item, idx) => {
                      const productIdKey = String(item.product_id || '');
                      const name = productsMap[productIdKey] || `#${productIdKey.slice(0, 6)}`;

                      return (
                        <li key={idx} className="flex justify-between items-start text-xs">
                          <span className="text-neutral-700 font-medium truncate pr-2" title={name}>
                            {name}
                          </span>
                          <span className="text-neutral-900 font-semibold shrink-0">
                            {item.qty} {item.unit}
                          </span>
                        </li>
                      );
                    })}
                    {parsedItems.length === 0 && (
                      <li className="text-xs text-neutral-400 italic">No items recorded</li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}