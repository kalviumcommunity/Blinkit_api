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
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function changeStock(product, direction) {
    if (updating) return;
    const amount = Number(amounts[product.id] ?? 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      alert('Enter a positive whole-number quantity.');
      return;
    }

    const change =
      direction === "increase"
        ? amount
        : -amount;

    if (product.stock + change < 0) {
      alert('Stock cannot be negative.');
      return;
    }
    setUpdating(true);

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
      setProducts(current => current.map(p => p.id === product.id ? product : p));
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="stock-update-page">
        <div className="stock-loading">
          <div className="stock-loading-icon">📦</div>
          <p>Loading inventory...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="stock-update-page">
      <div className="stock-update-header">
        <div>
          <h1>Stock Update</h1>
          <p>
            Quickly increase or decrease inventory for each
            product.
          </p>
        </div>

        <div className="stock-update-count">
          <span>{products.length}</span>
          <small>Products</small>
        </div>
      </div>

      <div className="stock-update-info">
        <span>💡</span>
        <p>
          Enter the quantity you want to change, then use
          <strong> − </strong> or <strong> + </strong> to
          update stock.
        </p>
      </div>

      <div className="stock-update-list">
        {products.map((product) => {
          const amount =
            Number(amounts[product.id]) || 10;

          const isOutOfStock = product.stock === 0;
          const isLowStock =
            product.stock > 0 && product.stock <= 20;

          return (
            <div
              key={product.id}
              className="stock-update-card"
            >
              <div className="stock-product-info">
                <div className="stock-product-icon">
                  📦
                </div>

                <div>
                  <h2>{product.name}</h2>

                  <span className="stock-product-category">
                    {product.category}
                  </span>
                </div>
              </div>

              <div className="stock-current">
                <span>Current Stock</span>

                <strong>{product.stock}</strong>

                <small
                  className={
                    isOutOfStock
                      ? "stock-label out"
                      : isLowStock
                        ? "stock-label low"
                        : "stock-label healthy"
                  }
                >
                  {isOutOfStock
                    ? "Out of stock"
                    : isLowStock
                      ? "Low stock"
                      : "In stock"}
                </small>
              </div>

              <div className="stock-controls">
                <label>Quantity</label>

                <div className="stock-control-row">
                  <input
                    type="number"
                    min="1"
                    value={amounts[product.id] ?? 10}
                    onChange={(e) =>
                      setAmounts({
                        ...amounts,
                        [product.id]: e.target.value,
                      })
                    }
                  />

                  <button
                    className="stock-decrease"
                    onClick={() =>
                      changeStock(
                        product,
                        "decrease"
                      )
                    }
                    disabled={updating || product.stock === 0}
                    aria-label={`Decrease ${product.name} stock`}
                  >
                    −
                  </button>

                  <button
                    className="stock-increase"
                    disabled={updating}
                    onClick={() =>
                      changeStock(
                        product,
                        "increase"
                      )
                    }
                    aria-label={`Increase ${product.name} stock`}
                  >
                    +
                  </button>
                </div>

                <span className="stock-change-preview">
                  {amount} units
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
