"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { request } from "../lib/api";

export default function Sidebar({ user }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await request('/auth/logout', { method: 'POST' });
      window.location.replace('/login');
    } catch (error) { setError(error.message); setBusy(false); }
  }
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
          {user.name[0].toUpperCase()}
        </div>

        <div>
          <strong>{user.name}</strong>

          <div className="sidebar-manager-email">
            {user.email}
          </div>
        </div>
      </div>
      <button className="auth-logout" disabled={busy} onClick={logout}>{busy ? 'Logging out…' : 'Log out'}</button>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
