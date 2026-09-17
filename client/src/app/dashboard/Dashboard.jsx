"use client";

import { useEffect, useState } from "react";
import { getProducts, updateStock } from "../../lib/api";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Database se products load karo
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  // +10 stock
  async function increaseStock(id) {
    // Purana data save kar lo
    const oldProducts = [...products];

    // UI immediately +10
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: product.stock + 10,
            }
          : product
      )
    );

    try {
      // Backend ko request
      const result = await updateStock(id, 10);

      // Backend ka actual result UI mein set karo
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id
            ? result.product
            : product
        )
      );
    } catch (error) {
      // Backend fail hua toh rollback
      setProducts(oldProducts);

      alert(error.message);
    }
  }

  // -10 stock
  async function decreaseStock(id) {
    const oldProducts = [...products];

    // UI immediately -10
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: Math.max(0, product.stock - 10),
            }
          : product
      )
    );

    try {
      // Backend ko request
      const result = await updateStock(id, -10);

      // Backend ka result
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id
            ? result.product
            : product
        )
      );
    } catch (error) {
      // Fail hua toh purana stock wapas
      setProducts(oldProducts);

      alert(error.message);
    }
  }

  if (loading) {
    return <main>Loading products...</main>;
  }

  return (
    <main>
      <h1>Inventory</h1>

      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>

          <p>
            Category: {product.category}
          </p>

          <p>
            Stock: <strong>{product.stock}</strong>
          </p>

          <button
            onClick={() =>
              decreaseStock(product.id)
            }
          >
            -10
          </button>

          <button
            onClick={() =>
              increaseStock(product.id)
            }
          >
            +10
          </button>
        </div>
      ))}
    </main>
  );
}


export default Dashboard;