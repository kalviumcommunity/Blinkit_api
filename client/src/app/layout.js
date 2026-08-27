import "./globals.css";

export const metadata = {
  title: "Blinkit Inventory Manager",
  description: "Blinkit Inventory Management Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}