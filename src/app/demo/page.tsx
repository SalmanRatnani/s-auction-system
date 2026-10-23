import type { Metadata } from "next";
import { DemoRoom } from "@/components/demo/DemoRoom";
export const metadata: Metadata = {
  title: "Interactive demo | S Auction",
  robots: { index: false, follow: false },
};
export default function DemoPage() {
  return <DemoRoom />;
}
