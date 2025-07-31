// src/AdminAgentMonitor.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AgentMonitor.css"

function timeAgo(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function AdminAgentMonitor() {
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line
  }, [selectedAgent]);

  // Fetch all agents independently for dropdown
  async function fetchAgents() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found.");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get("http://localhost:5000/api/admin/agents", { headers });
      setAgents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load agents.");
      setAgents([]);
    }
  }

  // Fetch tasks filtered by selectedAgent or all if none selected
  async function fetchTasks() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token. Please login again.");
      const headers = { Authorization: `Bearer ${token}` };
      const url = selectedAgent
        ? `http://localhost:5000/api/admin/agent-tasks?agentId=${selectedAgent}`
        : `http://localhost:5000/api/admin/agent-tasks`;

      const res = await axios.get(url, { headers });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notifications-container" style={{ minHeight: 600, marginTop: 40 }}>
      <h2 style={{ fontWeight: 800, fontSize: 32, marginBottom: 30 }}>
        🕵️‍♂️ Agent Work Monitor
      </h2>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontWeight: 600 }}>Filter by Agent:</span>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 6, minWidth: 180 }}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent._id} value={agent._id}>
                {agent.name} ({agent.email})
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={fetchTasks}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 22px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading agent tasks...</p>
      ) : error ? (
        <div style={{ color: "#ef4444", margin: "16px 0" }}>
          <strong>Error:</strong> {error}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ color: "#22c55e", padding: 40 }}>
          <b>No assigned deliveries found for selected agent.</b>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 8 }}>
          <table
            cellPadding={9}
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "1rem",
              background: "#f5f7fb",
              borderRadius: 8,
              marginBottom: 20
            }}
          >
            <thead>
              <tr style={{ background: "#e0e7ef", userSelect: "none" }}>
                <th style={{ minWidth: 100 }}>Agent</th>
                <th style={{ minWidth: 120 }}>Tracking ID</th>
                <th style={{ minWidth: 110 }}>Status</th>
                <th style={{ minWidth: 150 }}>Assigned</th>
                <th style={{ minWidth: 100 }}>Work Age</th>
                <th style={{ minWidth: 150 }}>Created</th>
                <th style={{ minWidth: 150 }}>Last Update</th>
                <th style={{ minWidth: 130 }}>User</th>
                <th style={{ minWidth: 200 }}>Pickup</th>
                <th style={{ minWidth: 200 }}>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((d, i) => (
                <tr
                  key={d.deliveryId || i}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    background:
                      d.status?.toLowerCase() === "delivered"
                        ? "#ecfdf5"
                        : d.status?.toLowerCase() === "cancelled"
                        ? "#fef2f2"
                        : i % 2
                        ? "#fff"
                        : "#f6f9ff",
                    userSelect: "text",
                  }}
                >
                  <td style={{ fontWeight: 600 }}>
                    {d.agent?.name || "—"}
                    <br />
                    <span style={{ fontSize: "0.9em", color: "#555" }}>{d.agent?.email || ""}</span>
                  </td>
                  <td style={{ fontFamily: "monospace" }}>{d.trackingId || "-"}</td>
                  <td>{d.status || "-"}</td>
                  <td>{d.assignedAt ? new Date(d.assignedAt).toLocaleString() : "-"}</td>
                  <td>{d.assignedAt ? timeAgo(d.assignedAt) : "-"}</td>
                  <td>{d.createdAt ? new Date(d.createdAt).toLocaleString() : "-"}</td>
                  <td>{d.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : "-"}</td>
                  <td>
                    <span>
                      {d.user?.name || "-"}
                      <br />
                      <span style={{ fontSize: "0.9em", color: "#777" }}>{d.user?.email || ""}</span>
                    </span>
                  </td>
                  <td style={{ maxWidth: 195, whiteSpace: "normal" }}>{d.pickupAddress || "-"}</td>
                  <td style={{ maxWidth: 195, whiteSpace: "normal" }}>{d.deliveryAddress || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "right", color: "#4b5563", fontSize: 17, marginTop: 10 }}>
            Showing <b>{tasks.length}</b> assignment{tasks.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
