"use client";

import { useEffect, useState } from "react";
import {
  getProducts,
  updateStock,
} from "../../lib/api";

export default function StockUpdatePage() {
  const [products, setProducts] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStock(product, direction) {
    const amount =
      Number(amounts[product.id]) || 10;

    const change =
      direction === "increase"
        ? amount
        : -amount;

    const oldProducts = [...products];

    // Optimistic UI
    setProducts((current) =>
      current.map((p) =>
        p.id === product.id
          ? {
              ...p,
              stock: Math.max(
                0,
                p.stock + change
              ),
            }
          : p
      )
    );

    try {
      const result = await updateStock(
        product.id,
        change
      );

      setProducts((current) =>
        current.map((p) =>
          p.id === product.id
            ? result.product
            : p
        )
      );
    } catch (error) {
      setProducts(oldProducts);
      alert(error.message);
    }
  }

  if (loading) {
    return <main style={{ padding: 30 }}>Loading...</main>;
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>Stock Update</h1>

      <p>
        Increase or decrease stock for each product.
      </p>

      <div style={{ marginTop: 30 }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 20,
              marginBottom: 15,
              border: "1px solid #ddd",
              borderRadius: 10,
            }}
          >
            <div>
              <h3>{product.name}</h3>
              <p>
                Current Stock:{" "}
                <strong>{product.stock}</strong>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="number"
                min="1"
                value={amounts[product.id] || 10}
                onChange={(e) =>
                  setAmounts({
                    ...amounts,
                    [product.id]: e.target.value,
                  })
                }
                style={{
                  width: 80,
                  padding: 8,
                }}
              />

              <button
                onClick={() =>
                  changeStock(
                    product,
                    "decrease"
                  )
                }
              >
                −
              </button>

              <button
                onClick={() =>
                  changeStock(
                    product,
                    "increase"
                  )
                }
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}