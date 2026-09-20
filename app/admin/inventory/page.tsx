"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface Product {
  id: string | number;
  name: string;
  category: string;
  price: number;
  cost_price: number;
  unit: string;
  image_url: string;
  is_best_seller: boolean;
  is_active: boolean;
  created_at?: string;
}

const CATEGORIES = [
  { label: "All Categories", value: "all" },
  { label: "Vegetables", value: "vegetables" },
  { label: "Fish & Meat", value: "fish-meat" },
  { label: "Fruits", value: "fruits" },
  { label: "Spices & Dry", value: "spices" },
  { label: "Other", value: "other" },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "vegetables",
    price: "",
    cost_price: "",
    unit: "kg",
    image_url: "",
    is_best_seller: false,
    is_active: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error fetching products:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Sync preview url with cleanup
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const openNewModal = () => {
    setFormData({
      name: "",
      category: "vegetables",
      price: "",
      cost_price: "",
      unit: "kg",
      image_url: "",
      is_best_seller: false,
      is_active: true,
    });
    setImageFile(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name || "",
      category: product.category || "vegetables",
      price: String(product.price || ""),
      cost_price: String(product.cost_price || ""),
      unit: product.unit || "kg",
      image_url: product.image_url || "",
      is_best_seller: Boolean(product.is_best_seller),
      is_active: product.is_active ?? true,
    });
    setImageFile(null);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string | number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const previous = [...products];

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: nextStatus } : p))
    );

    const { error } = await supabase
      .from("products")
      .update({ is_active: nextStatus })
      .eq("id", id);

    if (error) {
      console.error("Failed to update status:", error);
      alert("Failed to change active status.");
      setProducts(previous);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to permanently delete this product?")) return;

    const previous = [...products];
    setProducts((prev) => prev.filter((p) => p.id !== id));

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      console.error("Error deleting product:", error.message);
      alert("Failed to delete product. Check table permissions.");
      setProducts(previous);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Product name is required.");

    const priceNum = parseFloat(formData.price);
    const costPriceNum = parseFloat(formData.cost_price);

    if (isNaN(priceNum) || priceNum <= 0) return alert("Please enter a valid selling price.");

    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      // Handle Image Upload
      if (imageFile) {
        setUploadProgress(true);
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(imageFile.type)) {
          throw new Error("Invalid file format. Please upload JPG, PNG, or WEBP.");
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error("Image exceeds 5MB size limit.");
        }

        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const cleanName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
        const fileName = `${cleanName}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload error: ${uploadError.message}. Check storage policies.`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      setUploadProgress(false);

      const productPayload = {
        name: formData.name.trim(),
        category: formData.category,
        price: priceNum,
        cost_price: isNaN(costPriceNum) ? 0 : costPriceNum,
        unit: formData.unit,
        image_url: finalImageUrl,
        is_best_seller: formData.is_best_seller,
        is_active: formData.is_active,
      };

      let saveError;
      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingId);
        saveError = error;
      } else {
        const { error } = await supabase.from("products").insert([productPayload]);
        saveError = error;
      }

      if (saveError) throw saveError;

      setIsModalOpen(false);
      setImageFile(null);
      fetchProducts();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  // Filter computation
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query || (product.name || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-[#23301B]">
            Inventory Management
          </h1>
          <p className="mt-2 text-base text-[#23301B]/70">
            Control product availability, cost margins, and storefront listings.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="bg-[#2C5F2D] hover:bg-[#224A23] text-white px-5 py-3 rounded-2xl shadow-xs transition-all font-semibold flex items-center gap-2 text-sm cursor-pointer shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Control Bar: Search & Categories */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name..."
            className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] transition-all text-neutral-800 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto p-1 bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? "text-[#23301B] font-bold bg-[#23301B]/10 border border-[#23301B]/20 shadow-xs"
                  : "text-neutral-500 hover:text-[#23301B] hover:bg-neutral-50 font-medium"
                  }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[#2C5F2D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-neutral-400 font-medium">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500">
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Image</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Product</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Category</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Selling Price</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Cost Margin</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest">Status</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((product) => {
                  const profitPerUnit = Number(product.price) - Number(product.cost_price || 0);
                  const isPositiveMargin = profitPerUnit >= 0;

                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-5">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px] uppercase font-bold">
                              No Img
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="font-semibold text-neutral-900 text-sm">{product.name}</div>
                        {product.is_best_seller && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                            ★ Best Seller
                          </span>
                        )}
                      </td>

                      <td className="p-5 text-sm text-neutral-600 capitalize">
                        {product.category ? product.category.replace("-", " ") : "Other"}
                      </td>

                      <td className="p-5 text-sm font-semibold text-neutral-900 whitespace-nowrap">
                        ৳{Number(product.price).toLocaleString()}{" "}
                        <span className="text-xs font-normal text-neutral-500">/ {product.unit}</span>
                      </td>

                      <td className="p-5 whitespace-nowrap text-xs">
                        <div className="text-neutral-500">Cost: ৳{Number(product.cost_price || 0).toLocaleString()}</div>
                        <div className={`font-semibold mt-0.5 ${isPositiveMargin ? "text-[#2C5F2D]" : "text-red-600"}`}>
                          Margin: {isPositiveMargin ? "+" : ""}৳{profitPerUnit.toFixed(2)}
                        </div>
                      </td>

                      <td className="p-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all ${product.is_active
                            ? "bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                            : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                            }`}
                        >
                          {product.is_active ? "In Stock (Active)" : "Out of Stock"}
                        </button>
                      </td>

                      <td className="p-5 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
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
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />

          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-neutral-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#23301B]">
                  {editingId ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="text-neutral-500 text-xs mt-1">
                  Configure pricing, cost, and imagery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-8 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deshi Tomato"
                  className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] text-neutral-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                    Category
                  </label>
                  <select
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] text-neutral-800 cursor-pointer"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fish-meat">Fish & Meat</option>
                    <option value="fruits">Fruits</option>
                    <option value="spices">Spices & Dry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                    Unit
                  </label>
                  <select
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] text-neutral-800 cursor-pointer"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="kg">per kg</option>
                    <option value="g">per 100g</option>
                    <option value="piece">per piece</option>
                    <option value="jar">per jar</option>
                    <option value="bottle">per bottle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                    Selling Price (৳)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] text-neutral-800"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                    Cost Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/30 focus:border-[#2C5F2D] text-neutral-800"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2C5F2D] focus:ring-[#2C5F2D]"
                  />
                  <span className="text-xs font-semibold text-neutral-700">
                    Product is In Stock & Active on storefront
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_best_seller}
                    onChange={(e) => setFormData({ ...formData, is_best_seller: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2C5F2D] focus:ring-[#2C5F2D]"
                  />
                  <span className="text-xs font-semibold text-neutral-700">
                    Feature as Best Seller on homepage
                  </span>
                </label>
              </div>

              {/* Image Uploader & Preview */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                    {previewUrl ? (
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    ) : formData.image_url ? (
                      <Image src={formData.image_url} alt="Current" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[9px] font-bold uppercase">
                        None
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                    className="text-xs text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#2C5F2D]/10 file:text-[#2C5F2D] hover:file:bg-[#2C5F2D]/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2C5F2D] hover:bg-[#224A23] text-white px-6 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploadProgress
                    ? "Uploading Image..."
                    : isSubmitting
                      ? "Saving Product..."
                      : editingId
                        ? "Update Product"
                        : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}