import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S Auction System",
  description: "Realtime badminton auction — captains, controllers, viewers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="court-lines antialiased">{children}</body>
    </html>
  );
}