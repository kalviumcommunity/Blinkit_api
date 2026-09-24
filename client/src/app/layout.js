import "./globals.css";
import AuthShell from "../components/AuthShell";

export const metadata = {
  title: "Blinkit Inventory Manager",
  description: "Blinkit Inventory Management Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
