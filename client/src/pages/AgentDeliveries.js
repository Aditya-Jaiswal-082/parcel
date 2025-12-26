// src/pages/AgentDeliveries.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AgentDeliveries.css';
import api from "../api/api";
function AgentDeliveries() {
  const navigate = useNavigate();
  
  
  // State management
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [sortBy, setSortBy] = useState('assignedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    pickedUp: 0,
    inTransit: 0,
    delivered: 0,
    todayEarnings: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  // User authentication
  const agentId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check authentication and role
  useEffect(() => {
    if (!token || !agentId) {
      alert('🔐 Please login to access your deliveries');
      navigate('/login');
      return;
    }

    if (userRole !== 'agent') {
      alert('🚫 Access Denied: This page is only for delivery agents');
      navigate('/dashboard');
      return;
    }

    fetchDeliveries();
  }, [agentId, token, userRole, navigate]);

  // Fetch assigned deliveries
  const fetchDeliveries = useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      setError(null);

      const res = await api.get(`api/delivery/assigned/${agentId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const deliveriesData = res.data || [];
      setDeliveries(deliveriesData);
      
      // Calculate statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const statistics = {
        total: deliveriesData.length,
        assigned: deliveriesData.filter(d => d.status === 'assigned').length,
        pickedUp: deliveriesData.filter(d => d.status === 'picked_up').length,
        inTransit: deliveriesData.filter(d => d.status === 'in_transit').length,
        delivered: deliveriesData.filter(d => d.status === 'delivered').length,
        todayEarnings: deliveriesData
          .filter(d => d.status === 'delivered' && new Date(d.updatedAt) >= today && new Date(d.updatedAt) < tomorrow)
          .reduce((sum, d) => sum + parseFloat(d.estimatedPrice || d.price || 0), 0)
      };
      
      setStats(statistics);
      
    } catch (err) {
      console.error("Error loading deliveries:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        setError('Failed to load deliveries. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId, token, navigate]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeliveries(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  // Update delivery status
  const updateStatus = async (deliveryId, newStatus, currentStatus) => {
    if (updatingStatus === deliveryId) return;

    const statusMessages = {
      'picked_up': 'Mark as picked up from sender?',
      'in_transit': 'Mark as in transit to destination?',
      'delivered': 'Confirm delivery completion?'
    };

    const confirmMessage = statusMessages[newStatus] || `Update status to ${newStatus}?`;
    if (!window.confirm(`🔄 ${confirmMessage}`)) return;

    setUpdatingStatus(deliveryId);
    setError(null);

    try {
      const response = await api.patch(
        `api/delivery/update-status/${deliveryId}`, 
        { 
          newStatus,
          agentId,
          timestamp: new Date().toISOString()
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        alert(`✅ Status updated to "${newStatus}" successfully!`);
        await fetchDeliveries(false);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update status. Please try again.';
      alert(`❌ ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Get contact info for customer
  const handleContact = (delivery) => {
    const contactInfo = `📞 Customer Contact Information:\n\n` +
      `Sender: ${delivery.senderName || 'Not provided'}\n` +
      `Phone: ${delivery.contactNumber}\n` +
      `Recipient: ${delivery.recipientName || 'Same as sender'}\n` +
      `Recipient Phone: ${delivery.recipientContact || delivery.contactNumber}\n\n` +
      `Special Instructions: ${delivery.specialInstructions || 'None'}`;
    
    alert(contactInfo);
  };

  // Get directions to pickup/delivery location
  const handleDirections = (delivery, type = 'pickup') => {
    const location = type === 'pickup' ? delivery.pickupLocation : delivery.deliveryLocation;
    const address = type === 'pickup' ? delivery.pickupAddress : delivery.deliveryAddress;
    
    if (location?.lat && location?.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(url, '_blank');
    }
  };

  // Filter and sort deliveries
  const getFilteredAndSortedDeliveries = () => {
    let filtered = [...deliveries];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.trackingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.recipientName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'active') {
        filtered = filtered.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status));
      } else if (filter === 'pending') {
        filtered = filtered.filter(d => d.status === 'assigned');
      } else if (filter === 'completed') {
        filtered = filtered.filter(d => ['delivered', 'cancelled'].includes(d.status));
      } else {
        filtered = filtered.filter(d => d.status === filter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'assignedAt':
          aVal = new Date(a.assignedAt || a.createdAt);
          bVal = new Date(b.assignedAt || b.createdAt);
          break;
        case 'price':
          aVal = parseFloat(a.estimatedPrice || a.price || 0);
          bVal = parseFloat(b.estimatedPrice || b.price || 0);
          break;
        case 'status':
          const statusPriority = { 'assigned': 1, 'picked_up': 2, 'in_transit': 3, 'delivered': 4, 'cancelled': 5 };
          aVal = statusPriority[a.status] || 0;
          bVal = statusPriority[b.status] || 0;
          break;
        case 'deliveryDate':
          aVal = new Date(a.deliveryDate);
          bVal = new Date(b.deliveryDate);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  // Toggle delivery details
  const toggleDetails = (deliveryId) => {
    setShowDetails(prev => ({
      ...prev,
      [deliveryId]: !prev[deliveryId]
    }));
  };

  // Status progression mapping
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'assigned': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'delivered'
    };
    return statusFlow[currentStatus];
  };

  // Get status info with styling
  const getStatusInfo = (status) => {
    const statusConfig = {
      'assigned': { label: 'Assigned', color: '#007bff', icon: '📋', bgColor: '#d1ecf1' },
      'picked_up': { label: 'Picked Up', color: '#28a745', icon: '📦', bgColor: '#d4edda' },
      'in_transit': { label: 'In Transit', color: '#ffc107', icon: '🚛', bgColor: '#fff3cd' },
      'delivered': { label: 'Delivered', color: '#28a745', icon: '✅', bgColor: '#d4edda' },
      'cancelled': { label: 'Cancelled', color: '#dc3545', icon: '❌', bgColor: '#f8d7da' }
    };
    
    return statusConfig[status] || { label: status, color: '#6c757d', icon: '❓', bgColor: '#f8f9fa' };
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Loading state
  if (loading && deliveries.length === 0) {
    return (
      <div className="page-content">
        <div className="agent-deliveries-container">
          <div className="loading-container">
            <div className="loading-spinner">🚛</div>
            <h3>Loading your deliveries...</h3>
            <p>Please wait while we fetch your assigned orders</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeliveries = getFilteredAndSortedDeliveries();

  return (
    <div className="page-content">
      <div className="agent-deliveries-container">
        {/* Header Section */}
        <div className="deliveries-header">
          <div className="header-info">
            <h1>🚛 My Deliveries</h1>
            <p>Welcome back, <strong>{user.name || 'Agent'}</strong>! Manage your assigned deliveries</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => fetchDeliveries(false)} 
              className="refresh-btn"
              disabled={refreshing}
            >
              {refreshing ? '🔄' : '🔄'} Refresh
            </button>
            <button 
              onClick={() => navigate('/agent-dashboard')} 
              className="dashboard-btn"
            >
              📊 Dashboard
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-error">✕</button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Assigned</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <h3>{stats.assigned}</h3>
              <p>Pending Pickup</p>
            </div>
          </div>
          <div className="stat-card active">
            <div className="stat-icon">🚛</div>
            <div className="stat-info">
              <h3>{stats.pickedUp + stats.inTransit}</h3>
              <p>In Progress</p>
            </div>
          </div>
          <div className="stat-card earnings">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.todayEarnings)}</h3>
              <p>Today's Earnings</p>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search by tracking ID, customer name, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-container">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Deliveries</option>
              <option value="active">Active Orders</option>
              <option value="pending">Pending Pickup</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="assignedAt">Assignment Date</option>
              <option value="deliveryDate">Delivery Date</option>
              <option value="price">Earnings</option>
              <option value="status">Status</option>
            </select>

            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Deliveries List */}
        <div className="deliveries-section">
          {filteredDeliveries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No deliveries found</h3>
              <p>
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No deliveries assigned to you yet'
                }
              </p>
              {!searchQuery && filter === 'all' && (
                <button onClick={() => navigate('/agent-dashboard')} className="dashboard-btn">
                  📊 Go to Dashboard
                </button>
              )}
            </div>
          ) : (
            <div className="deliveries-grid">
              {filteredDeliveries.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                const assignedDate = formatDate(delivery.assignedAt || delivery.createdAt);
                const deliveryDate = formatDate(delivery.deliveryDate);
                const isExpanded = showDetails[delivery._id];
                const nextStatus = getNextStatus(delivery.status);

                return (
                  <div key={delivery._id} className="delivery-card">
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="header-left">
                        <div className="delivery-id">#{delivery.trackingId}</div>
                        <div className="customer-name">
                          👤 {delivery.senderName || 'Customer'}
                        </div>
                      </div>
                      <div className="header-right">
                        <div 
                          className="status-badge" 
                          style={{ 
                            backgroundColor: statusInfo.bgColor, 
                            color: statusInfo.color 
                          }}
                        >
                          {statusInfo.icon} {statusInfo.label}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="delivery-route">
                        <div className="route-point from">
                          <span className="route-icon">📤</span>
                          <div className="route-details">
                            <strong>Pickup:</strong>
                            <p>{delivery.pickupAddress}</p>
                            <button 
                              onClick={() => handleDirections(delivery, 'pickup')}
                              className="directions-btn"
                            >
                              🗺️ Directions
                            </button>
                          </div>
                        </div>
                        <div className="route-arrow">→</div>
                        <div className="route-point to">
                          <span className="route-icon">📥</span>
                          <div className="route-details">
                            <strong>Delivery:</strong>
                            <p>{delivery.deliveryAddress}</p>
                            <button 
                              onClick={() => handleDirections(delivery, 'delivery')}
                              className="directions-btn"
                            >
                              🗺️ Directions
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="delivery-summary">
                        <div className="summary-item">
                          <span className="label">📦 Package:</span>
                          <span className="value">{delivery.description}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">💰 Earnings:</span>
                          <span className="value">{formatCurrency(delivery.estimatedPrice || delivery.price)}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">📅 Assigned:</span>
                          <span className="value">{assignedDate.date} at {assignedDate.time}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">🎯 Due Date:</span>
                          <span className="value">{deliveryDate.date}</span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="expanded-details">
                          <div className="details-grid">
                            <div className="detail-item">
                              <span className="detail-label">📞 Sender Phone:</span>
                              <span className="detail-value">{delivery.contactNumber}</span>
                            </div>
                            {delivery.recipientContact && (
                              <div className="detail-item">
                                <span className="detail-label">📞 Recipient Phone:</span>
                                <span className="detail-value">{delivery.recipientContact}</span>
                              </div>
                            )}
                            {delivery.packageType && (
                              <div className="detail-item">
                                <span className="detail-label">📦 Type:</span>
                                <span className="detail-value">{delivery.packageType}</span>
                              </div>
                            )}
                            {delivery.packageWeight && (
                              <div className="detail-item">
                                <span className="detail-label">⚖️ Weight:</span>
                                <span className="detail-value">{delivery.packageWeight} kg</span>
                              </div>
                            )}
                            {delivery.urgency && (
                              <div className="detail-item">
                                <span className="detail-label">⚡ Priority:</span>
                                <span className="detail-value">{delivery.urgency}</span>
                              </div>
                            )}
                            {delivery.estimatedDistance && (
                              <div className="detail-item">
                                <span className="detail-label">📏 Distance:</span>
                                <span className="detail-value">{delivery.estimatedDistance} km</span>
                              </div>
                            )}
                            {delivery.fragile && (
                              <div className="detail-item">
                                <span className="detail-label">⚠️ Fragile:</span>
                                <span className="detail-value">Handle with care</span>
                              </div>
                            )}
                            {delivery.requiresSignature && (
                              <div className="detail-item">
                                <span className="detail-label">✍️ Signature:</span>
                                <span className="detail-value">Required</span>
                              </div>
                            )}
                            {delivery.specialInstructions && (
                              <div className="detail-item full-width">
                                <span className="detail-label">📝 Special Instructions:</span>
                                <span className="detail-value">{delivery.specialInstructions}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="card-footer">
                      <div className="action-buttons">
                        <button 
                          onClick={() => toggleDetails(delivery._id)}
                          className="details-btn"
                        >
                          {isExpanded ? '👆 Less Info' : '👇 More Info'}
                        </button>
                        
                        <button 
                          onClick={() => handleContact(delivery)}
                          className="contact-btn"
                        >
                          📞 Contact
                        </button>

                        {nextStatus && (
                          <button 
                            onClick={() => updateStatus(delivery._id, nextStatus, delivery.status)}
                            disabled={updatingStatus === delivery._id}
                            className="update-status-btn"
                          >
                            {updatingStatus === delivery._id ? (
                              <>🔄 Updating...</>
                            ) : (
                              <>✓ Mark as {nextStatus.replace('_', ' ')}</>
                            )}
                          </button>
                        )}

                        {delivery.status === 'delivered' && (
                          <div className="completed-badge">
                            ✅ Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentDeliveries;
