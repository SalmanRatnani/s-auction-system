import type { Metadata } from "next";
import { DemoRoom } from "@/components/demo/DemoRoom";
export const metadata: Metadata = {
  title: "Interactive demo | S Auction",
  robots: { index: false, follow: false },
};
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  const initialRole =
    view === "auctioneer"
      ? "Auctioneer"
      : view === "spectator"
        ? "Spectator"
        : "Captain";
  return <DemoRoom initialRole={initialRole} />;
}
