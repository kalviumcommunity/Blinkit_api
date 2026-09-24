"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { InventoryLog, Manager, Product } from "@/lib/types";

class RequestError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new RequestError(
      "Connection interrupted. Refresh to check the latest stock before trying again.",
    );
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new RequestError(
      result.message || "Something went wrong. Please try again.",
      response.status,
    );
  return result;
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    history: (
      <>
        <path d="M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v5l3 2" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5m0 3v.2" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h12" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    edit: (
      <>
        <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.box}
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand">
      blink<span>it</span>
      <small>INVENTORY WORKSPACE</small>
    </div>
  );
}
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
const count = (value: number) => new Intl.NumberFormat("en-IN").format(value);

function Auth({
  onSignIn,
  initialError,
}: {
  onSignIn: (user: Manager) => void;
  initialError: string;
}) {
  const [signup, setSignup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: Manager }>(
        `auth/${signup ? "signup" : "login"}`,
        "POST",
        Object.fromEntries(form),
      );
      onSignIn(result.user);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">
            A LITTLE MORE ORDER. A LOT LESS EFFORT.
          </span>
          <h1>
            Good stock.
            <br />
            Great teamwork.
          </h1>
          <p>
            One place for your products, every stock adjustment, and the people
            keeping things moving.
          </p>
          <div className="stock-illustration">
            <div className="illustration-box">
              <Icon name="box" size={68} />
            </div>
            <div className="illustration-note">
              <span className="check-circle">
                <Icon name="check" />
              </span>
              <div>
                <strong>Every unit accounted for</strong>
                <small>Updates stay in sync, together.</small>
              </div>
            </div>
          </div>
        </div>
        <span className="auth-foot">
          Your everyday inventory, thoughtfully organised.
        </span>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <span className="eyebrow green">LET’S GET TO WORK</span>
          <h2>{signup ? "Your workspace starts here." : "Welcome back."}</h2>
          <p>
            {signup
              ? "Create your manager account. Start with a clean inventory."
              : "Sign in to pick up where your team left off."}
          </p>
          <form onSubmit={submit}>
            {signup && (
              <label>
                Your name
                <input
                  name="name"
                  placeholder="e.g. Aditi Sharma"
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Just a moment…"
                : signup
                  ? "Create manager account"
                  : "Sign in"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to the workspace?"}{" "}
            <button
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="auth-detail">
            <Icon name="check" size={17} /> Your manager ID is included with
            every stock change.
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductRow({
  product,
  onChange,
  onEdit,
  saving,
}: {
  product: Product;
  saving: boolean;
  onChange: (product: Product, delta: number) => Promise<void>;
  onEdit: (product: Product) => void;
}) {
  const [quantity, setQuantity] = useState("10");
  const [direction, setDirection] = useState("add");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", error: false });
  const working = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working.current) return;
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFeedback({ message: "Enter a positive whole number.", error: true });
      return;
    }
    working.current = true;
    setBusy(true);
    setFeedback({ message: "Saving adjustment…", error: false });
    try {
      await onChange(product, direction === "add" ? amount : -amount);
      setFeedback({ message: "Stock updated and logged", error: false });
    } catch (error) {
      setFeedback({ message: (error as Error).message, error: true });
    } finally {
      setBusy(false);
      working.current = false;
    }
  }
  return (
    <tr className={busy || saving ? "pending-row" : ""}>
      <td>
        <div className="product-name">
          <span className="product-symbol">
            <Icon name="box" size={23} />
          </span>
          <div>
            <strong>{product.name}</strong>
            <small>PRD-{String(product.id).padStart(4, "0")}</small>
          </div>
        </div>
      </td>
      <td>
        <span className="category-tag">{product.category}</span>
      </td>
      <td className="numeric">{money(Number(product.price))}</td>
      <td>
        <div className="stock-number">
          {count(product.stock)} <small>units</small>
        </div>
        <span
          className={`stock-status ${product.stock === 0 ? "out" : product.stock <= 20 ? "low" : "good"}`}
        >
          <i />
          {product.stock === 0
            ? "Out of stock"
            : product.stock <= 20
              ? "Low stock"
              : "In stock"}
        </span>
      </td>
      <td className="adjust-cell">
        <form onSubmit={submit} className="adjust-form">
          <select
            aria-label={`Adjustment type for ${product.name}`}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={busy || saving}
          >
            <option value="add">+ Add</option>
            <option value="remove">− Remove</option>
          </select>
          <input
            aria-label={`Quantity for ${product.name}`}
            type="number"
            min="1"
            max="2147483647"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            disabled={busy || saving}
          />
          <button className="button stock-button" disabled={busy || saving}>
            {busy ? "Saving…" : "Update"}
          </button>
        </form>
        <span
          role="status"
          className={`row-feedback ${feedback.error ? "text-error" : ""}`}
        >
          {feedback.message}
        </span>
      </td>
      <td>
        <button
          className="icon-button"
          aria-label={`Edit ${product.name}`}
          onClick={() => onEdit(product)}
          disabled={busy || saving}
        >
          <Icon name="edit" size={17} />
        </button>
      </td>
    </tr>
  );
}

