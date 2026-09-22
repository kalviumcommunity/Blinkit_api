"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProducts, getInventoryLogs, updateStock } from "../../lib/api";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [productsData, logsData] = await Promise.all([
        getProducts(),
        getInventoryLogs(),
      ]);

      setProducts(productsData);
      setLogs(logsData);
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStock(productId, change) {
    const oldProducts = [...products];

    // Prevent negative stock in UI
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    if (product.stock + change < 0) {
      setMessage("Stock cannot be negative.");
      return;
    }

    // Optimistic update
    setProducts((current) =>
      current.map((p) =>
        p.id === productId
          ? { ...p, stock: p.stock + change }
          : p
      )
    );

    setUpdatingId(productId);
    setMessage("");

    try {
      const result = await updateStock(productId, change);

      // Use actual database response
      setProducts((current) =>
        current.map((p) =>
          p.id === productId ? result.product : p
        )
      );

      // Reload logs so dashboard stays current
      const updatedLogs = await getInventoryLogs();
      setLogs(updatedLogs);

      setMessage(
        `${result.product.name} stock updated successfully.`
      );
    } catch (error) {
      console.error(error);

      // Rollback optimistic update
      setProducts(oldProducts);

      setMessage(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) => product.stock > 0 && product.stock <= 10
  );

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  );

  /*
   * Last 7 stock movements.
   * Positive changes = increased
   * Negative changes = decreased
   */
  const movementData = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const key = date.toISOString().slice(0, 10);

      days.push({
        key,
        label: date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        increased: 0,
        decreased: 0,
      });
    }

    logs.forEach((log) => {
      if (!log.createdAt) return;

      const date = new Date(log.createdAt);
      const key = date.toISOString().slice(0, 10);

      const day = days.find((item) => item.key === key);

      if (!day) return;

      if (Number(log.change) > 0) {
        day.increased += Number(log.change);
      } else {
        day.decreased += Math.abs(Number(log.change));
      }
    });

    return days;
  }, [logs]);

  const maxMovement = Math.max(
    1,
    ...movementData.map((day) =>
      Math.max(day.increased, day.decreased)
    )
  );

  if (loading) {
    return (
      <main style={styles.loading}>
        <h2>Loading inventory...</h2>
      </main>
    );
  }

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logo}>
            blink<span>it</span>
          </div>

          <div style={styles.subtitle}>
            Inventory Manager
          </div>
        </div>

        <nav style={styles.nav}>
          <Link
            href="/dashboard"
            style={{
              ...styles.navItem,
              ...styles.activeNavItem,
            }}
          >
            Dashboard
          </Link>

          <Link href="/products" style={styles.navItem}>
            All Stocks
          </Link>

          <Link href="/stock-update" style={styles.navItem}>
            Update Stock
          </Link>

          <Link
            href="/inventory-logs"
            style={styles.navItem}
          >
            Inventory Logs
          </Link>

          <Link href="/categories" style={styles.navItem}>
            Categories
          </Link>
        </nav>

        <div style={styles.managerBox}>
          <div style={styles.avatar}>M</div>

          <div>
            <strong>Manager</strong>
            <div style={styles.managerEmail}>
              manager@blinkit.com
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>
              Inventory Overview
            </h1>

            <p style={styles.description}>
              Overview of inventory and stock movement
            </p>
          </div>

          <button
            onClick={loadDashboard}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </header>

        {/* Message */}
        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {/* Summary cards */}
        <section style={styles.cards}>
          <SummaryCard
            title="Total Products"
            value={totalProducts}
            description="products"
          />

          <SummaryCard
            title="Total Stock"
            value={totalStock.toLocaleString()}
            description="units"
          />

          <SummaryCard
            title="Low Stock Items"
            value={lowStockProducts.length}
            description="products"
          />

          <SummaryCard
            title="Out of Stock"
            value={outOfStockProducts.length}
            description="products"
          />
        </section>

        {/* Movement + quick info */}
        <section style={styles.middleGrid}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>
                  Stock Movement
                </h2>

                <p style={styles.panelDescription}>
                  Last 7 days
                </p>
              </div>

              <div style={styles.legend}>
                <span>
                  <i
                    style={{
                      ...styles.legendDot,
                      background: "#159447",
                    }}
                  />
                  Increased
                </span>

                <span>
                  <i
                    style={{
                      ...styles.legendDot,
                      background: "#dc2626",
                    }}
                  />
                  Decreased
                </span>
              </div>
            </div>

            <div style={styles.chart}>
              {movementData.map((day) => (
                <div
                  key={day.key}
                  style={styles.chartColumn}
                >
                  <div style={styles.bars}>
                    <div
                      title={`Increased: ${day.increased}`}
                      style={{
                        ...styles.bar,
                        height: `${Math.max(
                          4,
                          (day.increased / maxMovement) * 140
                        )}px`,
                        background: "#159447",
                      }}
                    />

                    <div
                      title={`Decreased: ${day.decreased}`}
                      style={{
                        ...styles.bar,
                        height: `${Math.max(
                          4,
                          (day.decreased / maxMovement) * 140
                        )}px`,
                        background: "#dc2626",
                      }}
                    />
                  </div>

                  <span style={styles.chartLabel}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>
              Quick Summary
            </h2>

            <div style={styles.summaryList}>
              <div style={styles.summaryRow}>
                <span>Recent stock changes</span>
                <strong>{logs.length}</strong>
              </div>

              <div style={styles.summaryRow}>
                <span>Low stock products</span>
                <strong>{lowStockProducts.length}</strong>
              </div>

              <div style={styles.summaryRow}>
                <span>Out of stock</span>
                <strong>{outOfStockProducts.length}</strong>
              </div>

              <div style={styles.summaryRow}>
                <span>Total units</span>
                <strong>{totalStock}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Low stock table */}
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>
                Top Low Stock Products
              </h2>

              <p style={styles.panelDescription}>
                Products that need attention
              </p>
            </div>

            <Link
              href="/products"
              style={styles.viewAll}
            >
              View all →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div style={styles.empty}>
              No low stock products.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Current Stock</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Update</th>
                  </tr>
                </thead>

                <tbody>
                  {lowStockProducts
                    .slice(0, 5)
                    .map((product, index) => (
                      <tr key={product.id}>
                        <td style={styles.td}>
                          {index + 1}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {product.name}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {product.category}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            fontWeight: "700",
                            color:
                              product.stock === 0
                                ? "#dc2626"
                                : "#e87500",
                          }}
                        >
                          {product.stock} units
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              background:
                                product.stock === 0
                                  ? "#fee2e2"
                                  : "#fff0dc",
                              color:
                                product.stock === 0
                                  ? "#dc2626"
                                  : "#e87500",
                            }}
                          >
                            {product.stock === 0
                              ? "Out of Stock"
                              : "Low Stock"}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <button
                            disabled={
                              updatingId === product.id
                            }
                            onClick={() =>
                              changeStock(
                                product.id,
                                10
                              )
                            }
                            style={styles.updateButton}
                          >
                            +10
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* All products */}
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>
                All Products
              </h2>

              <p style={styles.panelDescription}>
                Update stock directly
              </p>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td style={styles.td}>
                      <strong>{product.name}</strong>
                    </td>

                    <td style={styles.td}>
                      {product.category}
                    </td>

                    <td style={styles.td}>
                      ₹{product.price}
                    </td>

                    <td style={styles.td}>
                      <strong>{product.stock}</strong>
                    </td>

                    <td style={styles.td}>
                      <button
                        disabled={
                          updatingId === product.id ||
                          product.stock <= 0
                        }
                        onClick={() =>
                          changeStock(
                            product.id,
                            -1
                          )
                        }
                        style={styles.stockButton}
                      >
                        −1
                      </button>

                      <button
                        disabled={
                          updatingId === product.id
                        }
                        onClick={() =>
                          changeStock(
                            product.id,
                            1
                          )
                        }
                        style={styles.stockButton}
                      >
                        +1
                      </button>

                      <button
                        disabled={
                          updatingId === product.id ||
                          product.stock < 10
                        }
                        onClick={() =>
                          changeStock(
                            product.id,
                            -10
                          )
                        }
                        style={styles.stockButton}
                      >
                        −10
                      </button>

                      <button
                        disabled={
                          updatingId === product.id
                        }
                        onClick={() =>
                          changeStock(
                            product.id,
                            10
                          )
                        }
                        style={styles.stockButton}
                      >
                        +10
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}


