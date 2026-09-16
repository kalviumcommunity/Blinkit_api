"use client";

import { useEffect, useState } from "react";
import { getProducts, updateStock } from "../../lib/api";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);

      const data = await getProducts();

      setProducts(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function changeStock(id, change) {
    // Current products ka backup
    const oldProducts = [...products];

    // Optimistic UI update
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: Math.max(0, product.stock + change),
            }
          : product
      )
    );

    setUpdatingId(id);

    try {
      // Backend ko request
      const result = await updateStock(id, change);

      // Backend ka actual product use karo
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id ? result.product : product
        )
      );
    } catch (error) {
      console.error(error);

      // Request fail → rollback
      setProducts(oldProducts);

      alert(error.message || "Stock update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: "40px" }}>
        <h1>Loading Inventory...</h1>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Inventory</h1>

      <p>Total Products: {products.length}</p>

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h2>{product.name}</h2>

          <p>
            Category: <strong>{product.category}</strong>
          </p>

          <p>
            Price: ₹{product.price}
          </p>

          <p>
            Stock: <strong>{product.stock}</strong>
          </p>

          <button
            onClick={() => changeStock(product.id, -10)}
            disabled={updatingId === product.id}
            style={{
              marginRight: "10px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            -10
          </button>

          <button
            onClick={() => changeStock(product.id, 10)}
            disabled={updatingId === product.id}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            +10
          </button>
        </div>
      ))}
    </main>
  );
}