function ProductDialog({
  product,
  onClose,
  onSave,
  onDelete,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (
    values: Record<string, unknown>,
    product: Product | null,
  ) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await onSave(
        {
          name: form.get("name"),
          category: form.get("category"),
          price: Number(form.get("price")),
        },
        product,
      );
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!product) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onDelete(product);
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      aria-labelledby="product-dialog-title"
      ref={ref}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <span className="modal-icon">
          <Icon name="box" size={25} />
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close product form"
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="product-dialog-title">
        {product ? "Edit product" : "Make room for something new."}
      </h2>
      <p>
        {product
          ? "Update the details. Stock history stays with the product."
          : "New products start at zero. Add stock from the inventory table."}
      </p>
      <form onSubmit={submit}>
        <label>
          Product name
          <input
            name="name"
            defaultValue={product?.name}
            placeholder="e.g. Amul Milk, 500 ml"
            maxLength={100}
            required
            disabled={busy}
          />
        </label>
        <div className="form-columns">
          <label>
            Category
            <input
              name="category"
              defaultValue={product?.category}
              placeholder="e.g. Dairy"
              maxLength={100}
              required
              disabled={busy}
            />
          </label>
          <label>
            Price (₹)
            <input
              name="price"
              type="number"
              defaultValue={product?.price}
              placeholder="0.00"
              min="0"
              max="99999999.99"
              step="0.01"
              required
              disabled={busy}
            />
          </label>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          {product && (
            <button
              type="button"
              className="text-button danger"
              onClick={remove}
              disabled={busy || product.stock !== 0}
              title={
                product.stock !== 0
                  ? "Reduce stock to zero before deleting"
                  : undefined
              }
            >
              {confirmDelete ? "Confirm deletion" : "Delete product"}
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : product ? "Save details" : "Add product"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function Page() {
  const [user, setUser] = useState<Manager | null>(null);
  const [booting, setBooting] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [view, setView] = useState("inventory");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [synced, setSynced] = useState("");
  const [dialog, setDialog] = useState<{ product: Product | null } | null>(
    null,
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const pendingCount = pendingIds.length;
  const pending = useRef(new Set<number>());
  const revision = useRef(0);
  const readSequence = useRef(0);

  useEffect(() => {
    let active = true;
    api<{ user: Manager }>("auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (active && error.status !== 401) setError(error.message);
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    const sequence = ++readSequence.current;
    const startRevision = revision.current;
    if (!quiet) setRefreshing(true);
    try {
      const [inventory, history] = await Promise.all([
        api<{ products: Product[] }>("products"),
        api<{ logs: InventoryLog[]; nextCursor: number | null }>(
          "inventory-logs",
        ),
      ]);
      if (
        sequence !== readSequence.current ||
        startRevision !== revision.current ||
        pending.current.size
      )
        return;
      setProducts(inventory.products);
      setLogs(history.logs);
      setCursor(history.nextCursor);
      setLoaded(true);
      setError("");
      setSynced(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      if (sequence !== readSequence.current) return;
      if ((error as RequestError).status === 401) {
        setUser(null);
        setProducts([]);
        setLogs([]);
        setLoaded(false);
      }
      setError((error as Error).message);
    } finally {
      if (sequence === readSequence.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const kickoff = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && view === "inventory")
        void refresh(true);
    }, 8000);
    const onFocus = () => {
      if (view === "inventory") void refresh(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refresh, view]);

  async function adjust(product: Product, delta: number) {
    if (pending.current.has(product.id))
      throw new RequestError("An update for this product is already saving.");
    if (product.stock + delta < 0)
      throw new RequestError(
        `Only ${product.stock} units are shown. Refresh or enter a smaller reduction.`,
      );
    if (product.stock + delta > 2147483647)
      throw new RequestError("This adjustment exceeds the maximum stock.");
    pending.current.add(product.id);
    revision.current++;
    setPendingIds([...pending.current]);
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, stock: item.stock + delta } : item,
      ),
    );
    const payload = { change: delta, requestId: crypto.randomUUID() };
    try {
      let result: { product: Product };
      try {
        result = await api(`products/${product.id}/stock`, "PATCH", payload);
      } catch (error) {
        // Retry ambiguous network failures with the SAME key; the database deduplicates it.
        if ((error as RequestError).status !== 0) throw error;
        result = await api(`products/${product.id}/stock`, "PATCH", payload);
      }
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? result.product : item)),
      );
    } catch (error) {
      // Only this row rolls back. Successful adjustments on other rows are retained.
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? product : item)),
      );
      throw error;
    } finally {
      pending.current.delete(product.id);
      revision.current++;
      setPendingIds([...pending.current]);
      void refresh(true);
    }
  }

  async function saveProduct(
    values: Record<string, unknown>,
    product: Product | null,
  ) {
    revision.current++;
    try {
      const result = await api<{ product: Product }>(
        product ? `products/${product.id}` : "products",
        product ? "PATCH" : "POST",
        { ...values, ...(product ? { version: product.version } : {}) },
      );
      setProducts((current) =>
        product
          ? current.map((item) =>
              item.id === product.id ? result.product : item,
            )
          : [result.product, ...current],
      );
      setNotice(
        product
          ? "Product details saved."
          : "Product added. Use its stock button to add units.",
      );
    } finally {
      revision.current++;
      void refresh(true);
    }
  }

  async function deleteProduct(product: Product) {
    revision.current++;
    try {
      await api(`products/${product.id}`, "DELETE", {
        version: product.version,
      });
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      setNotice("Product deleted. Its stock history is preserved.");
    } finally {
      revision.current++;
      void refresh(true);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await api("auth/logout", "POST");
      readSequence.current++;
      setUser(null);
      setProducts([]);
      setLogs([]);
      setLoaded(false);
      setError("");
      setNotice("");
      setView("inventory");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoggingOut(false);
    }
  }

  async function olderLogs() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    const sequence = readSequence.current;
    try {
      const result = await api<{
        logs: InventoryLog[];
        nextCursor: number | null;
      }>(`inventory-logs?before=${cursor}`);
      if (sequence !== readSequence.current) return;
      setLogs((current) => [
        ...current,
        ...result.logs.filter(
          (log) => !current.some((item) => item.id === log.id),
        ),
      ]);
      setCursor(result.nextCursor);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  }

  if (booting)
    return (
      <div className="boot-screen">
        <Brand />
        <span className="loading-ring" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (!user)
    return (
      <Auth
        onSignIn={(manager) => {
          setUser(manager);
          setError("");
        }}
        initialError={error}
      />
    );

  const categories = [
    ...new Set(products.map((product) => product.category)),
  ].sort();
  const filtered = products.filter(
    (product) =>
      `${product.name} ${product.id} ${product.category}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "all" || product.category === category) &&
      (status === "all" ||
        (status === "low"
          ? product.stock > 0 && product.stock <= 20
          : product.stock === 0)),
  );
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter((product) => product.stock <= 20).length;
  const valuation = products.reduce(
    (sum, product) => sum + Number(product.price) * product.stock,
    0,
  );
  const visibleLogs = logs.filter((log) =>
    `${log.product_name} ${log.manager_name} ${log.manager_id}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">B</span>
          <div>
            <strong>Blinkit operations</strong>
            <small>Shared workspace</small>
          </div>
          <span className="live-dot" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <button
            className={view === "inventory" ? "active" : ""}
            onClick={() => {
              setView("inventory");
              setQuery("");
            }}
          >
            <Icon name="grid" />
            Inventory<span className="nav-count">{products.length}</span>
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => {
              setView("history");
              setQuery("");
            }}
          >
            <Icon name="history" />
            Stock history
          </button>
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon">
            <Icon name="box" size={24} />
          </span>
          <strong>
            Small updates.
            <br />
            Everything in sync.
          </strong>
          <p>
            Every adjustment has a name, a time, and a place in your history.
          </p>
        </div>
        <div className="manager">
          <span className="manager-avatar">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>Manager #{user.id}</small>
          </div>
          <button
            className="icon-button"
            onClick={logout}
            disabled={loggingOut || pendingCount > 0}
            aria-label="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-slash">/</span>{" "}
            <strong>
              {view === "inventory" ? "Inventory" : "Stock history"}
            </strong>
          </span>
          <div className="topbar-right">
            <span className={`connection ${error ? "offline" : ""}`}>
              <i />
              {error
                ? "Needs attention"
                : synced
                  ? "Workspace connected"
                  : "Connecting…"}
            </span>
            <span className="topbar-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="content">
          <section className="page-heading">
            <div>
              <span className="eyebrow green">YOUR STORE, AT A GLANCE</span>
              <h1>
                {view === "inventory" ? "Inventory" : "Stock history"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "inventory"
                  ? "A place for every product. An account of every unit."
                  : "Every adjustment, with the manager who made it."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => void refresh()}
                disabled={refreshing || pendingCount > 0}
              >
                <Icon name="refresh" size={17} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              {view === "inventory" && (
                <button
                  className="button primary"
                  onClick={() => setDialog({ product: null })}
                >
                  <Icon name="plus" size={18} />
                  Add product
                </button>
              )}
            </div>
          </section>
          {error && (
            <div className="notice error" role="alert">
              <Icon name="alert" size={18} />
              {error}
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              <Icon name="check" size={18} />
              {notice}
              <button
                className="icon-button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          <section className="stats" aria-label="Inventory summary">
            <article>
              <div className="stat-heading">
                Total products
                <span className="stat-icon">
                  <Icon name="box" />
                </span>
              </div>
              <strong>{loaded ? count(products.length) : "—"}</strong>
              <small>Across {categories.length} categories</small>
            </article>
            <article>
              <div className="stat-heading">
                Units in stock
                <span className="stat-icon">
                  <Icon name="grid" />
                </span>
              </div>
              <strong>{loaded ? count(totalUnits) : "—"}</strong>
              <small>Available in your inventory</small>
            </article>
            <article>
              <div className="stat-heading">
                Needs attention
                <span className="stat-icon amber">
                  <Icon name="alert" />
                </span>
              </div>
              <strong>
                {loaded ? count(lowStock) : "—"}
                <span className="stat-unit">products</span>
              </strong>
              <small>Low or out of stock · ≤ 20 units</small>
            </article>
            <article className="value-stat">
              <div className="stat-heading">
                Inventory value<span className="stat-currency">₹</span>
              </div>
              <strong>{loaded ? money(valuation) : "—"}</strong>
              <small>Total value of available stock</small>
            </article>
          </section>
          <section className="inventory-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {view === "inventory" ? "All products" : "Activity ledger"}
                  <span className="pill">
                    {view === "inventory"
                      ? products.length
                      : `${logs.length} loaded`}
                  </span>
                </h2>
                <p>
                  {view === "inventory"
                    ? "Manage stock one product at a time."
                    : "Stock changes are saved together with their audit record."}
                </p>
              </div>
              <span className="sync-label">
                {synced ? `Last synced ${synced}` : "Waiting for inventory"}
              </span>
            </div>
            <div className="toolbar">
              <div className="search-field">
                <Icon name="search" size={19} />
                <input
                  aria-label={
                    view === "inventory" ? "Search products" : "Search history"
                  }
                  placeholder={
                    view === "inventory"
                      ? "Search by name, category or ID…"
                      : "Search by product or manager…"
                  }
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {view === "inventory" && (
                <div className="filters">
                  <select
                    aria-label="Filter category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter stock status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">All stock levels</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                  </select>
                </div>
              )}
            </div>
            {!loaded ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon name={error ? "alert" : "refresh"} size={32} />
                </span>
                <h3>
                  {error
                    ? "We couldn’t load your inventory."
                    : "Getting everything ready…"}
                </h3>
                <p>
                  {error
                    ? "Check the connection and use Refresh to try again."
                    : "Connecting to your shared workspace."}
                </p>
              </div>
            ) : view === "inventory" ? (
              filtered.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>PRODUCT</th>
                        <th>CATEGORY</th>
                        <th>UNIT PRICE</th>
                        <th>AVAILABLE STOCK</th>
                        <th>ADJUST STOCK</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          saving={pendingIds.includes(product.id)}
                          onChange={adjust}
                          onEdit={(product) => setDialog({ product })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">
                    <Icon name={products.length ? "search" : "box"} size={36} />
                  </span>
                  <span className="eyebrow green">
                    {products.length ? "LET’S TRY AGAIN" : "A FRESH START"}
                  </span>
                  <h3>
                    {products.length
                      ? "No products match your filters."
                      : "Your shelves are ready."}
                  </h3>
                  <p>
                    {products.length
                      ? "Try another search or clear your filters."
                      : "Add your first product, then bring your inventory to life with a stock update."}
                  </p>
                  {products.length ? (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                        setStatus("all");
                      }}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      onClick={() => setDialog({ product: null })}
                    >
                      <Icon name="plus" size={18} />
                      Add your first product
                    </button>
                  )}
                </div>
              )
            ) : visibleLogs.length ? (
              <div className="table-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>ADJUSTMENT</th>
                      <th>STOCK BEFORE → AFTER</th>
                      <th>MANAGER</th>
                      <th>DATE & TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.product_name}</strong>
                          <small>
                            PRD-{String(log.product_id).padStart(4, "0")}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`change-pill ${log.change > 0 ? "positive" : "negative"}`}
                          >
                            {log.change > 0 ? "+" : ""}
                            {count(log.change)} units
                          </span>
                        </td>
                        <td className="numeric">
                          {count(log.old_stock)}{" "}
                          <span className="muted-arrow">→</span>{" "}
                          <strong>{count(log.new_stock)}</strong>
                        </td>
                        <td>
                          <strong>{log.manager_name}</strong>
                          <small>Manager #{log.manager_id}</small>
                        </td>
                        <td>
                          <strong>
                            {new Date(log.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </strong>
                          <small>
                            {new Date(log.created_at).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              },
                            )}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon name="history" size={36} />
                </span>
                <h3>
                  {query
                    ? "No matching activity in the loaded records."
                    : "Your story starts with the first update."}
                </h3>
                <p>
                  {query
                    ? "Try another search or load older activity."
                    : "Stock changes will appear here with the manager ID, quantity, and time."}
                </p>
              </div>
            )}
            <footer className="panel-footer">
              <span>
                {view === "inventory"
                  ? `${filtered.length} of ${products.length} products`
                  : "History is kept even after a product is deleted."}
              </span>
              {view === "history" && cursor ? (
                <button
                  className="text-button"
                  onClick={olderLogs}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? "Loading…" : "Load older activity"}
                </button>
              ) : (
                <span>
                  <Icon name="check" size={14} /> Every stock update is
                  accounted for
                </span>
              )}
            </footer>
          </section>
          <footer className="page-footer">
            <span>Made for the people behind every stocked shelf.</span>
            <span>blinkit inventory · {new Date().getFullYear()}</span>
          </footer>
        </main>
      </div>
      {dialog && (
        <ProductDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSave={saveProduct}
          onDelete={deleteProduct}
        />
      )}
    </div>
  );
}
