export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') window.location.replace('/login');
    const error = new Error(data.message || 'The server is unavailable. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getProducts() { return (await request('/products')).products; }
export async function getInventoryLogs() { return (await request('/inventory-logs')).logs; }
export function updateStock(productId, change) {
  return request(`/products/${productId}/stock`, { method: 'PATCH', body: JSON.stringify({ change }) });
}
