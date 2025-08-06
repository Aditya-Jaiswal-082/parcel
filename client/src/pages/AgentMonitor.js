import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminAgentMonitor.css";

// Utility to show relative time
function timeAgo(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString();
}

// Your secret code setup here - change as needed
const SECRET_CODE = "1234";

export default function AdminAgentMonitor() {
  // States
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);

  const [filters, setFilters] = useState({
    agentId: "",
    status: "",
    createdFrom: "",
    createdTo: "",
    assignedFrom: "",
    assignedTo: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState([]);
  const [earningsFilters, setEarningsFilters] = useState({
    from: "",
    to: ""
  });
  const [secretInput, setSecretInput] = useState("");
  const [hasSecretAccess, setHasSecretAccess] = useState(false);

  // Load all agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch tasks on mount and when agent filter changes
  useEffect(() => {
    fetchTasks();
  }, [filters.agentId]);

  // Filter tasks on filters or when received new data
  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  // Fetch aggregated earnings data when secret access granted or filters change
  useEffect(() => {
    if (hasSecretAccess) {
      fetchEarnings();
    }
  }, [earningsFilters, hasSecretAccess]);

  async function fetchAgents() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token, please login");
      const { data } = await axios.get("http://localhost:5000/api/admin/agents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load agents.");
    }
  }

  async function fetchTasks() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token, please login");
      let url = "http://localhost:5000/api/admin/agent-tasks";
      if (filters.agentId) {
        url += `?agentId=${filters.agentId}`;
      }
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...tasks];

    if (filters.status) {
      filtered = filtered.filter(
        t => (t.status?.toLowerCase() || "") === filters.status.toLowerCase()
      );
    }
    if (filters.createdFrom) {
      const fromDate = new Date(filters.createdFrom);
      filtered = filtered.filter(t => new Date(t.createdAt) >= fromDate);
    }
    if (filters.createdTo) {
      const toDate = new Date(filters.createdTo);
      filtered = filtered.filter(t => new Date(t.createdAt) <= toDate);
    }
    if (filters.assignedFrom) {
      const fromDate = new Date(filters.assignedFrom);
      filtered = filtered.filter(t => new Date(t.assignedAt) >= fromDate);
    }
    if (filters.assignedTo) {
      const toDate = new Date(filters.assignedTo);
      filtered = filtered.filter(t => new Date(t.assignedAt) <= toDate);
    }

    setFilteredTasks(filtered);
  }

  // Fetch earnings aggregated by agent
  async function fetchEarnings() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token, please login");
      let url = "http://localhost:5000/api/admin/agent-earnings";
      const params = [];
      if (earningsFilters.from) params.push(`from=${earningsFilters.from}`);
      if (earningsFilters.to) params.push(`to=${earningsFilters.to}`);
      if (params.length) url += `?${params.join("&")}`;

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEarnings(Array.isArray(data) ? data : []);
    } catch (err) {
      // silently fail or show message
    }
  }

  function handleSecretInputChange(e) {
    const val = e.target.value;
    setSecretInput(val);
    if (val === SECRET_CODE) {
      setHasSecretAccess(true);
    } else {
      setHasSecretAccess(false);
    }
  }

  return (
    <div className="agent-monitor-container">
      <h2 tabIndex="0">🕵️‍♂️ Agent Work Monitor</h2>
      
      <div className="filter-bar" role="region" aria-label="Task filters">
        <label>
          Agent:
          <select
            aria-label="Filter by Agent"
            value={filters.agentId}
            onChange={e => setFilters(f => ({ ...f, agentId: e.target.value }))}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent._id} value={agent._id}>
                {agent.name} ({agent.email})
              </option>
            ))}
          </select>
        </label>

        <label>
          Status:
          <select
            aria-label="Filter by Status"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Created From:
          <input
            type="date"
            aria-label="Created From Date"
            value={filters.createdFrom}
            onChange={e => setFilters(f => ({ ...f, createdFrom: e.target.value }))}
          />
        </label>

        <label>
          Created To:
          <input
            type="date"
            aria-label="Created To Date"
            value={filters.createdTo}
            onChange={e => setFilters(f => ({ ...f, createdTo: e.target.value }))}
          />
        </label>

        <label>
          Assigned From:
          <input
            type="date"
            aria-label="Assigned From Date"
            value={filters.assignedFrom}
            onChange={e => setFilters(f => ({ ...f, assignedFrom: e.target.value }))}
          />
        </label>

        <label>
          Assigned To:
          <input
            type="date"
            aria-label="Assigned To Date"
            value={filters.assignedTo}
            onChange={e => setFilters(f => ({ ...f, assignedTo: e.target.value }))}
          />
        </label>

        <button
          className="refresh-button"
          onClick={() => fetchTasks()}
          aria-label="Refresh data"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="secret-access-container" style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="secretCodeInput">Enter Secret Code to Reveal Totals:</label>
        <input
          id="secretCodeInput"
          type="password"
          value={secretInput}
          onChange={handleSecretInputChange}
          placeholder="Secret Code"
          className="secret-code-input"
          aria-label="Secret code input"
        />
      </div>

      {hasSecretAccess && (
        <div className="earnings-summary" aria-live="polite" aria-atomic="true">
          <h3>Earnings Summary</h3>
          <p>Total Deliveries Completed Today: {earnings.reduce((sum, a) => sum + (a.date === new Date().toDateString() ? a.totalEarnings : 0), 0).toFixed(2)}</p>
          <p>Total Deliveries Completed This Month: {earnings.reduce((sum, a) => {
            const month = new Date(a.date).getMonth();
            const now = new Date().getMonth();
            return month === now ? sum + a.totalEarnings : sum;
          }, 0).toFixed(2)}</p>
        </div>
      )}

      {error && <div className="message" role="alert">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : filteredTasks.length === 0 ? (
        <p className="info-message">No tasks found matching filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="agent-tasks-table" aria-label="Assigned deliveries table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tracking ID</th>
                <th>Status</th>
                <th>Assigned At</th>
                <th>Work Age</th>
                <th>Created At</th>
                <th>Last Update</th>
                <th>User</th>
                <th>Pickup Address</th>
                <th>Delivery Address</th>
              </tr>
            </thead>

            <tbody>
              {filteredTasks.map((task, idx) => (
                <tr key={task.deliveryId || idx} tabIndex={0}>
                  <td className="agent-cell">
                    <strong>{task.agent?.name || "N/A"}</strong>
                    <small>{task.agent?.email || ""}</small>
                  </td>
                  <td className="tracking-id">{task.trackingId || "N/A"}</td>
                  <td>
                    <span className={`status-badge ${task.status?.toLowerCase() || "default"}`}>
                      {task.status || "Unknown"}
                    </span>
                  </td>
                  <td className="date-cell">{task.assignedAt ? new Date(task.assignedAt).toLocaleString() : "N/A"}</td>
                  <td className="work-age">{task.assignedAt ? timeAgo(task.assignedAt) : "N/A"}</td>
                  <td className="date-cell">{task.createdAt ? new Date(task.createdAt).toLocaleString() : "N/A"}</td>
                  <td className="date-cell">{task.lastUpdated ? new Date(task.lastUpdated).toLocaleString() : "N/A"}</td>
                  <td className="user-cell">
                    <strong>{task.user?.name || "N/A"}</strong>
                    <small>{task.user?.email || ""}</small>
                  </td>
                  <td title={task.pickupAddress} className="pickup-cell">{task.pickupAddress || "N/A"}</td>
                  <td title={task.deliveryAddress} className="delivery-cell">{task.deliveryAddress || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="task-count" aria-live="polite">
            Showing {filteredTasks.length} assignments
          </div>
        </div>
      )}
    </div>
  );
}
