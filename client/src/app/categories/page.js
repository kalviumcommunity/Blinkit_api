"use client";

import { useEffect, useState } from "react";
import { getProducts } from "../../lib/api";

export default function CategoriesPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((error) => alert(error.message));
  }, []);

  const categories = [
    ...new Set(
      products.map((product) => product.category)
    ),
  ];

  return (
    <main className="categories-page">
      <div className="categories-header">
        <div>
          <h1>Categories</h1>
          <p>Manage and view your inventory by category.</p>
        </div>

        <div className="categories-count">
          <span>{categories.length}</span>
          <small>Categories</small>
        </div>
      </div>

      <div className="categories-grid">
        {categories.map((category) => {
          const categoryProducts = products.filter(
            (product) => product.category === category
          );

          const stock = categoryProducts.reduce(
            (total, product) => total + product.stock,
            0
          );

          return (
            <div
              key={category}
              className="category-card"
            >
              <div className="category-card-top">
                <div className="category-icon">📦</div>

                <span className="category-arrow">→</span>
              </div>

              <h2>{category}</h2>

              <div className="category-stats">
                <div>
                  <span className="category-stat-label">
                    Products
                  </span>

                  <strong>{categoryProducts.length}</strong>
                </div>

                <div>
                  <span className="category-stat-label">
                    Total Stock
                  </span>

                  <strong>{stock}</strong>
                </div>
              </div>

              <div className="category-stock-bar">
                <div
                  style={{
                    width: `${Math.min(stock, 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="categories-empty">
          <div className="categories-empty-icon">📦</div>
          <h2>No categories found</h2>
          <p>
            Categories will appear here once products are
            added.
          </p>
        </div>
      )}
    </main>
  );
}