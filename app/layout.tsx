import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: "Morning Basket | Fresh Vegetables Delivered Daily",
    template: "%s | Morning Basket",
  },
  description:
    "Farm-fresh vegetables sourced at 5 AM, delivered by 9 AM across Dhanmondi.",
  keywords: ["groceries", "fresh vegetables", "Dhanmondi delivery", "organic farm produce"],
  openGraph: {
    title: "Morning Basket",
    description: "Farm-fresh vegetables sourced at 5 AM, delivered by 9 AM in Dhanmondi.",
    siteName: "Morning Basket",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
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
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-background min-h-screen text-foreground selection:bg-emerald-100 selection:text-emerald-900`}
      >
        {children}
      </body>
    </html>
  );
}
