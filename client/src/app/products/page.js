"use client";

import { useEffect, useState } from "react";
import { getProducts, updateStock } from "../../lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  // Load products from PostgreSQL
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();

      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  // Change stock
  async function changeStock(id, change) {
    if (updatingId !== null) return;
    // Find current product
    const currentProduct = products.find(
      (product) => product.id === id
    );

    if (!currentProduct) {
      return;
    }

    // Don't allow stock to go below zero
    if (
      change < 0 &&
      currentProduct.stock + change < 0
    ) {
      alert("Stock cannot be negative.");
      return;
    }

    // Save old stock for rollback
    const oldStock = currentProduct.stock;

    // Optimistic UI update
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: product.stock + change,
            }
          : product
      )
    );

    setUpdatingId(id);
    setMessage("");

    try {
      // Send request to backend
      const result = await updateStock(id, change);

      // Set actual database result
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id
            ? result.product
            : product
        )
      );

      setMessage(
        `${currentProduct.name} stock updated successfully`
      );

      // Remove message after 2 seconds
      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error("Stock update failed:", err);

      // Rollback optimistic update
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id
            ? {
                ...product,
                stock: oldStock,
              }
            : product
        )
      );

      alert(err.message || "Stock update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  // Get unique categories
  const categories = [
    "All",
    ...new Set(products.map((product) => product.category)),
  ];

  // Search + category filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" ||
      product.category === category;

    return matchesSearch && matchesCategory;
  });

  // Loading
  if (loading) {
    return (
      <main style={{ padding: 30 }}>
        <h1>Products</h1>
        <p>Loading products...</p>
      </main>
    );
  }

  // Error
  if (error) {
    return (
      <main style={{ padding: 30 }}>
        <h1>Products</h1>

        <div
          style={{
            padding: 20,
            border: "1px solid #ffcccc",
            borderRadius: 10,
          }}
        >
          <h2>Failed to load products</h2>

          <p>{error}</p>

          <button onClick={loadProducts}>
            Retry
          </button>
        </div>
      </main>
    );
  }

    return (
  <main className="products-page">
    {/* Header */}
    <div className="products-header">
      <div>
        <h1>Products</h1>
        <p>Manage and update your inventory.</p>
      </div>

      <button
        className="products-refresh"
        onClick={loadProducts}
        disabled={loading}
      >
        ↻ Refresh
      </button>
    </div>

    {/* Success message */}
    {message && (
      <div className="products-success">
        <span>✓</span>
        {message}
      </div>
    )}

    {/* Filters */}
    <div className="products-toolbar">
      <div className="products-search">
        <span>⌕</span>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <select
        className="products-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {categories.map((item) => (
          <option key={item} value={item}>
            {item === "All" ? "All categories" : item}
          </option>
        ))}
      </select>
    </div>

    {/* Product count */}
    <div className="products-summary">
      <div>
        <strong>{filteredProducts.length}</strong>{" "}
        {filteredProducts.length === 1
          ? "product"
          : "products"}
      </div>

      {filteredProducts.length !== products.length && (
        <span>
          of {products.length} total
        </span>
      )}
    </div>

    {/* Products */}
    <div className="products-grid">
      {filteredProducts.map((product) => {
        let status = "healthy";
        let statusText = "In stock";

        if (product.stock === 0) {
          status = "out";
          statusText = "Out of stock";
        } else if (product.stock <= 20) {
          status = "low";
          statusText = "Low stock";
        }

        const isUpdating =
          updatingId !== null;

        return (
          <div
            key={product.id}
            className={`product-card ${
              isUpdating ? "updating" : ""
            }`}
          >
            {/* Product top */}
            <div className="product-card-top">
              <div className="product-emoji">
                📦
              </div>

              <span className={`status ${status}`}>
                {statusText}
              </span>
            </div>

            {/* Product information */}
            <div className="product-info">
              <h2>{product.name}</h2>

              <p className="product-category">
                {product.category}
              </p>
            </div>

            {/* Price */}
            <div className="product-price">
              ₹{Number(product.price).toFixed(2)}
            </div>

            {/* Stock */}
            <div className="product-stock">
              <span>Current stock</span>

              <strong>
                {product.stock}
                <small> units</small>
              </strong>
            </div>

            {/* Stock controls */}
            <div className="stock-controls">
              <button
                className="stock-button decrease"
                disabled={
                  isUpdating ||
                  product.stock === 0
                }
                onClick={() =>
                  changeStock(product.id, -10)
                }
              >
                −10
              </button>

              <button
                className="stock-button increase"
                disabled={isUpdating}
                onClick={() =>
                  changeStock(product.id, 10)
                }
              >
                {isUpdating ? "Updating..." : "+10"}
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {/* No products */}
    {filteredProducts.length === 0 && (
      <div className="products-empty">
        <div>📦</div>

        <h2>No products found</h2>

        <p>
          Try another product name or category.
        </p>
      </div>
    )}
  </main>
);
  
}
