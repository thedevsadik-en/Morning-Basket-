"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Category {
  id: string;
  name: string;
}

export default function ConfigurationPage() {
  // --- Store Settings State ---
  const [bkashNumber, setBkashNumber] = useState("");
  const [minimumOrderValue, setMinimumOrderValue] = useState("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: "", type: "" });

  // --- Categories State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // --- Fetch Data ---
  useEffect(() => {
    async function fetchData() {
      // Fetch Settings
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("store_settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (settingsError) throw settingsError;
        if (settingsData) {
          setBkashNumber(settingsData.bkash_number || "");
          setMinimumOrderValue(settingsData.minimum_order_value?.toString() || "");
        }
      } catch (err: any) {
        console.error("Error fetching settings:", err.message);
        setSettingsMessage({ text: "Could not load settings.", type: "error" });
      } finally {
        setIsLoadingSettings(false);
      }

      // Fetch Categories
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        if (catError) throw catError;
        setCategories(catData || []);
      } catch (err: any) {
        console.error("Error fetching categories:", err);
        setCategoryError("Failed to load categories.");
      } finally {
        setIsLoadingCategories(false);
      }
    }
    
    fetchData();
  }, []);

  // --- Handlers ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMessage({ text: "", type: "" });

    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          bkash_number: bkashNumber,
          minimum_order_value: Number(minimumOrderValue)
        })
        .eq("id", 1);

      if (error) throw error;
      setSettingsMessage({ text: "Settings saved successfully!", type: "success" });
    } catch (err: any) {
      console.error("Error saving settings:", err.message);
      setSettingsMessage({ text: err.message || "Failed to save settings.", type: "error" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsAddingCategory(true);
    setCategoryError("");
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategory.trim() }]);

      if (error) throw error;
      setNewCategory("");
      
      // Refresh categories
      const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error adding category:", err);
      setCategoryError("Failed to add category. It might already exist.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Refresh categories
      const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error deleting category:", err);
      setCategoryError("Failed to delete category.");
    }
  };

  const fieldClass =
    "w-full border border-neutral-300 rounded-xl px-4 py-3 bg-white text-text text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F2D]/20 focus:border-[#2C5F2D] transition-all";
  const labelClass =
    "block text-xs font-bold uppercase tracking-widest text-text/50 mb-1.5";

  if (isLoadingSettings || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#2C5F2D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Configuration</h1>
        <p className="text-sm text-text/60">
          Manage your storefront settings and dynamic categories.
        </p>
      </div>

      {/* --- Store Settings Card --- */}
      <section>
        <h2 className="text-xl font-serif font-bold mb-4 text-[#2C5F2D]">Store Settings</h2>
        
        {settingsMessage.text && (
          <div
            className={`p-4 mb-4 rounded-xl text-sm font-medium ${
              settingsMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {settingsMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>bKash Number</label>
              <input
                type="text"
                required
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 01712069030"
              />
            </div>

            <div>
              <label className={labelClass}>Minimum Order Value (৳)</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={minimumOrderValue}
                onChange={(e) => setMinimumOrderValue(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 450"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${
              isSavingSettings
                ? "bg-[#23301B]/50 cursor-not-allowed"
                : "bg-[#23301B] hover:bg-black active:scale-[0.99] cursor-pointer"
            } text-[#F6F1E4]`}
          >
            {isSavingSettings ? (
              <>
                <div className="w-4 h-4 border-2 border-[#F6F1E4] border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </form>
      </section>

      {/* --- Categories Card --- */}
      <section>
        <h2 className="text-xl font-serif font-bold mb-4 text-[#2C5F2D]">Categories</h2>

        {categoryError && (
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 mb-4 rounded-xl text-sm font-medium">
            {categoryError}
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 space-y-6">
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className={labelClass}>
                New Category Name
              </label>
              <input
                type="text"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Dairy"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingCategory || !newCategory.trim()}
              className="w-full sm:w-auto bg-[#2C5F2D] hover:bg-[#1f4220] text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer h-[46px]"
            >
              {isAddingCategory ? "Adding..." : "Add"}
            </button>
          </form>

          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500">
                  <th className="p-4 font-bold text-xs uppercase tracking-widest">Category Name</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-neutral-900 text-sm">{category.name}</div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-neutral-400 font-medium text-sm">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
