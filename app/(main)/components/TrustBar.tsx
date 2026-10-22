"use client";

const PILLARS = [
  {
    title: "5 AM Dawn Sourced",
    description: "Hand-selected from wholesale hubs daily",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2.25v2.25m4.5-1.5l-1.5 1.5M7.5 3l1.5 1.5"
        />
      </svg>
    ),
  },
  {
    title: "Doorstep Refund",
    description: "Inspect at your door. Instant return if not satisfied",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    title: "100% COD Available",
    description: "Pay Cash, bKash, or Card upon delivery",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6H2.25m0 0v10.5m0-10.5h19.5m0 0v10.5m0-10.5v-.75a.75.75 0 00-.75-.75H3.75m19.5 0a60.07 60.07 0 00-15.797-2.101c-.727-.198-1.453.342-1.453 1.096V4.5M6.75 12a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0zm10.5 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm-15 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
    ),
  },
  {
    title: "Dedicated Support",
    description: "Direct morning logistics & WhatsApp support",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75v3.75a3 3 0 01-3 3h-1.5a1.5 1.5 0 01-1.5-1.5v-3.75a1.5 1.5 0 011.5-1.5H21A8.25 8.25 0 003 12h3.75a1.5 1.5 0 011.5 1.5v3.75a1.5 1.5 0 01-1.5 1.5H5.25a3 3 0 01-3-3V12z"
        />
      </svg>
    ),
  },
];

export default function TrustBar() {
  return (
    <section className="mt-8 mb-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_2px_10px_rgba(30,51,36,0.03)] hover:shadow-[0_8px_24px_rgba(30,51,36,0.07)] hover:-translate-y-0.5 transition-all duration-300 p-5 flex items-center gap-4"
          >
            {/* Circular Botanical Icon Badge */}
            <div className="w-12 h-12 rounded-xl bg-[#1E3324]/[0.05] ring-1 ring-[#1E3324]/10 text-[#1E3324] flex items-center justify-center shrink-0">
              {pillar.icon}
            </div>

            {/* Microcopy Text */}
            <div className="flex flex-col min-w-0">
              <h4 className="text-[#1E3324] font-semibold text-[15px] tracking-tight leading-snug">
                {pillar.title}
              </h4>
              <p className="text-[#5A6E5F] text-xs leading-snug mt-0.5">
                {pillar.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
