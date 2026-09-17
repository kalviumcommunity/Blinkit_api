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
    <main style={{ padding: 30 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1>Products</h1>
          <p>Manage all inventory products.</p>
        </div>

        <button onClick={loadProducts}>
          Refresh
        </button>
      </div>

      {/* Success message */}
      {message && (
        <div
          style={{
            background: "#e8f8ef",
            color: "#087f3f",
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          ✓ {message}
        </div>
      )}

      {/* Search + Category */}
      <div
        style={{
          display: "flex",
          gap: 15,
          marginBottom: 25,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            minWidth: 250,
          }}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* Product count */}
      <p style={{ marginBottom: 20 }}>
        Showing {filteredProducts.length} of{" "}
        {products.length} products
      </p>

      {/* Products */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
              background: "#fff",
            }}
          >
            <h2>{product.name}</h2>

            <p>
              Category: <strong>{product.category}</strong>
            </p>

            <p>
              Price: ₹{product.price}
            </p>

            <p
              style={{
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              Stock: {product.stock}
            </p>

            {/* Stock status */}
            {product.stock === 0 && (
              <p style={{ color: "red" }}>
                Out of stock
              </p>
            )}

            {product.stock > 0 &&
              product.stock <= 20 && (
                <p style={{ color: "orange" }}>
                  Low stock
                </p>
              )}

            {product.stock > 20 && (
              <p style={{ color: "green" }}>
                In stock
              </p>
            )}

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 15,
              }}
            >
              <button
                disabled={
                  updatingId === product.id ||
                  product.stock === 0
                }
                onClick={() =>
                  changeStock(product.id, -10)
                }
                style={{
                  padding: "10px 18px",
                  cursor:
                    updatingId === product.id ||
                    product.stock === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                −10
              </button>

              <button
                disabled={updatingId === product.id}
                onClick={() =>
                  changeStock(product.id, 10)
                }
                style={{
                  padding: "10px 18px",
                  cursor:
                    updatingId === product.id
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {updatingId === product.id
                  ? "Updating..."
                  : "+10"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* No products */}
      {filteredProducts.length === 0 && (
        <div style={{ padding: 30 }}>
          <h2>No products found</h2>
          <p>
            Try another product name or category.
          </p>
        </div>
      )}
    </main>
  );
}