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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([
    { label: "All Categories", value: "all" },
  ]);
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
    category: "",
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
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (!catError && catData) {
        const catOptions = catData.map((c: any) => ({
          label: c.name,
          value: c.name.toLowerCase(),
        }));
        setCategories([{ label: "All Categories", value: "all" }, ...catOptions]);
      }

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
      category: categories.length > 1 ? categories[1].value : "other",
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
      category: product.category || (categories.length > 1 ? categories[1].value : "other"),
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#EAE6DF] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1E3324]">
            Harvest &amp; Produce Inventory
          </h1>
          <p className="mt-1 text-xs text-[#5A6E5F]">
            Direct catalog control for daily 5 AM dawn sourcing, cost margins &amp; storefront listings.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] px-5 py-3 rounded-xl shadow-xs transition-all font-semibold flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer shrink-0 active:scale-[0.99]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
          Add New Product
        </button>
      </div>

      {/* Control Bar: Search & Category Chips */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search produce name..."
            className="w-full bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl px-4 py-2.5 text-xs text-[#1E3324] placeholder-[#8A9A8E] focus:bg-white focus:border-[#1E3324] focus:ring-2 focus:ring-[#1E3324]/10 transition-all outline-none"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto pb-1">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#FAF9F6] border border-[#EAE6DF] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E3324] focus:bg-white focus:border-[#1E3324] transition-all outline-none cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <span className="text-xs text-[#7A8C7E] px-2 whitespace-nowrap">
            {filteredProducts.length} of {products.length} SKUs
          </span>
        </div>
      </div>

      {/* Eyris-Style Polished Table */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_4px_20px_-4px_rgba(30,51,36,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#7A8C7E] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#1E3324] border-t-transparent rounded-full animate-spin mb-3" />
            Loading Inventory Catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#7A8C7E]">
            No produce items match the current search or category filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EDE6] bg-[#FAF9F6] text-[10.5px] font-bold uppercase tracking-wider text-[#7A8C7E]">
                  <th className="py-3.5 px-5">Image</th>
                  <th className="py-3.5 px-5">Produce Name</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Store Price</th>
                  <th className="py-3.5 px-5">Wholesale Cost &amp; Margin</th>
                  <th className="py-3.5 px-5">Storefront Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6] text-xs">
                {filteredProducts.map((product) => {
                  const profitPerUnit = Number(product.price) - Number(product.cost_price || 0);
                  const isPositiveMargin = profitPerUnit >= 0;

                  return (
                    <tr key={product.id} className="hover:bg-[#FAF9F6] transition-colors">
                      {/* Image Thumbnail */}
                      <td className="py-3.5 px-5">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#FAF8F5] border border-[#EAE6DF] shrink-0 flex items-center justify-center">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[#8A9A8E] text-[9px] uppercase font-bold">
                              No Img
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name & Badge */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-[#1E3324] text-sm">{product.name}</div>
                        {product.is_best_seller && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 mt-1">
                            ★ Dawn Best Seller
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-5 text-[#5A6E5F] capitalize">
                        {product.category ? product.category.replace("-", " ") : "Vegetables"}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-5 font-serif font-bold text-sm text-[#1E3324] whitespace-nowrap">
                        ৳{Number(product.price).toLocaleString()}{" "}
                        <span className="text-xs font-normal font-sans text-[#7A8C7E]">
                          / {product.unit}
                        </span>
                      </td>

                      {/* Cost & Margin */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-xs">
                        <div className="text-[#7A8C7E]">
                          Cost: ৳{Number(product.cost_price || 0).toLocaleString()}
                        </div>
                        <div
                          className={`font-semibold mt-0.5 ${
                            isPositiveMargin ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          Margin: {isPositiveMargin ? "+" : ""}৳{profitPerUnit.toFixed(2)}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                            product.is_active
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : "bg-[#FAF9F6] text-[#7A8C7E] border-[#EAE6DF] hover:bg-[#F2EFE8]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              product.is_active ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                            }`}
                          />
                          {product.is_active ? "Listed (Active)" : "Out of Stock"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E3324] bg-[#1E3324]/5 hover:bg-[#1E3324]/10 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
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

          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-[#EAE6DF]">
            <div className="px-8 py-6 border-b border-[#F0EDE6] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#1E3324]">
                  {editingId ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="text-[#7A8C7E] text-xs mt-1">
                  Configure wholesale cost, selling rate, and imagery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#8A9A8E] hover:text-[#1E3324] text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-8 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                  Product Name <span className="text-emerald-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deshi Tomato"
                  className="w-full border border-[#EAE6DF] rounded-xl px-4 py-2.5 bg-[#FAF9F6] text-sm text-[#1E3324] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                    Category
                  </label>
                  <select
                    className="w-full border border-[#EAE6DF] rounded-xl px-4 py-2.5 bg-[#FAF9F6] text-sm text-[#1E3324] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all cursor-pointer"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories
                      .filter((c) => c.value !== "all")
                      .map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                    Unit
                  </label>
                  <select
                    className="w-full border border-[#EAE6DF] rounded-xl px-4 py-2.5 bg-[#FAF9F6] text-sm text-[#1E3324] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all cursor-pointer"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                    Selling Price (৳) <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-[#EAE6DF] rounded-xl px-4 py-2.5 bg-[#FAF9F6] text-sm text-[#1E3324] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                    Cost Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-[#EAE6DF] rounded-xl px-4 py-2.5 bg-[#FAF9F6] text-sm text-[#1E3324] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3324]/10 focus:border-[#1E3324] transition-all"
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
                    className="w-4 h-4 rounded text-[#1E3324] focus:ring-[#1E3324]"
                  />
                  <span className="text-xs font-semibold text-[#1E3324]">
                    Product is In Stock &amp; Active on storefront
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_best_seller}
                    onChange={(e) => setFormData({ ...formData, is_best_seller: e.target.checked })}
                    className="w-4 h-4 rounded text-[#1E3324] focus:ring-[#1E3324]"
                  />
                  <span className="text-xs font-semibold text-[#1E3324]">
                    Feature as Best Seller on homepage
                  </span>
                </label>
              </div>

              {/* Image Uploader & Preview */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E3324] mb-1.5">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] overflow-hidden shrink-0 flex items-center justify-center">
                    {previewUrl ? (
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    ) : formData.image_url ? (
                      <Image src={formData.image_url} alt="Current" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8A9A8E] text-[9px] font-bold uppercase">
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
                    className="text-xs text-[#5A6E5F] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3324]/10 file:text-[#1E3324] hover:file:bg-[#1E3324]/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-[#F0EDE6]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs text-[#5A6E5F] hover:bg-[#FAF9F6] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1E3324] hover:bg-[#142419] text-[#F8F6F0] px-6 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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