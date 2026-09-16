"use client";

import { useEffect, useState } from "react";
import { getProducts, updateStock } from "../../lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);

      const data = await getProducts();

      setProducts(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStock(id, change) {
    const oldProducts = [...products];

    // Optimistic update
    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: Math.max(0, product.stock + change),
            }
          : product
      )
    );

    try {
      const result = await updateStock(id, change);

      setProducts((current) =>
        current.map((product) =>
          product.id === id
            ? result.product
            : product
        )
      );
    } catch (err) {
      // Rollback
      setProducts(oldProducts);

      alert(err.message);
    }
  }

  if (loading) {
    return <div style={{ padding: 30 }}>Loading products...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 30 }}>
        <h2>Error</h2>
        <p>{error}</p>

        <button onClick={loadProducts}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>Products</h1>

      <p>Manage all inventory products.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 20,
          marginTop: 30,
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2>{product.name}</h2>

            <p>
              Category: {product.category}
            </p>

            <p>
              Price: ₹{product.price}
            </p>

            <h3>
              Stock: {product.stock}
            </h3>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 15,
              }}
            >
              <button
                onClick={() =>
                  changeStock(product.id, -10)
                }
              >
                −10
              </button>

              <button
                onClick={() =>
                  changeStock(product.id, 10)
                }
              >
                +10
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}