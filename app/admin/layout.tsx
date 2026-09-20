import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F6F1E4]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#23301B] text-[#F6F1E4] flex flex-col md:h-screen md:sticky md:top-0 shadow-[4px_0_30px_rgba(0,0,0,0.15)] z-20 shrink-0">
        <div className="p-8">
          <h2 className="text-2xl font-bold font-serif tracking-wide leading-tight">
            Morning<br />Basket
          </h2>
          <p className="text-sm opacity-70 mt-2">Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
          <Link
            href="/admin"
            className="block px-5 py-3 rounded-2xl hover:bg-[#324527] transition-all duration-300 font-medium opacity-90 hover:opacity-100"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/inventory"
            className="block px-5 py-3 rounded-2xl hover:bg-[#324527] transition-all duration-300 font-medium opacity-90 hover:opacity-100"
          >
            Inventory
          </Link>
          <Link
            href="/admin/orders"
            className="block px-5 py-3 rounded-2xl hover:bg-[#324527] transition-all duration-300 font-medium opacity-90 hover:opacity-100"
          >
            Orders
          </Link>
          <Link
            href="/admin/reviews"
            className="block px-5 py-3 rounded-2xl hover:bg-[#324527] transition-all duration-300 font-medium opacity-90 hover:opacity-100"
          >
            Reviews
          </Link>
        </nav>

        <div className="p-6 space-y-3 border-t border-[#324527]/40">
          <Link
            href="/"
            className="block px-5 py-3 text-center text-sm rounded-2xl bg-[#324527] hover:bg-[#435c34] transition-colors shadow-sm font-medium"
          >
            Exit to Store
          </Link>
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-14 text-[#23301B] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}