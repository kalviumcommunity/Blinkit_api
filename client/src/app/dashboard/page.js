"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getProducts,
  getInventoryLogs,
  updateStock,
} from "../../lib/api";

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

    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) return;

    // Prevent negative stock in the UI
    if (product.stock + change < 0) {
      setMessage("Stock cannot be negative.");
      return;
    }

    // Optimistic update
    setProducts((current) =>
      current.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: p.stock + change,
            }
          : p
      )
    );

    setUpdatingId(productId);
    setMessage("");

    try {
      const result = await updateStock(
        productId,
        change
      );

      // Reconcile with actual database response
      setProducts((current) =>
        current.map((p) =>
          p.id === productId
            ? result.product
            : p
        )
      );

      // Refresh inventory logs
      const updatedLogs =
        await getInventoryLogs();

      setLogs(updatedLogs);

      setMessage(
        `${result.product.name} stock updated successfully.`
      );
    } catch (error) {
      console.error(error);

      // Roll back optimistic update
      setProducts(oldProducts);

      setMessage(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      product.stock > 0 &&
      product.stock <= 10
  );

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  );

  /*
   * Last 7 days of stock movement.
   *
   * Positive changes = increased
   * Negative changes = decreased
   */
  const movementData = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(
        date.getDate() - i
      );

      const key = date
        .toISOString()
        .slice(0, 10);

      days.push({
        key,
        label: date.toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          }
        ),
        increased: 0,
        decreased: 0,
      });
    }

    logs.forEach((log) => {
      if (!log.createdAt) return;

      const date = new Date(
        log.createdAt
      );

      const key = date
        .toISOString()
        .slice(0, 10);

      const day = days.find(
        (item) => item.key === key
      );

      if (!day) return;

      if (Number(log.change) > 0) {
        day.increased += Number(
          log.change
        );
      } else {
        day.decreased += Math.abs(
          Number(log.change)
        );
      }
    });

    return days;
  }, [logs]);

  const maxMovement = Math.max(
    1,
    ...movementData.map((day) =>
      Math.max(
        day.increased,
        day.decreased
      )
    )
  );

  if (loading) {
    return (
      <main className="dashboard-loading">
        <h2>Loading inventory...</h2>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-heading">
            Inventory Overview
          </h1>

          <p className="dashboard-description">
            Overview of inventory and stock movement
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="dashboard-refresh"
        >
          ↻ Refresh
        </button>
      </header>

      {/* =================================================
          MESSAGE
      ================================================= */}

      {message && (
        <div className="dashboard-message">
          {message}
        </div>
      )}

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <section className="dashboard-cards">
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

      {/* =================================================
          STOCK MOVEMENT + QUICK SUMMARY
      ================================================= */}

      <section className="dashboard-middle">
        {/* Stock Movement */}

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2 className="dashboard-panel-title">
                Stock Movement
              </h2>

              <p className="dashboard-panel-description">
                Last 7 days
              </p>
            </div>

            <div className="dashboard-legend">
              <span>
                <i className="dashboard-legend-dot increased" />
                Increased
              </span>

              <span>
                <i className="dashboard-legend-dot decreased" />
                Decreased
              </span>
            </div>
          </div>

          <div className="dashboard-chart">
            {movementData.map((day) => (
              <div
                key={day.key}
                className="dashboard-chart-column"
              >
                <div className="dashboard-bars">
                  <div
                    title={`Increased: ${day.increased}`}
                    className="dashboard-bar increased"
                    style={{
                      height: `${Math.max(
                        4,
                        (day.increased /
                          maxMovement) *
                          140
                      )}px`,
                    }}
                  />

                  <div
                    title={`Decreased: ${day.decreased}`}
                    className="dashboard-bar decreased"
                    style={{
                      height: `${Math.max(
                        4,
                        (day.decreased /
                          maxMovement) *
                          140
                      )}px`,
                    }}
                  />
                </div>

                <span className="dashboard-chart-label">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Summary */}

        <div className="dashboard-panel">
          <h2 className="dashboard-panel-title">
            Quick Summary
          </h2>

          <div className="dashboard-summary-list">
            <div className="dashboard-summary-row">
              <span>
                Recent stock changes
              </span>

              <strong>
                {logs.length}
              </strong>
            </div>

            <div className="dashboard-summary-row">
              <span>
                Low stock products
              </span>

              <strong>
                {lowStockProducts.length}
              </strong>
            </div>

            <div className="dashboard-summary-row">
              <span>
                Out of stock
              </span>

              <strong>
                {outOfStockProducts.length}
              </strong>
            </div>

            <div className="dashboard-summary-row">
              <span>
                Total units
              </span>

              <strong>
                {totalStock}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          LOW STOCK PRODUCTS
      ================================================= */}

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2 className="dashboard-panel-title">
              Top Low Stock Products
            </h2>

            <p className="dashboard-panel-description">
              Products that need attention
            </p>
          </div>

          <Link
            href="/products"
            className="dashboard-view-all"
          >
            View all →
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="dashboard-empty">
            No low stock products.
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>

              <tbody>
                {lowStockProducts
                  .slice(0, 5)
                  .map((product, index) => (
                    <tr key={product.id}>
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {product.name}
                        </strong>
                      </td>

                      <td>
                        {product.category}
                      </td>

                      <td>
                        <strong
                          className={
                            product.stock === 0
                              ? "stock-out-text"
                              : "stock-low-text"
                          }
                        >
                          {product.stock} units
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`dashboard-status ${
                            product.stock === 0
                              ? "out"
                              : "low"
                          }`}
                        >
                          {product.stock === 0
                            ? "Out of Stock"
                            : "Low Stock"}
                        </span>
                      </td>

                      <td>
                        <button
                          disabled={
                            updatingId ===
                            product.id
                          }
                          onClick={() =>
                            changeStock(
                              product.id,
                              10
                            )
                          }
                          className="dashboard-update-button"
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

      {/* =================================================
          ALL PRODUCTS
      ================================================= */}

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2 className="dashboard-panel-title">
              All Products
            </h2>

            <p className="dashboard-panel-description">
              Update stock directly
            </p>
          </div>
        </div>

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>
                      {product.name}
                    </strong>
                  </td>

                  <td>
                    {product.category}
                  </td>

                  <td>
                    ₹{product.price}
                  </td>

                  <td>
                    <strong>
                      {product.stock}
                    </strong>
                  </td>

                  <td>
                    <button
                      disabled={
                        updatingId ===
                          product.id ||
                        product.stock <= 0
                      }
                      onClick={() =>
                        changeStock(
                          product.id,
                          -1
                        )
                      }
                      className="dashboard-stock-button"
                    >
                      −1
                    </button>

                    <button
                      disabled={
                        updatingId ===
                        product.id
                      }
                      onClick={() =>
                        changeStock(
                          product.id,
                          1
                        )
                      }
                      className="dashboard-stock-button"
                    >
                      +1
                    </button>

                    <button
                      disabled={
                        updatingId ===
                          product.id ||
                        product.stock < 10
                      }
                      onClick={() =>
                        changeStock(
                          product.id,
                          -10
                        )
                      }
                      className="dashboard-stock-button"
                    >
                      −10
                    </button>

                    <button
                      disabled={
                        updatingId ===
                        product.id
                      }
                      onClick={() =>
                        changeStock(
                          product.id,
                          10
                        )
                      }
                      className="dashboard-stock-button"
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
  );
}


/* =========================================================
   SUMMARY CARD COMPONENT
========================================================= */

function SummaryCard({
  title,
  value,
  description,
}) {
  return (
    <div className="dashboard-card">
      <p className="dashboard-card-title">
        {title}
      </p>

      <strong className="dashboard-card-value">
        {value}
      </strong>

      <span className="dashboard-card-description">
        {description}
      </span>
    </div>
  );
}