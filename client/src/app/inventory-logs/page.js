"use client";

import { useEffect, useState } from "react";
import { getInventoryLogs } from "../../lib/api";

export default function InventoryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getInventoryLogs();
        setLogs(data);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <main style={{ padding: 30 }}>Loading logs...</main>;
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>Inventory Logs</h1>

      <p>History of all stock changes.</p>

      <div style={{ marginTop: 30 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Manager ID</th>
              <th>Change</th>
              <th>Old Stock</th>
              <th>New Stock</th>
              <th>Time</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.productId}</td>
                <td>{log.managerId}</td>
                <td>
                  {log.change > 0
                    ? `+${log.change}`
                    : log.change}
                </td>
                <td>{log.oldStock}</td>
                <td>{log.newStock}</td>
                <td>
                  {log.createdAt
                    ? new Date(
                        log.createdAt
                      ).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}