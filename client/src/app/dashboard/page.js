"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, updateStock } from "../../lib/api";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);

      const data = await getProducts();

      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  }

  async function changeStock(id, change) {
    const oldProducts = [...products];

    const product = products.find((p) => p.id === id);

    if (!product) return;

    // Negative stock prevent
    if (product.stock + change < 0) {
      setMessage("Stock cannot be negative.");
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    // Optimistic update
    setProducts((currentProducts) =>
      currentProducts.map((p) =>
        p.id === id
          ? {
              ...p,
              stock: p.stock + change,
            }
          : p
      )
    );

    setUpdatingId(id);
    setMessage("");

    try {
      const result = await updateStock(id, change);

      // Backend ka actual result
      setProducts((currentProducts) =>
        currentProducts.map((p) =>
          p.id === id ? result.product : p
        )
      );

      setMessage(
        `${product.name} stock ${
          change > 0 ? "increased" : "decreased"
        } by ${Math.abs(change)}`
      );

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (error) {
      console.error("Stock update failed:", error);

      // Rollback
      setProducts(oldProducts);

      setMessage(
        error.message || "Stock update failed"
      );

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } finally {
      setUpdatingId(null);
    }
  }

  // -----------------------------
  // Dashboard Statistics
  // -----------------------------

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const lowStockItems = products.filter(
    (product) =>
      Number(product.stock) > 0 &&
      Number(product.stock) <= 20
  ).length;

  const outOfStockItems = products.filter(
    (product) => Number(product.stock) === 0
  ).length;

  // Categories
  const categories = [
    ...new Set(products.map((product) => product.category)),
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading Inventory...
      </div>
    );
  }

  return (
    <div className="dashboard-layout">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="sidebar">

        <div className="logo">
          blinkit
          <span>Inventory Manager</span>
        </div>

        <div className="menu-section">
          <p>MAIN</p>

          <Link
            href="/dashboard"
            className="menu-item active"
          >
            ▣ Dashboard
          </Link>
        </div>

        <div className="menu-section">
          <p>INVENTORY</p>

          <Link
            href="/products"
            className="menu-item"
          >
            ▤ Products
          </Link>

          <Link
            href="/stock-update"
            className="menu-item"
          >
            ↕ Stock Update
          </Link>

          <Link
            href="/categories"
            className="menu-item"
          >
            ▣ Categories
          </Link>
        </div>

        <div className="menu-section">
          <p>AUDIT & REPORTS</p>

          <Link
            href="/inventory-logs"
            className="menu-item"
          >
            ▤ Inventory Logs
          </Link>
        </div>

      </aside>

      {/* =========================
          MAIN CONTENT
      ========================== */}

      <main className="dashboard-main">

        {/* Header */}

        <div className="top-header">

          <div>
            <h1>Dashboard</h1>

            <p>
              Overview of your inventory and stock
              activities
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadProducts}
          >
            ↻ Refresh
          </button>

        </div>

        {/* Message */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* =========================
            STAT CARDS
        ========================== */}

        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-top">
              <span>Total Products</span>
              <div className="stat-icon">
                ▣
              </div>
            </div>

            <h2>{totalProducts}</h2>

            <p className="green-text">
              Products in inventory
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Total Stock</span>
              <div className="stat-icon blue">
                ▤
              </div>
            </div>

            <h2>{totalStock}</h2>

            <p className="green-text">
              Units available
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Low Stock Items</span>
              <div className="stat-icon yellow">
                ⚠
              </div>
            </div>

            <h2>{lowStockItems}</h2>

            <p className="yellow-text">
              Items need attention
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Stock Out Items</span>
              <div className="stat-icon purple">
                □
              </div>
            </div>

            <h2>{outOfStockItems}</h2>

            <p className="red-text">
              Items are out of stock
            </p>
          </div>

        </div>

        {/* =========================
            PRODUCTS SECTION
        ========================== */}

        <div className="section-header">

          <div>
            <h2>Current Inventory</h2>

            <p>
              Update stock directly from the
              dashboard
            </p>
          </div>

          <Link
            href="/products"
            className="view-all"
          >
            View All →
          </Link>

        </div>

        <div className="products-grid">

          {products.map((product) => {

            const stock = Number(product.stock);

            let status = "In Stock";

            if (stock === 0) {
              status = "Out of Stock";
            } else if (stock <= 20) {
              status = "Low Stock";
            }

            return (
              <div
                className="product-card"
                key={product.id}
              >

                <div className="product-header">

                  <div>
                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.category}
                    </p>
                  </div>

                  <span
                    className={
                      stock === 0
                        ? "status out"
                        : stock <= 20
                        ? "status low"
                        : "status good"
                    }
                  >
                    {status}
                  </span>

                </div>

                <div className="product-info">

                  <div>
                    <span>Price</span>
                    <strong>
                      ₹{product.price}
                    </strong>
                  </div>

                  <div>
                    <span>Current Stock</span>
                    <strong className="stock-number">
                      {stock}
                    </strong>
                  </div>

                </div>

                {/* Stock Buttons */}

                <div className="stock-buttons">

                  <button
                    disabled={
                      updatingId === product.id ||
                      stock === 0
                    }
                    onClick={() =>
                      changeStock(
                        product.id,
                        -10
                      )
                    }
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
                  >
                    {updatingId === product.id
                      ? "Updating..."
                      : "+10"}
                  </button>

                </div>

              </div>
            );
          })}

        </div>

        {/* =========================
            CATEGORIES
        ========================== */}

        <div className="section-header category-heading">

          <div>
            <h2>Categories</h2>

            <p>
              Product categories in inventory
            </p>
          </div>

          <Link
            href="/categories"
            className="view-all"
          >
            Manage Categories →
          </Link>

        </div>

        <div className="categories-grid">

          {categories.map((category) => {

            const categoryProducts =
              products.filter(
                (product) =>
                  product.category === category
              );

            const categoryStock =
              categoryProducts.reduce(
                (total, product) =>
                  total +
                  Number(product.stock || 0),
                0
              );

            return (
              <div
                className="category-card"
                key={category}
              >
                <h3>{category}</h3>

                <p>
                  {categoryProducts.length} product
                  {categoryProducts.length !== 1
                    ? "s"
                    : ""}
                </p>

                <strong>
                  {categoryStock} units
                </strong>
              </div>
            );
          })}

        </div>

      </main>

      {/* =========================
          STYLES
      ========================== */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .dashboard-layout {
          min-height: 100vh;
          display: flex;
          background: #f7f9f8;
          color: #1f2937;
        }

        /* SIDEBAR */

        .sidebar {
          width: 250px;
          min-height: 100vh;
          background: #064e3b;
          color: white;
          padding: 28px 18px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .logo {
          font-size: 30px;
          font-weight: 800;
          margin-bottom: 35px;
          padding-left: 12px;
        }

        .logo span {
          display: block;
          font-size: 12px;
          font-weight: 400;
          margin-top: 4px;
          opacity: 0.8;
        }

        .menu-section {
          margin-bottom: 28px;
        }

        .menu-section p {
          font-size: 10px;
          letter-spacing: 1.5px;
          color: #9ad5bf;
          margin: 0 12px 10px;
          font-weight: 700;
        }

        .menu-item {
          display: block;
          padding: 12px 14px;
          margin: 5px 0;
          border-radius: 7px;
          color: #d7f5e9;
          text-decoration: none;
          font-size: 14px;
          transition: 0.2s;
        }

        .menu-item:hover {
          background: #087f5b;
          color: white;
        }

        .menu-item.active {
          background: #087f5b;
          color: white;
          font-weight: 600;
        }

        /* MAIN */

        .dashboard-main {
          flex: 1;
          padding: 38px;
          overflow-x: hidden;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .top-header h1 {
          margin: 0;
          font-size: 28px;
        }

        .top-header p {
          margin-top: 7px;
          color: #6b7280;
        }

        .refresh-button {
          background: #087f5b;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 11px 18px;
          cursor: pointer;
          font-weight: 600;
        }

        .refresh-button:hover {
          background: #056b4c;
        }

        .message {
          background: #e8f7ef;
          color: #087f5b;
          border: 1px solid #b7e5ce;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 35px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #6b7280;
          font-size: 13px;
        }

        .stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dcfce7;
          color: #087f5b;
        }

        .stat-icon.blue {
          background: #dbeafe;
          color: #2563eb;
        }

        .stat-icon.yellow {
          background: #fef3c7;
          color: #d97706;
        }

        .stat-icon.purple {
          background: #ede9fe;
          color: #7c3aed;
        }

        .stat-card h2 {
          margin: 15px 0 5px;
          font-size: 28px;
          color: #111827;
        }

        .stat-card p {
          margin: 0;
          font-size: 12px;
        }

        .green-text {
          color: #087f5b;
        }

        .yellow-text {
          color: #d97706;
        }

        .red-text {
          color: #dc2626;
        }

        /* SECTION */

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .section-header p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .view-all {
          color: #087f5b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        /* PRODUCTS */

        .products-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .product-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .product-header h3 {
          margin: 0;
          font-size: 17px;
        }

        .product-header p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .status {
          height: fit-content;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }

        .status.good {
          background: #dcfce7;
          color: #15803d;
        }

        .status.low {
          background: #fef3c7;
          color: #b45309;
        }

        .status.out {
          background: #fee2e2;
          color: #dc2626;
        }

        .product-info {
          display: flex;
          gap: 60px;
          margin: 22px 0;
        }

        .product-info span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .product-info strong {
          font-size: 15px;
        }

        .stock-number {
          color: #087f5b;
        }

        .stock-buttons {
          display: flex;
          gap: 10px;
        }

        .stock-buttons button {
          flex: 1;
          padding: 10px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 600;
        }

        .stock-buttons button:last-child {
          background: #087f5b;
          color: white;
          border-color: #087f5b;
        }

        .stock-buttons button:hover:not(:disabled) {
          opacity: 0.85;
        }

        .stock-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* CATEGORIES */

        .category-heading {
          margin-top: 35px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .category-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px;
        }

        .category-card h3 {
          margin: 0;
        }

        .category-card p {
          color: #6b7280;
          font-size: 13px;
        }

        .category-card strong {
          color: #087f5b;
        }

        .dashboard-loading {
          padding: 50px;
          font-size: 20px;
        }

        /* MOBILE */

        @media (max-width: 900px) {

          .sidebar {
            width: 210px;
          }

          .dashboard-main {
            padding: 25px;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .categories-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {

          .dashboard-layout {
            display: block;
          }

          .sidebar {
            position: relative;
            width: 100%;
            height: auto;
            min-height: auto;
          }

          .menu-section {
            display: inline-block;
            vertical-align: top;
            margin-right: 15px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .categories-grid {
            grid-template-columns: 1fr;
          }

          .top-header {
            display: block;
          }

          .refresh-button {
            margin-top: 15px;
          }

        }

      `}</style>

    </div>
  );
}