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
    <main style={{ padding: 30 }}>
      <h1>Categories</h1>

      <p>All product categories.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginTop: 30,
        }}
      >
        {categories.map((category) => {
          const categoryProducts =
            products.filter(
              (product) =>
                product.category === category
            );

          const stock = categoryProducts.reduce(
            (total, product) =>
              total + product.stock,
            0
          );

          return (
            <div
              key={category}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h2>{category}</h2>

              <p>
                Products:{" "}
                {categoryProducts.length}
              </p>

              <p>
                Total Stock: <strong>{stock}</strong>
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}