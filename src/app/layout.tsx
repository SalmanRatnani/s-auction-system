import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S Auction — The team starts here",
  description: "Real-time player auctions for badminton tournaments.",
  applicationName: "S Auction System",
  manifest: "/site.webmanifest",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://s-auction-system.vercel.app",
  ),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "S Auction System",
    description: "Real-time player auctions for badminton tournaments.",
    siteName: "S Auction System",
    type: "website",
    images: [
      {
        url: "/brand/social-cover.png",
        width: 1200,
        height: 630,
        alt: "S Auction — Great teams start with a bold bid",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/social-cover.png"],
    title: "S Auction System",
    description: "Real-time player auctions for badminton tournaments.",
  },
};

export const viewport: Viewport = {
  themeColor: "#101820",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
