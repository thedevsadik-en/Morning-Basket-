import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8F6F0]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#1E3324] text-[#F8F6F0] flex flex-col md:h-screen md:sticky md:top-0 shadow-[4px_0_30px_rgba(0,0,0,0.1)] z-20 shrink-0">
        <div className="p-7">
          <h2 className="text-2xl font-bold font-serif tracking-wide leading-tight text-[#F8F6F0]">
            Morning<br />Basket
          </h2>
          <p className="text-xs text-[#8A9A8E] tracking-wider uppercase mt-1.5 font-semibold">
            Admin Suite
          </p>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          <Link
            href="/admin"
            className="block px-4 py-2.5 rounded-xl hover:bg-[#142419] transition-all font-medium text-sm text-[#F8F6F0]/90 hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/inventory"
            className="block px-4 py-2.5 rounded-xl hover:bg-[#142419] transition-all font-medium text-sm text-[#F8F6F0]/90 hover:text-white"
          >
            Inventory
          </Link>
          <Link
            href="/admin/orders"
            className="block px-4 py-2.5 rounded-xl hover:bg-[#142419] transition-all font-medium text-sm text-[#F8F6F0]/90 hover:text-white"
          >
            Orders
          </Link>
          <Link
            href="/admin/reviews"
            className="block px-4 py-2.5 rounded-xl hover:bg-[#142419] transition-all font-medium text-sm text-[#F8F6F0]/90 hover:text-white"
          >
            Reviews
          </Link>
          <Link
            href="/admin/configuration"
            className="block px-4 py-2.5 rounded-xl hover:bg-[#142419] transition-all font-medium text-sm text-[#F8F6F0]/90 hover:text-white"
          >
            Configuration
          </Link>
        </nav>

        <div className="p-5 space-y-2.5 border-t border-white/10">
          <Link
            href="/"
            className="block px-4 py-2.5 text-center text-xs rounded-xl bg-[#142419] hover:bg-[#0E1B12] transition-colors shadow-xs font-semibold text-[#F8F6F0] uppercase tracking-wider"
          >
            Exit to Storefront →
          </Link>
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#F8F6F0] min-h-screen px-6 lg:px-10 py-8 overflow-y-auto">
        <div className="w-full max-w-[1600px] mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}