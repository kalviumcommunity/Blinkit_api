const API_URL = "http://localhost:5000/api";

export async function getProducts() {
  const response = await fetch(`${API_URL}/products`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

export async function updateStock(productId, change, managerId) {
  const response = await fetch(
    `${API_URL}/products/${productId}/stock`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        change,
        managerId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Stock update failed");
  }

  return data;
}

export async function getInventoryLogs() {
  const response = await fetch(`${API_URL}/inventory-logs`);

  if (!response.ok) {
    throw new Error("Failed to fetch inventory logs");
  }

  return response.json();
}