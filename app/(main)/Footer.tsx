import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#23301B] text-[#F0EDE6] pt-16 pb-8 px-6 mt-auto">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 mb-12">
        {/* Brand */}
        <div className="col-span-1">
          <Link
            href="/"
            className="font-serif font-bold text-2xl tracking-tight block mb-4 hover:text-white transition-colors"
          >
            Morning Basket
          </Link>
          <p className="text-sm opacity-70 leading-relaxed max-w-xs">
            Farm-fresh vegetables sourced at 5 AM, triple-washed, and delivered by 9 AM in Dhanmondi.
          </p>
        </div>

        {/* Customer Support */}
        <div>
          <h3 className="font-bold uppercase tracking-wider text-[11px] mb-4 opacity-50">
            Customer Care
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a
                href="https://wa.me/8801712069030?text=Hi%20Morning%20Basket,%20I%20need%20help%20with%20an%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 hover:text-white transition-opacity flex items-center gap-1.5"
              >
                <span>WhatsApp Support</span>
                <span className="text-[10px] bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded-full border border-green-700/50">
                  Live
                </span>
              </a>
            </li>
            <li>
              <a
                href="tel:+8801712069030"
                className="opacity-80 hover:opacity-100 hover:text-white transition-opacity"
              >
                Direct Hotline
              </a>
            </li>
            <li>
              <Link
                href="/feedback"
                className="opacity-80 hover:opacity-100 hover:text-white transition-opacity"
              >
                Leave Feedback
              </Link>
            </li>
          </ul>
        </div>

        {/* Guarantees */}
        <div>
          <h3 className="font-bold uppercase tracking-wider text-[11px] mb-4 opacity-50">
            Our Guarantees
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li className="opacity-80 flex items-center gap-2">
              <span className="text-xs text-accent-green">✓</span>
              <span>Farm to Door in 4 Hours</span>
            </li>
            <li className="opacity-80 flex items-center gap-2">
              <span className="text-xs text-accent-green">✓</span>
              <span>Triple-Washed for Safety</span>
            </li>
            <li className="opacity-80 flex items-center gap-2">
              <span className="text-xs text-accent-green">✓</span>
              <span>100% Cash on Delivery</span>
            </li>
            <li className="opacity-80 flex items-center gap-2">
              <span className="text-xs text-accent-green">✓</span>
              <span>Inspect Before Paying</span>
            </li>
          </ul>
        </div>

        {/* Deliveries & Service Area */}
        <div>
          <h3 className="font-bold uppercase tracking-wider text-[11px] mb-4 opacity-50">
            Coverage Zone
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            Currently exclusively serving all sectors and residential roads across{" "}
            <span className="text-white font-medium">Dhanmondi, Dhaka</span>.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-green-300/90 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            9:00 AM Daily Morning Slot
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-50 text-center sm:text-left">
        <p>&copy; {currentYear} Morning Basket. All rights reserved.</p>
        <p>Built for daily freshness in Dhanmondi, Dhaka.</p>
      </div>
    </footer>
  );
}