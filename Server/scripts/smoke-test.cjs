// Run only against an isolated local database: creates an account and disposable product.
const assert = require('node:assert/strict');
const base = process.env.TEST_API_URL || 'http://localhost:5000/api';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local test API.');
let cookie = '';
async function call(path, method = 'GET', body, authenticated = true, headers = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authenticated && cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie') };
}
(async () => {
  const email = `smoke-${Date.now()}@example.test`;
  const credentials = { name: 'Local Test', email, password: 'Test-only-password-27!' };
  assert.equal((await call('/products')).status, 401);
  assert.equal((await call('/auth/signup', 'POST', { ...credentials, password: 'short' })).status, 400);
  const signup = await call('/auth/signup', 'POST', credentials);
  assert.equal(signup.status, 201);
  assert.match(signup.cookie, /HttpOnly/i);
  assert.match(signup.cookie, /SameSite=Lax/i);
  assert.equal(signup.data.user.password_hash, undefined);
  cookie = signup.cookie.split(';')[0];
  assert.equal((await call('/auth/me')).data.user.email, email);
  assert.equal((await call('/auth/signup', 'POST', { ...credentials, email: email.toUpperCase() })).status, 409);
  assert.equal((await call('/auth/login', 'POST', { ...credentials, password: 'incorrect' }, false)).status, 401);
  assert.equal((await call('/auth/logout', 'POST', undefined, true, { Origin: 'https://untrusted.example' })).status, 403);
  const created = await call('/products', 'POST', { name: 'Smoke test product', category: 'Test', stock: 10, price: 12.5 });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.product.id;
  const updated = await call(`/products/${id}/stock`, 'PATCH', { change: 5, managerId: 999999 });
  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.product.stock, 15);
  assert.equal(updated.data.inventoryLog.managerId, signup.data.user.id);
  assert.equal((await call(`/products/${id}/stock`, 'PATCH', { change: -16 })).status, 400);
  assert.equal((await call(`/products/${id}`)).data.product.stock, 15);
  const concurrent = await Promise.all([call(`/products/${id}/stock`, 'PATCH', { change: -10 }), call(`/products/${id}/stock`, 'PATCH', { change: -10 })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 400]);
  assert.equal((await call(`/products/${id}`)).data.product.stock, 5);
  assert.equal((await call('/inventory-logs')).status, 200);
  assert.equal((await call(`/products/${id}`, 'DELETE')).status, 200);
  assert.equal((await call('/auth/logout', 'POST')).status, 200);
  assert.equal((await call('/auth/me')).status, 401);
  const login = await call('/auth/login', 'POST', { ...credentials, email: email.toUpperCase() }, false);
  assert.equal(login.status, 200);
  cookie = login.cookie.split(';')[0];
  assert.equal((await call('/products')).status, 200);
  await call('/auth/logout', 'POST');
  console.log('PASS: signup, validation, duplicates, login, sessions, logout, origin checks, protected APIs, stock attribution, concurrency, negative stock, inventory logs.');
})().catch(error => { console.error(error); process.exitCode = 1; });
