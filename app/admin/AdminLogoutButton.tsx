"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/app/login/actions";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    if (isPending) return;
    setIsPending(true);

    try {
      await logoutAdmin();
      router.refresh();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/login";
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="w-full px-5 py-2.5 text-center text-xs rounded-2xl bg-red-950/40 text-red-200 hover:bg-red-900/60 transition-colors font-medium border border-red-800/30 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
    >
      {isPending ? "Signing Out..." : "Sign Out"}
    </button>
  );
}