// src/pages/Notifications.js
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0
  });

  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Notification categories based on role
  const getNotificationCategories = () => {
    switch (userRole) {
      case 'admin':
        return ['all', 'deliveries', 'assignments', 'status_updates', 'system'];
      case 'agent':
        return ['all', 'assignments', 'new_deliveries', 'updates'];
      case 'user':
        return ['all', 'orders', 'status_updates', 'general'];
      default:
        return ['all'];
    }
  };

  // Enhanced notification fetching with role-based filtering
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let endpoint;
      // Role-based endpoint selection
      switch (userRole) {
        case 'admin':
          endpoint = `http://localhost:5000/api/notifications/admin`;
          break;
        case 'agent':
          endpoint = `http://localhost:5000/api/notifications/agent/${userId}`;
          break;
        case 'user':
          endpoint = `http://localhost:5000/api/notifications/user/${userId}`;
          break;
        default:
          endpoint = `http://localhost:5000/api/notifications/${userId}`;
      }

      const res = await axios.get(endpoint, { headers });
      
      // Process and enhance notifications
      const processedNotifications = res.data.map(notification => ({
        ...notification,
        timeAgo: getTimeAgo(notification.createdAt || notification.timestamp),
        category: categorizeNotification(notification.message, userRole),
        priority: getPriority(notification.message),
        icon: getNotificationIcon(notification.message),
        color: getNotificationColor(notification.message)
      }));

      // Sort by timestamp (newest first)
      processedNotifications.sort((a, b) => 
        new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
      );

      setNotifications(processedNotifications);
      setFilteredNotifications(processedNotifications);
      calculateStats(processedNotifications);

    } catch (err) {
      console.error('❌ Error fetching notifications:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch notifications');
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Categorize notifications based on content and role
  const categorizeNotification = (message, role) => {
    const lowerMessage = message.toLowerCase();
    
    if (role === 'admin') {
      if (lowerMessage.includes('new delivery') && lowerMessage.includes('created')) return 'deliveries';
      if (lowerMessage.includes('assigned') || lowerMessage.includes('agent')) return 'assignments';
      if (lowerMessage.includes('completed') || lowerMessage.includes('cancelled') || lowerMessage.includes('delivered')) return 'status_updates';
      return 'system';
    } else if (role === 'agent') {
      if (lowerMessage.includes('assigned') && lowerMessage.includes('you')) return 'assignments';
      if (lowerMessage.includes('new delivery')) return 'new_deliveries';
      return 'updates';
    } else if (role === 'user') {
      if (lowerMessage.includes('order') || lowerMessage.includes('delivery')) return 'orders';
      if (lowerMessage.includes('status') || lowerMessage.includes('completed') || lowerMessage.includes('delivered')) return 'status_updates';
      return 'general';
    }
    
    return 'general';
  };

  // Get notification priority
  const getPriority = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('urgent') || lowerMessage.includes('cancelled') || lowerMessage.includes('failed')) return 'high';
    if (lowerMessage.includes('assigned') || lowerMessage.includes('completed')) return 'medium';
    return 'low';
  };

  // Get notification icon
  const getNotificationIcon = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('delivery') || lowerMessage.includes('package')) return '📦';
    if (lowerMessage.includes('assigned') || lowerMessage.includes('agent')) return '👨‍🚛';
    if (lowerMessage.includes('completed') || lowerMessage.includes('delivered')) return '✅';
    if (lowerMessage.includes('cancelled') || lowerMessage.includes('failed')) return '❌';
    if (lowerMessage.includes('status')) return '📊';
    if (lowerMessage.includes('payment')) return '💳';
    return '🔔';
  };

  // Get notification color
  const getNotificationColor = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('completed') || lowerMessage.includes('delivered')) return '#28a745';
    if (lowerMessage.includes('cancelled') || lowerMessage.includes('failed')) return '#dc3545';
    if (lowerMessage.includes('assigned')) return '#007bff';
    if (lowerMessage.includes('urgent')) return '#fd7e14';
    return '#6c757d';
  };

  // Calculate time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  // Calculate statistics
  const calculateStats = (notifications) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      today: notifications.filter(n => new Date(n.createdAt || n.timestamp) >= today).length,
      thisWeek: notifications.filter(n => new Date(n.createdAt || n.timestamp) >= weekAgo).length
    };

    setStats(stats);
  };

  // Filter notifications
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    
    if (newFilter === 'all') {
      setFilteredNotifications(notifications);
    } else {
      const filtered = notifications.filter(notification => 
        notification.category === newFilter
      );
      setFilteredNotifications(filtered);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId, index) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state
      const updatedNotifications = [...notifications];
      updatedNotifications[index] = { ...updatedNotifications[index], read: true };
      setNotifications(updatedNotifications);
      
      const updatedFiltered = [...filteredNotifications];
      const filteredIndex = filteredNotifications.findIndex(n => n._id === notificationId);
      if (filteredIndex !== -1) {
        updatedFiltered[filteredIndex] = { ...updatedFiltered[filteredIndex], read: true };
        setFilteredNotifications(updatedFiltered);
      }
      
      calculateStats(updatedNotifications);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/notifications/mark-all-read`,
        { userId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updatedNotifications);
      setFilteredNotifications(filteredNotifications.map(n => ({ ...n, read: true })));
      calculateStats(updatedNotifications);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/notifications/${notificationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state
      const updatedNotifications = notifications.filter(n => n._id !== notificationId);
      const updatedFiltered = filteredNotifications.filter(n => n._id !== notificationId);
      
      setNotifications(updatedNotifications);
      setFilteredNotifications(updatedFiltered);
      calculateStats(updatedNotifications);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time updates (optional)
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Loading state
  if (loading) {
    return (
      <div className="page-content">
        <div className="notifications-container">
          <div className="notifications-header">
            <h2>🔔 Notifications</h2>
          </div>
          <div className="loading-state">
            <div className="loading-spinner">🔄</div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-content">
        <div className="notifications-container">
          <div className="notifications-header">
            <h2>🔔 Notifications</h2>
          </div>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load notifications</h3>
            <p>{error}</p>
            <button onClick={fetchNotifications} className="retry-btn">
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-title">
            <h2>🔔 Notifications</h2>
            <span className="user-info">
              {user.name} ({userRole?.charAt(0).toUpperCase() + userRole?.slice(1)})
            </span>
          </div>
          <div className="header-actions">
            <button onClick={fetchNotifications} className="refresh-btn">
              🔄 Refresh
            </button>
            {stats.unread > 0 && (
              <button onClick={markAllAsRead} className="mark-all-btn">
                ☑️ Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="notifications-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card unread">
            <span className="stat-number">{stats.unread}</span>
            <span className="stat-label">Unread</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.today}</span>
            <span className="stat-label">Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.thisWeek}</span>
            <span className="stat-label">This Week</span>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          {getNotificationCategories().map(category => (
            <button
              key={category}
              className={`filter-btn ${filter === category ? 'active' : ''}`}
              onClick={() => handleFilterChange(category)}
            >
              {category === 'all' ? '🔔 All' :
               category === 'deliveries' ? '📦 Deliveries' :
               category === 'assignments' ? '👨‍🚛 Assignments' :
               category === 'status_updates' ? '📊 Status Updates' :
               category === 'orders' ? '🛒 Orders' :
               category === 'new_deliveries' ? '🆕 New Deliveries' :
               category === 'system' ? '⚙️ System' :
               category === 'updates' ? '🔄 Updates' :
               category === 'general' ? '📋 General' : category}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No notifications found</h3>
              <p>
                {filter === 'all' 
                  ? "You're all caught up! No notifications to show."
                  : `No notifications in the ${filter} category.`
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div 
                key={notification._id || index} 
                className={`notification-item ${!notification.read ? 'unread' : ''} priority-${notification.priority}`}
              >
                <div className="notification-icon" style={{ color: notification.color }}>
                  {notification.icon}
                </div>
                
                <div className="notification-content">
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  
                  <div className="notification-meta">
                    <span className="notification-time">
                      🕒 {notification.timeAgo}
                    </span>
                    <span className="notification-category">
                      📂 {notification.category.replace('_', ' ')}
                    </span>
                    {notification.priority === 'high' && (
                      <span className="priority-badge high">🔥 High Priority</span>
                    )}
                  </div>
                </div>
                
                <div className="notification-actions">
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification._id, index)}
                      className="action-btn read-btn"
                      title="Mark as read"
                    >
                      👁️
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification._id)}
                    className="action-btn delete-btn"
                    title="Delete notification"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
