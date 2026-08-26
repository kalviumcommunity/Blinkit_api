"use client";

import { useState } from "react";
import productsData from "../../data/products.js";

export default function Dashboard() {
  const [products, setProducts] = useState(productsData);

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + product.stock,
    0
  );

  const lowStockProducts = products.filter(
    (product) => product.stock <= product.threshold
  );

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  );

  const increaseStock = (id) => {
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
  };

  const decreaseStock = (id) => {
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
  };

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-logo">
            blinkit
          </div>

          <span>Inventory Manager</span>
        </div>

        <nav className="sidebar-nav">

          <div className="nav-section">
            <p className="nav-title">MAIN</p>

            <a className="nav-item active">
              <span>▣</span>
              Dashboard
            </a>
          </div>

          <div className="nav-section">

            <p className="nav-title">INVENTORY</p>

            <a className="nav-item">
              <span>▤</span>
              Products
            </a>

            <a className="nav-item">
              <span>↕</span>
              Stock Update
            </a>

            <a className="nav-item">
              <span>▣</span>
              Categories
            </a>

          </div>

          <div className="nav-section">

            <p className="nav-title">AUDIT & REPORTS</p>

            <a className="nav-item">
              <span>▤</span>
              Inventory Logs
            </a>

            <a className="nav-item">
              <span>▣</span>
              Reports
            </a>

          </div>

          <div className="nav-section">

            <p className="nav-title">SETTINGS</p>

            <a className="nav-item">
              <span>◉</span>
              Profile
            </a>

            <a className="nav-item">
              <span>⚙</span>
              Settings
            </a>

          </div>

        </nav>

        <div className="collapse-button">
          ← Collapse
        </div>

      </aside>


      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* HEADER */}

        <header className="top-header">

          <div>

            <h1>Dashboard</h1>

            <p>
              Overview of your inventory and stock activities
            </p>

          </div>

          <div className="header-right">

            <button className="icon-button">
              ◔
            </button>

            <button className="icon-button">
              ♧
            </button>

            <div className="profile">

              <div className="profile-avatar">
                M
              </div>

              <div>
                <strong>Manager</strong>
                <small>manager@blinkit.com</small>
              </div>

              <span>⌄</span>

            </div>

          </div>

        </header>


        {/* TOOLBAR */}

        <div className="toolbar">

          <button className="date-button">
            📅 &nbsp; 12 May 2025 - 18 May 2025
            <span>⌄</span>
          </button>

          <button className="export-button">
            ↓ &nbsp; Export Report
          </button>

        </div>


        {/* STAT CARDS */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-top">
              <span>Total Products</span>

              <div className="stat-icon green">
                ▣
              </div>
            </div>

            <h2>
              {totalProducts.toLocaleString()}
            </h2>

            <p className="positive">
              ↑ 12.5% from last week
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>Total Stock</span>

              <div className="stat-icon blue">
                ▦
              </div>

            </div>

            <h2>
              {totalStock.toLocaleString()}
            </h2>

            <p className="positive">
              ↑ 8.3% from last week
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>Low Stock Items</span>

              <div className="stat-icon yellow">
                ⚠
              </div>

            </div>

            <h2>
              {lowStockProducts.length}
            </h2>

            <p className="warning-text">
              {lowStockProducts.length} items need attention
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>Stock Out Items</span>

              <div className="stat-icon purple">
                ▢
              </div>

            </div>

            <h2>
              {outOfStockProducts.length}
            </h2>

            <p className="danger-text">
              1 item was out of stock
            </p>

          </div>

        </section>


        {/* MIDDLE SECTION */}

        <section className="middle-grid">

          {/* STOCK TREND */}

          <div className="panel stock-trend">

            <div className="panel-header">

              <div>
                <h3>Stock Trend</h3>
                <p>Inventory movement over time</p>
              </div>

              <select>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 3 Months</option>
              </select>

            </div>


            <div className="chart">

              <div className="chart-y-axis">

                <span>40K</span>
                <span>30K</span>
                <span>20K</span>
                <span>10K</span>
                <span>0</span>

              </div>

              <div className="chart-area">

                <div className="grid-line line-1"></div>
                <div className="grid-line line-2"></div>
                <div className="grid-line line-3"></div>
                <div className="grid-line line-4"></div>
                <div className="grid-line line-5"></div>

                <svg
                  viewBox="0 0 700 260"
                  preserveAspectRatio="none"
                  className="stock-chart"
                >

                  <defs>

                    <linearGradient
                      id="stockGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >

                      <stop
                        offset="0%"
                        stopOpacity="0.35"
                      />

                      <stop
                        offset="100%"
                        stopOpacity="0"
                      />

                    </linearGradient>

                  </defs>


                  <path
                    d="
                    M 20 125
                    L 120 145
                    L 220 130
                    L 320 128
                    L 420 80
                    L 520 85
                    L 620 110
                    "
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />


                  <path
                    d="
                    M 20 125
                    L 120 145
                    L 220 130
                    L 320 128
                    L 420 80
                    L 520 85
                    L 620 110
                    L 620 250
                    L 20 250
                    Z
                    "
                    fill="url(#stockGradient)"
                    stroke="none"
                  />


                  <circle cx="20" cy="125" r="5" />
                  <circle cx="120" cy="145" r="5" />
                  <circle cx="220" cy="130" r="5" />
                  <circle cx="320" cy="128" r="5" />
                  <circle cx="420" cy="80" r="5" />
                  <circle cx="520" cy="85" r="5" />
                  <circle cx="620" cy="110" r="5" />

                </svg>


                <div className="chart-dates">

                  <span>12 May</span>
                  <span>13 May</span>
                  <span>14 May</span>
                  <span>15 May</span>
                  <span>16 May</span>
                  <span>17 May</span>
                  <span>18 May</span>

                </div>

              </div>

            </div>

          </div>


          {/* RECENT ACTIVITIES */}

          <div className="panel activity-panel">

            <div className="panel-header">

              <div>
                <h3>Recent Stock Activities</h3>
                <p>Latest inventory changes</p>
              </div>

              <button className="view-link">
                View All
              </button>

            </div>


            <div className="activities">

              <Activity
                letter="A"
                name="Amul Milk"
                text="Stock increased by 20"
                value="+20"
                time="2 mins ago"
                positive
              />

              <Activity
                letter="M"
                name="Maggi Noodles"
                text="Stock decreased by 10"
                value="-10"
                time="10 mins ago"
              />

              <Activity
                letter="B"
                name="Brown Bread"
                text="Stock increased by 15"
                value="+15"
                time="1 hour ago"
                positive
              />

              <Activity
                letter="C"
                name="Coca Cola"
                text="Stock decreased by 5"
                value="-5"
                time="2 hours ago"
              />

              <Activity
                letter="A"
                name="Amul Milk"
                text="Stock increased by 30"
                value="+30"
                time="3 hours ago"
                positive
              />

            </div>

          </div>

        </section>


        {/* LOWER SECTION */}

        <section className="bottom-grid">

          {/* LOW STOCK */}

          <div className="panel low-stock-panel">

            <div className="panel-header">

              <div>
                <h3>Low Stock Alerts</h3>
                <p>Products that need attention</p>
              </div>

              <button className="view-link">
                View All
              </button>

            </div>


            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Low Stock Threshold</th>
                    <th>Status</th>
                    <th>Action</th>

                  </tr>

                </thead>


                <tbody>

                  {products.map((product) => {

                    const isLow =
                      product.stock <= product.threshold;

                    const isOut =
                      product.stock === 0;

                    return (

                      <tr key={product.id}>

                        <td>

                          <div className="product-name">

                            <span className="product-emoji">
                              {product.image}
                            </span>

                            <strong>
                              {product.name}
                            </strong>

                          </div>

                        </td>

                        <td>
                          {product.category}
                        </td>

                        <td className="stock-number">
                          {product.stock}
                        </td>

                        <td>
                          {product.threshold}
                        </td>

                        <td>

                          {isOut ? (

                            <span className="status out">
                              Out of Stock
                            </span>

                          ) : isLow ? (

                            <span className="status low">
                              Low Stock
                            </span>

                          ) : (

                            <span className="status healthy">
                              Healthy
                            </span>

                          )}

                        </td>

                        <td>

                          <button
                            className="update-button"
                            onClick={() =>
                              increaseStock(product.id)
                            }
                          >
                            Update Stock
                          </button>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          </div>


          {/* RIGHT SIDE */}

          <div className="right-column">

            {/* QUICK ACTIONS */}

            <div className="panel quick-actions">

              <div className="panel-header">

                <h3>Quick Actions</h3>

              </div>

              <div className="quick-buttons">

                <button
                  onClick={() => increaseStock("1")}
                >
                  <span>＋</span>
                  Increase Stock
                </button>

                <button
                  onClick={() => decreaseStock("1")}
                >
                  <span>−</span>
                  Decrease Stock
                </button>

                <button>
                  <span>＋</span>
                  Add New Product
                </button>

                <button>
                  <span>▤</span>
                  View All Logs
                </button>

              </div>

            </div>


            {/* TOP PRODUCTS */}

            <div className="panel top-products">

              <div className="panel-header">

                <h3>Top Products</h3>

                <button className="view-link">
                  View All
                </button>

              </div>


              {products.slice(0, 5).map((product) => (

                <div
                  className="top-product"
                  key={product.id}
                >

                  <div className="top-product-image">
                    {product.image}
                  </div>

                  <div className="top-product-info">

                    <strong>
                      {product.name}
                    </strong>

                    <small>
                      {product.category}
                    </small>

                  </div>

                  <div className="top-product-stock">

                    <strong>
                      {product.stock}
                    </strong>

                    <small>
                      units
                    </small>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}


function Activity({
  letter,
  name,
  text,
  value,
  time,
  positive,
}) {
  return (

    <div className="activity">

      <div className="activity-avatar">
        {letter}
      </div>

      <div className="activity-info">

        <strong>
          {name}
        </strong>

        <span>
          {text}
        </span>

      </div>

      <div
        className={
          positive
            ? "activity-value positive"
            : "activity-value negative"
        }
      >
        {value}

        <small>
          {time}
        </small>

      </div>

    </div>

  );
}