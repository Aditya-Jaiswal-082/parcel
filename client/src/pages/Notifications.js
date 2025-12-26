// src/pages/Notifications.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Notifications.css";
import api from "../api/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0,
  });

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50; // items per page, max 100 capped on backend

  const userId = localStorage.getItem("userId");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // Build the API endpoint with pagination params
  function buildEndpoint(pageNum) {
    const offset = pageNum * PAGE_SIZE;
    if (role === "admin") {
      return `/api/notifications/admin?limit=${PAGE_SIZE}&offset=${offset}`;
    }
    if (role === "agent") {
      return `/api/notifications/agent/${userId}?limit=${PAGE_SIZE}&offset=${offset}`;
    }
    if (role === "user") {
      return `/api/notifications/user/${userId}?limit=${PAGE_SIZE}&offset=${offset}`;
    }
    return `/api/notifications/${userId}?limit=${PAGE_SIZE}&offset=${offset}`;
  }

  // Format relative time ago text
  function getTimeAgo(timestamp) {
    if (!timestamp) return "Unknown";
    const now = new Date();
    const then = new Date(timestamp);
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return then.toLocaleDateString();
  }

  // Format notification message: For status updates, show tracking Id + status nicely
  function formatNotificationMessage(notification) {
    const msg = notification.message || "";
    if (msg.toLowerCase().includes("status updated")) {
      // Extract tracking ID and status
      const regex = /(?:tracking id[: ]*)?([A-Z0-9\-]+)[^a-zA-Z0-9]*status updated to[ ]*([a-zA-Z_]+)/i;
      const match = msg.match(regex);
      if (match) {
        const trackingId = match[1];
        const status = match[2].replace(/_/g, " ");
        return `📦 [Tracking ID: ${trackingId}] status updated to ${status}`;
      }
    }
    return msg;
  }

  // Filter notifications visible only to assigned agents and relevant users
  function filterVisibleNotifications(notifs) {
    if (role !== "agent") return notifs;
    // Only show notifications if deliveryAgentId matches current userId or no deliveryAgentId (general)
    return notifs.filter((n) => !n.deliveryAgentId || n.deliveryAgentId === userId);
  }

  // Categorize notification for filtering
  function categorizeNotification(msg) {
    if (!msg) return "general";
    const text = msg.toLowerCase();
    if (role === "admin") {
      if (text.includes("new delivery")) return "deliveries";
      if (text.includes("assigned")) return "assignments";
      if (text.includes("completed") || text.includes("cancelled") || text.includes("delivered"))
        return "status_updates";
      return "system";
    }
    if (role === "agent") {
      if (text.includes("assigned") && text.includes("you")) return "assignments";
      if (text.includes("new delivery")) return "new_deliveries";
      return "updates";
    }
    if (role === "user") {
      if (text.includes("order")) return "orders";
      if (text.includes("status") || text.includes("delivered") || text.includes("completed"))
        return "status_updates";
      return "general";
    }
    return "general";
  }

  // Get priority level: high, medium, low for styling
  function getPriority(msg) {
    if (!msg) return "low";
    const text = msg.toLowerCase();
    if (text.includes("urgent") || text.includes("cancelled") || text.includes("failed"))
      return "high";
    if (text.includes("assigned") || text.includes("completed")) return "medium";
    return "low";
  }

  // Get icon per notification type
  function getIcon(msg) {
    if (!msg) return "🔔";
    const text = msg.toLowerCase();
    if (text.includes("delivery")) return "📦";
    if (text.includes("assigned")) return "👨‍✈️";
    if (text.includes("completed") || text.includes("delivered")) return "✅";
    if (text.includes("cancelled") || text.includes("failed")) return "❌";
    if (text.includes("status")) return "📊";
    if (text.includes("payment")) return "💳";
    return "🔔";
  }

  // Get color for icons and badges
  function getColor(msg) {
    if (!msg) return "#6c757d";
    const text = msg.toLowerCase();
    if (text.includes("completed")) return "#28a745";
    if (text.includes("cancelled") || text.includes("failed")) return "#dc3545";
    if (text.includes("assigned")) return "#007bff";
    if (text.includes("urgent")) return "#fd7e14";
    return "#6c757d";
  }

  // Calculate notification stats
  function calculateStats(notifs) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    setStats({
      total: notifs.length,
      unread: notifs.filter((n) => !n.read).length,
      today: notifs.filter((n) => new Date(n.createdAt || n.timestamp) >= todayStart).length,
      thisWeek: notifs.filter((n) => new Date(n.createdAt || n.timestamp) >= weekStart).length,
    });
  }

  // Fetch notifications from server with pagination & processing
  const fetchNotifications = useCallback(async () => {
    if (!userId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = buildEndpoint(page);
      const res = await axios.get(`http://localhost:5000${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let newNotifs = res.data || [];
      newNotifs = filterVisibleNotifications(newNotifs);
      const processed = newNotifs.map((n) => {
        const baseMsg = formatNotificationMessage(n);
        return {
          ...n,
          message: baseMsg,
          category: categorizeNotification(baseMsg),
          priority: getPriority(baseMsg),
          icon: getIcon(baseMsg),
          color: getColor(baseMsg),
          timeAgo: getTimeAgo(n.createdAt || n.timestamp),
        };
      });

      setNotifications((old) => (page === 0 ? processed : [...old, ...processed]));
      setFilteredNotifications((old) => (page === 0 ? processed : [...old, ...processed]));
      calculateStats(page === 0 ? processed : [...notifications, ...processed]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load notifications.");
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location = "/login";
      }
    } finally {
      setLoading(false);
    }
  }, [page, userId, token, role]); // Removed 'notifications' from dep

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Filter and search notifications based on category and search query
  useEffect(() => {
    let filtered = [...notifications];
    if (filter !== "all") filtered = filtered.filter((n) => n.category === filter);

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.message.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          (n.priority && n.priority.toLowerCase().includes(q))
      );
    }
    setFilteredNotifications(filtered);
  }, [notifications, filter, searchQuery]);

  // Select or deselect a single notification
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setIsSelectAll(false);
      return newSet;
    });
  }

  // Select/deselect all notifications in filtered list
  function toggleSelectAll() {
    if (isSelectAll) {
      setSelectedIds(new Set());
      setIsSelectAll(false);
    } else {
      const allVisibleIds = filteredNotifications.map((n) => n._id);
      setSelectedIds(new Set(allVisibleIds));
      setIsSelectAll(true);
    }
  }

  // Bulk delete selected notifications
  async function deleteSelected() {
    if (selectedIds.size === 0) {
      alert("Please select notifications to delete.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${selectedIds.size} selected notifications? This cannot be undone.`
      )
    )
      return;

    try {
      for (const id of selectedIds) {
        await api.delete(`api/notifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const remaining = notifications.filter((n) => !selectedIds.has(n._id));
      setNotifications(remaining);
      setFilteredNotifications(remaining);
      setSelectedIds(new Set());
      setIsSelectAll(false);
      calculateStats(remaining);
      alert("Selected notifications deleted.");
    } catch {
      alert("Error deleting some notifications, please try again.");
    }
  }

  // Bulk mark selected notifications as read
  async function markSelectedRead() {
    if (selectedIds.size === 0) {
      alert("Please select notifications to mark as read.");
      return;
    }
    try {
      for (const id of selectedIds) {
        await api.patch(
          `api/notifications/${id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      const updated = notifications.map((n) =>
        selectedIds.has(n._id) ? { ...n, read: true } : n
      );
      setNotifications(updated);
      setFilteredNotifications(updated);
      setSelectedIds(new Set());
      setIsSelectAll(false);
      calculateStats(updated);
      alert("Selected notifications marked as read.");
    } catch {
      alert("Error marking notifications, please try again.");
    }
  }

  // Mark single notification as read
  async function markAsRead(id, index) {
    if (notifications[index].read) return;
    try {
      await api.patch(
        `api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = [...notifications];
      updated[index].read = true;
      setNotifications(updated);
      calculateStats(updated);
    } catch {
      // ignore error silently
    }
  }

  // Delete single notification
  async function deleteSingle(id) {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.delete(`api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const remaining = notifications.filter((n) => n._id !== id);
      setNotifications(remaining);
      setFilteredNotifications(remaining);
      calculateStats(remaining);
      alert("Notification deleted.");
    } catch {
      alert("Error deleting notification.");
    }
  }

  // Load more notifications (pagination)
  function loadMore() {
    if (notifications.length >= 100) return;
    setPage((p) => p + 1);
  }

  // Categories based on role
  function getCategories() {
    switch (role) {
      case "admin":
        return ["all", "deliveries", "assignments", "status_updates", "system"];
      case "agent":
        return ["all", "assignments", "new_deliveries", "updates"];
      case "user":
        return ["all", "orders", "status_updates", "general"];
      default:
        return ["all"];
    }
  }

  // Render loading UI
  if (loading && notifications.length === 0) {
    return (
      <div className="page-content">
        <div className="notifications-container">
          <div className="notifications-header">
            <h2>🔔 Notifications</h2>
          </div>
          <div className="loading-state" role="status" aria-live="polite">
            <div className="loading-spinner">🔄</div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error UI
  if (error) {
    return (
      <div className="page-content">
        <div className="notifications-container" role="alert">
          <div className="notifications-header">
            <h2>🔔 Notifications</h2>
          </div>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Failed to load notifications</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchNotifications}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="page-content" role="main">
      <div className="notifications-container">
        {/* Header */}
        <header className="notifications-header">
          <div className="header-left" tabIndex={-1}>
            <h2>🔔 Notifications</h2>
            <p className="user-info" aria-label={`Logged in as ${user.name}, role ${role}`}>
              {user.name} ({role})
            </p>
          </div>
          <div className="header-right" aria-label="Notification bulk actions">
            <button
              onClick={() => {
                setPage(0);
                fetchNotifications();
              }}
              className="refresh-btn"
              aria-label="Refresh notifications"
            >
              🔄 Refresh
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={markSelectedRead}
                  className="mark-read-btn"
                  aria-label="Mark selected notifications as read"
                  type="button"
                >
                  ✅ Mark Read
                </button>
                <button
                  onClick={deleteSelected}
                  className="delete-selected-btn"
                  aria-label="Delete selected notifications"
                  type="button"
                >
                  🗑️ Delete Selected
                </button>
              </>
            )}
          </div>
        </header>

        {/* Stats */}
        <section className="notifications-stats" aria-label="Notification statistics" role="region">
          <div className="stat-card" tabIndex={0}>
            <p className="stat-number">{notifications.length}</p>
            <p className="stat-label">Total</p>
          </div>
          <div className="stat-card" tabIndex={0}>
            <p className="stat-number">{notifications.filter((n) => !n.read).length}</p>
            <p className="stat-label">Unread</p>
          </div>
        </section>

        {/* Filters */}
        <nav
          className="notifications-filters"
          aria-label="Filter notifications by category"
          role="toolbar"
        >
          {getCategories().map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`filter-btn ${filter === cat ? "active" : ""}`}
              aria-pressed={filter === cat}
              type="button"
            >
              {{
                all: "🔔 All",
                deliveries: "📦 Deliveries",
                assignments: "👨‍✈️ Assignments",
                status_updates: "📊 Status Updates",
                system: "📡 System",
                new_deliveries: "🆕 New Deliveries",
                updates: "🔄 Updates",
                orders: "🛒 Orders",
                general: "📋 General",
              }[cat] || cat}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div className="notification-search-container" style={{ marginBottom: 14 }}>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search notifications..."
            aria-label="Search notifications"
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "8px 12px",
              borderRadius: 20,
              border: "1px solid #ccc",
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Select all checkbox */}
        <div
          className="select-all-container"
          style={{ marginBottom: 16, userSelect: "none" }}
        >
          <input
            type="checkbox"
            id="select-all"
            checked={isSelectAll}
            onChange={toggleSelectAll}
            aria-checked={isSelectAll}
          />
          <label htmlFor="select-all" style={{ marginLeft: 8 }}>
            Select All Visible
          </label>
        </div>

        {/* Notifications list */}
        <section
          className="notifications-list"
          role="list"
          aria-live="polite"
          aria-relevant="additions removals"
        >
          {filteredNotifications.length === 0 ? (
            <div className="empty-state" role="status" aria-label="No notifications">
              <div className="empty-icon">📭</div>
              <p>
                {filter === "all"
                  ? "You're all caught up!"
                  : `No notifications in category '${filter}'.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif, idx) => {
              const isSelected = selectedIds.has(notif._id);
              return (
                <article
                  key={notif._id}
                  className={`notification-item ${!notif.read ? "unread" : ""} priority-${notif.priority}`}
                  role="listitem"
                  tabIndex={0}
                  aria-selected={isSelected ? "true" : "false"}
                >
                  <input
                    type="checkbox"
                    className="notification-select-checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(notif._id)}
                    aria-label={`Select notification: ${
                      notif.message.length > 40
                        ? notif.message.substr(0, 40) + "..."
                        : notif.message
                    }`}
                    style={{
                      position: "absolute",
                      top: "18px",
                      left: "6px",
                      width: "18px",
                      height: "18px",
                    }}
                  />
                  <div
                    className="notification-icon"
                    aria-hidden="true"
                    style={{ color: notif.color }}
                    title={notif.category}
                  >
                    {notif.icon}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notif.message}</p>
                    <div
                      className="notification-meta"
                      aria-label={`Notification metadata: received ${notif.timeAgo}, category ${notif.category}`}
                    >
                      <span className="notification-time">🕒 {notif.timeAgo}</span>
                      <span className="notification-category">
                        📂 {notif.category.replace(/_/g, " ")}
                      </span>
                      {notif.priority === "high" && <span className="priority-badge">🔥 High</span>}
                    </div>
                  </div>
                  <div className="notification-actions" aria-hidden="true">
                    {!notif.read && (
                      <button
                        className="action-btn read-btn"
                        onClick={() => markAsRead(notif._id, idx)}
                        aria-label="Mark notification as read"
                        title="Mark as Read"
                        type="button"
                      >
                        👁️
                      </button>
                    )}
                    <button
                      className="action-btn delete-btn"
                      onClick={() => deleteSingle(notif._id)}
                      aria-label="Delete notification"
                      title="Delete"
                      type="button"
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Load More Button */}
        {notifications.length >= PAGE_SIZE && notifications.length < 100 && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              className="load-more-btn"
              onClick={() => setPage(page + 1)}
              aria-label="Load more notifications"
              type="button"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
