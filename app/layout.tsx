import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F8F6F0",
};

export const metadata: Metadata = {
  title: {
    default: "Morning Basket | Fresh Grocery & Vegetable Delivery in Dhanmondi, Dhaka",
    template: "%s | Morning Basket",
  },
  description:
    "Farm-fresh vegetables sourced at 5 AM, hand-selected, and delivered by 9 AM exclusively in Dhanmondi, Dhaka. 100% Cash on Delivery.",
  keywords: ["groceries", "fresh vegetables", "Dhanmondi delivery", "organic farm produce"],
  openGraph: {
    title: "Morning Basket | Fresh Grocery & Vegetable Delivery in Dhanmondi, Dhaka",
    description: "Farm-fresh vegetables sourced at 5 AM, hand-selected, and delivered by 9 AM exclusively in Dhanmondi, Dhaka. 100% Cash on Delivery.",
    siteName: "Morning Basket",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${playfair.variable} font-sans antialiased bg-[#F8F6F0] min-h-screen text-[#2C332D] selection:bg-[#1E3324]/10 selection:text-[#1E3324]`}
      >
        {children}
      </body>
    </html>
  );
}