/* ---------------- Components ---------------- */

function SummaryCard({
  title,
  value,
  description,
}) {
  return (
    <div style={styles.card}>
      <p style={styles.cardTitle}>{title}</p>

      <strong style={styles.cardValue}>
        {value}
      </strong>

      <span style={styles.cardDescription}>
        {description}
      </span>
    </div>
  );
}


/* ---------------- Styles ---------------- */

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f7f8f7",
    color: "#172033",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  sidebar: {
    width: "235px",
    minHeight: "100vh",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: "28px 18px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    alignSelf: "flex-start",
  },

  logo: {
    fontSize: "36px",
    fontWeight: "800",
    letterSpacing: "-2px",
  },

  subtitle: {
    marginTop: "4px",
    color: "#687184",
    fontSize: "14px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "45px",
  },

  navItem: {
    padding: "12px 14px",
    borderRadius: "8px",
    color: "#303846",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "600",
  },

  activeNavItem: {
    background: "#e9f7ed",
    color: "#168b45",
  },

  managerBox: {
    marginTop: "auto",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#159447",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  managerEmail: {
    marginTop: "3px",
    color: "#7b8494",
    fontSize: "11px",
  },

  main: {
    flex: 1,
    padding: "32px",
    maxWidth: "1500px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "26px",
  },

  heading: {
    margin: 0,
    fontSize: "30px",
    letterSpacing: "-0.5px",
  },

  description: {
    margin: "7px 0 0",
    color: "#697386",
    fontSize: "15px",
  },

  refreshButton: {
    border: "1px solid #d8dce2",
    background: "#ffffff",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },

  message: {
    marginBottom: "20px",
    padding: "12px 16px",
    background: "#ffffff",
    border: "1px solid #dfe3e8",
    borderRadius: "8px",
    fontSize: "14px",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e4e7eb",
    borderRadius: "10px",
    padding: "20px",
    boxSizing: "border-box",
  },

  cardTitle: {
    margin: 0,
    color: "#303846",
    fontSize: "14px",
    fontWeight: "600",
  },

  cardValue: {
    display: "block",
    marginTop: "12px",
    fontSize: "30px",
    color: "#159447",
  },

  cardDescription: {
    display: "block",
    marginTop: "5px",
    color: "#7b8494",
    fontSize: "13px",
  },

  middleGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.5fr) minmax(300px, 1fr)",
    gap: "18px",
    marginBottom: "18px",
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #e4e7eb",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "18px",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  panelTitle: {
    margin: 0,
    fontSize: "17px",
  },

  panelDescription: {
    margin: "5px 0 0",
    color: "#7b8494",
    fontSize: "13px",
  },

  legend: {
    display: "flex",
    gap: "15px",
    fontSize: "12px",
    color: "#626b7b",
  },

  legendDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginRight: "5px",
  },

  chart: {
    height: "180px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    borderBottom: "1px solid #e5e7eb",
    padding: "0 10px",
  },

  chartColumn: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "8px",
  },

  bars: {
    height: "150px",
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
  },

  bar: {
    width: "12px",
    minHeight: "4px",
    borderRadius: "4px 4px 0 0",
  },

  chartLabel: {
    fontSize: "11px",
    color: "#727b8b",
    marginBottom: "8px",
  },

  summaryList: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "17px 0",
    borderBottom: "1px solid #edf0f2",
    fontSize: "14px",
  },

  viewAll: {
    color: "#159447",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "13px",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f8f9fa",
    borderBottom: "1px solid #e5e7eb",
    color: "#596273",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf0f2",
    whiteSpace: "nowrap",
  },

  badge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
  },

  updateButton: {
    padding: "6px 10px",
    border: "1px solid #b9dec5",
    borderRadius: "6px",
    background: "#effaf2",
    color: "#168b45",
    cursor: "pointer",
    fontWeight: "600",
  },

  stockButton: {
    marginRight: "5px",
    padding: "6px 9px",
    border: "1px solid #d5d9df",
    borderRadius: "5px",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },

  empty: {
    padding: "35px",
    textAlign: "center",
    color: "#777",
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },
};