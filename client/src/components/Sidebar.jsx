"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/products",
      label: "All Stocks",
    },
    {
      href: "/stock-update",
      label: "Update Stock",
    },
    {
      href: "/inventory-logs",
      label: "Inventory Logs",
    },
    {
      href: "/categories",
      label: "Categories",
    },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div>
        <div className="sidebar-logo">
          blink<span>it</span>
        </div>

        <div className="sidebar-subtitle">
          Inventory Manager
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${
                isActive ? "active" : ""
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Manager */}
      <div className="sidebar-manager">
        <div className="sidebar-avatar">
          M
        </div>

        <div>
          <strong>Manager</strong>

          <div className="sidebar-manager-email">
            manager@blinkit.com
          </div>
        </div>
      </div>
    </aside>
  );
}