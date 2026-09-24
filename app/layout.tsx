import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blinkit • Inventory workspace",
  description:
    "A shared inventory workspace with live stock adjustments and a manager audit trail.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
