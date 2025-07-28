// src/pages/AgentDashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AgentDashboard.css';

function AgentDashboard() {
  const navigate = useNavigate();
  const [unassigned, setUnassigned] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalAvailable: 0,
    totalAssigned: 0,
    completedToday: 0,
    earnings: 0
  });
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  // Get user info
  const agentId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check authentication and role
  useEffect(() => {
    if (!token || !agentId) {
      alert('🔐 Please login to access the dashboard');
      navigate('/login');
      return;
    }

    if (userRole !== 'agent') {
      alert('🚫 Access Denied: This dashboard is only for delivery agents');
      navigate('/dashboard');
      return;
    }

    // Initial data fetch
    fetchAllData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    
    return () => clearInterval(interval);
  }, [agentId, token, userRole, navigate]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUnassignedDeliveries(),
        fetchAssignedDeliveries(),
        fetchAgentStats()
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unassigned deliveries
  const fetchUnassignedDeliveries = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/delivery/unassigned', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let deliveries = res.data || [];
      
      // Apply filters
      if (filter === 'express') {
        deliveries = deliveries.filter(d => d.urgency === 'express');
      } else if (filter === 'standard') {
        deliveries = deliveries.filter(d => d.urgency === 'standard');
      } else if (filter === 'fragile') {
        deliveries = deliveries.filter(d => d.fragile === true);
      }

      // Apply sorting
      deliveries.sort((a, b) => {
        if (sortBy === 'createdAt') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortBy === 'distance') {
          return parseFloat(a.estimatedDistance || 0) - parseFloat(b.estimatedDistance || 0);
        } else if (sortBy === 'price') {
          return parseFloat(b.estimatedPrice || b.price || 0) - parseFloat(a.estimatedPrice || a.price || 0);
        }
        return 0;
      });

      setUnassigned(deliveries);
    } catch (err) {
      console.error('Error fetching unassigned deliveries:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
      throw err;
    }
  };

  // Fetch assigned deliveries
  const fetchAssignedDeliveries = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/delivery/assigned/${agentId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const deliveries = res.data || [];
      // Sort by status priority and creation date
      deliveries.sort((a, b) => {
        const statusPriority = {
          'pending': 0,
          'created': 0,
          'assigned': 1,
          'picked_up': 2,
          'in_transit': 3,
          'delivered': 4,
          'cancelled': 5
        };
        
        const aPriority = statusPriority[a.status] || 0;
        const bPriority = statusPriority[b.status] || 0;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setAssigned(deliveries);
    } catch (err) {
      console.error('Error fetching assigned deliveries:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
      throw err;
    }
  };

  // Fetch agent statistics
  const fetchAgentStats = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/delivery/agent/stats/${agentId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setStats(res.data || {
        totalAvailable: unassigned.length,
        totalAssigned: assigned.length,
        completedToday: 0,
        earnings: 0
      });
    } catch (err) {
      console.error('Error fetching agent stats:', err);
      // Set fallback stats
      setStats({
        totalAvailable: unassigned.length,
        totalAssigned: assigned.length,
        completedToday: 0,
        earnings: 0
      });
    }
  };

  // Enhanced claim delivery function
  const handleClaim = async (deliveryId, deliveryInfo) => {
    if (claimingId === deliveryId) return; // Prevent double clicking

    // Confirmation dialog with delivery details
    const confirmMessage = `🚛 Claim this delivery?\n\nFrom: ${deliveryInfo.pickupAddress}\nTo: ${deliveryInfo.deliveryAddress}\nPrice: ₹${deliveryInfo.estimatedPrice || deliveryInfo.price}\nDistance: ${deliveryInfo.estimatedDistance} km`;
    
    if (!window.confirm(confirmMessage)) return;

    setClaimingId(deliveryId);
    setError(null);

    try {
      const response = await axios.patch(
        `http://localhost:5000/api/delivery/claim/${deliveryId}`, 
        { agentId },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Success feedback
        alert('✅ Delivery claimed successfully! Check your assigned deliveries.');
        
        // Refresh data
        await fetchAllData();
        
        // Create notification
        await createNotification(`📦 You have claimed delivery: ${deliveryInfo.trackingId || deliveryId}`);
      }
    } catch (err) {
      console.error('Error claiming delivery:', err);
      
      let errorMessage = 'Failed to claim delivery. ';
      
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        localStorage.clear();
        navigate('/login');
      } else if (err.response?.status === 409) {
        errorMessage = 'This delivery has already been claimed by another agent.';
        await fetchUnassignedDeliveries(); // Refresh the list
      } else if (err.response?.status === 404) {
        errorMessage = 'Delivery not found or no longer available.';
        await fetchUnassignedDeliveries(); // Refresh the list
      } else if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert('❌ ' + errorMessage);
      setError(errorMessage);
    } finally {
      setClaimingId(null);
    }
  };

  // Enhanced status update function
  const updateStatus = async (deliveryId, newStatus, currentStatus) => {
    if (updatingStatus === deliveryId) return; // Prevent double clicking

    // Confirmation for status changes
    const statusMessages = {
      'picked_up': 'Mark as picked up from sender?',
      'in_transit': 'Mark as in transit to destination?',
      'delivered': 'Confirm delivery completion?',
      'cancelled': 'Cancel this delivery? This action cannot be undone.'
    };

    const confirmMessage = statusMessages[newStatus] || `Update status to ${newStatus}?`;
    if (!window.confirm(`🔄 ${confirmMessage}`)) return;

    setUpdatingStatus(deliveryId);
    setError(null);

    try {
      const response = await axios.patch(
        `http://localhost:5000/api/delivery/update-status/${deliveryId}`, 
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
        
        // Refresh assigned deliveries
        await fetchAssignedDeliveries();
        await fetchAgentStats();
        
        // Create notification for status update
        await createNotification(`📊 Delivery status updated to: ${newStatus}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      
      let errorMessage = 'Failed to update status. ';
      
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        localStorage.clear();
        navigate('/login');
      } else if (err.response?.status === 403) {
        errorMessage = 'You are not authorized to update this delivery.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Delivery not found.';
        await fetchAssignedDeliveries(); // Refresh the list
      } else if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert('❌ ' + errorMessage);
      setError(errorMessage);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Create notification helper
  const createNotification = async (message) => {
    try {
      await axios.post('http://localhost:5000/api/notifications/create', {
        userId: agentId,
        message,
        type: 'agent_activity',
        priority: 'medium'
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
      // Don't show error for notification failure
    }
  };

  // Status progression mapping with updated status names
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'pending': 'assigned',
      'created': 'assigned',
      'assigned': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'delivered'
    };
    return statusFlow[currentStatus];
  };

  // Get status display info with updated status names
  const getStatusInfo = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', color: '#6c757d', icon: '⏳' },
      'created': { label: 'Created', color: '#17a2b8', icon: '📋' },
      'assigned': { label: 'Assigned', color: '#007bff', icon: '📋' },
      'picked_up': { label: 'Picked Up', color: '#28a745', icon: '📦' },
      'in_transit': { label: 'In Transit', color: '#ffc107', icon: '🚛' },
      'delivered': { label: 'Delivered', color: '#28a745', icon: '✅' },
      'cancelled': { label: 'Cancelled', color: '#dc3545', icon: '❌' }
    };
    return statusConfig[status] || { label: status, color: '#6c757d', icon: '❓' };
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format earnings
  const formatEarnings = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency) => {
    if (urgency === 'express') {
      return <span className="urgency-badge express">⚡ Express</span>;
    }
    return <span className="urgency-badge standard">📦 Standard</span>;
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-content">
        <div className="agent-dashboard">
          <div className="loading-container">
            <div className="loading-spinner">🚛</div>
            <h3>Loading your dashboard...</h3>
            <p>Please wait while we fetch your deliveries</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="agent-dashboard">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-info">
            <h1>🚛 Agent Dashboard</h1>
            <p>Welcome back, <strong>{user.name || 'Agent'}</strong>!</p>
            <span className="last-updated">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="header-actions">
            <button onClick={fetchAllData} className="refresh-btn" disabled={loading}>
              🔄 Refresh
            </button>
            <button onClick={() => navigate('/notifications')} className="notifications-btn">
              🔔 Notifications
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
          <div className="stat-card available">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>{stats.totalAvailable || unassigned.length}</h3>
              <p>Available Deliveries</p>
            </div>
          </div>
          <div className="stat-card assigned">
            <div className="stat-icon">🚛</div>
            <div className="stat-info">
              <h3>{stats.totalAssigned || assigned.length}</h3>
              <p>Your Deliveries</p>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.completedToday || 0}</h3>
              <p>Completed Today</p>
            </div>
          </div>
          <div className="stat-card earnings">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{formatEarnings(stats.earnings)}</h3>
              <p>Today's Earnings</p>
            </div>
          </div>
        </div>

        {/* Available Deliveries Section */}
        <div className="deliveries-section">
          <div className="section-header">
            <h2>📦 Available Deliveries ({unassigned.length})</h2>
            <div className="section-controls">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="express">Express Only</option>
                <option value="standard">Standard Only</option>
                <option value="fragile">Fragile Items</option>
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="createdAt">Newest First</option>
                <option value="price">Highest Price</option>
                <option value="distance">Nearest First</option>
              </select>
            </div>
          </div>

          <div className="deliveries-grid">
            {unassigned.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Available Deliveries</h3>
                <p>Check back later for new delivery opportunities</p>
                <button onClick={fetchUnassignedDeliveries} className="retry-btn">
                  🔄 Check Again
                </button>
              </div>
            ) : (
              unassigned.map((delivery) => (
                <div key={delivery._id} className="delivery-card available-delivery">
                  <div className="card-header">
                    <div className="delivery-id">#{delivery.trackingId || delivery._id.slice(-6)}</div>
                    {getUrgencyBadge(delivery.urgency)}
                    {delivery.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                  </div>

                  <div className="card-body">
                    <div className="route-info">
                      <div className="route-point pickup">
                        <span className="route-icon">📤</span>
                        <div className="route-details">
                          <strong>Pickup:</strong>
                          <p>{delivery.pickupAddress}</p>
                          {delivery.additionalInfoPickup && (
                            <small>{delivery.additionalInfoPickup}</small>
                          )}
                        </div>
                      </div>
                      <div className="route-arrow">→</div>
                      <div className="route-point delivery">
                        <span className="route-icon">📥</span>
                        <div className="route-details">
                          <strong>Delivery:</strong>
                          <p>{delivery.deliveryAddress}</p>
                          {delivery.additionalInfoDelivery && (
                            <small>{delivery.additionalInfoDelivery}</small>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="delivery-details">
                      <div className="detail-item">
                        <span className="detail-label">📦 Package:</span>
                        <span className="detail-value">{delivery.description}</span>
                      </div>
                      {delivery.estimatedDistance && (
                        <div className="detail-item">
                          <span className="detail-label">📏 Distance:</span>
                          <span className="detail-value">{delivery.estimatedDistance} km</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">💰 Earnings:</span>
                        <span className="detail-value">₹{delivery.estimatedPrice || delivery.price}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">📅 Created:</span>
                        <span className="detail-value">{formatDate(delivery.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button
                      onClick={() => handleClaim(delivery._id, delivery)}
                      disabled={claimingId === delivery._id}
                      className="claim-btn"
                    >
                      {claimingId === delivery._id ? (
                        <>🔄 Claiming...</>
                      ) : (
                        <>🚛 Claim Delivery</>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Deliveries Section */}
        <div className="deliveries-section">
          <div className="section-header">
            <h2>🚚 Your Assigned Deliveries ({assigned.length})</h2>
          </div>

          <div className="deliveries-grid">
            {assigned.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Assigned Deliveries</h3>
                <p>Claim some deliveries from the available section above</p>
              </div>
            ) : (
              assigned.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                const nextStatus = getNextStatus(delivery.status);

                return (
                  <div key={delivery._id} className="delivery-card assigned-delivery">
                    <div className="card-header">
                      <div className="delivery-id">#{delivery.trackingId || delivery._id.slice(-6)}</div>
                      <div className="status-badge" style={{ backgroundColor: statusInfo.color }}>
                        {statusInfo.icon} {statusInfo.label}
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="route-info">
                        <div className="route-point pickup">
                          <span className="route-icon">📤</span>
                          <div className="route-details">
                            <strong>Pickup:</strong>
                            <p>{delivery.pickupAddress}</p>
                          </div>
                        </div>
                        <div className="route-arrow">→</div>
                        <div className="route-point delivery">
                          <span className="route-icon">📥</span>
                          <div className="route-details">
                            <strong>Delivery:</strong>
                            <p>{delivery.deliveryAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="delivery-details">
                        <div className="detail-item">
                          <span className="detail-label">📦 Package:</span>
                          <span className="detail-value">{delivery.description}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">📞 Contact:</span>
                          <span className="detail-value">{delivery.contactNumber}</span>
                        </div>
                        {delivery.recipientContact && (
                          <div className="detail-item">
                            <span className="detail-label">📞 Recipient:</span>
                            <span className="detail-value">{delivery.recipientContact}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="detail-label">💰 Amount:</span>
                          <span className="detail-value">₹{delivery.estimatedPrice || delivery.price}</span>
                        </div>
                        {delivery.specialInstructions && (
                          <div className="detail-item">
                            <span className="detail-label">📝 Instructions:</span>
                            <span className="detail-value">{delivery.specialInstructions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-footer">
                      {nextStatus ? (
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
                      ) : (
                        <div className="completed-badge">
                          {delivery.status === 'delivered' ? '✅ Completed' : '❌ Cancelled'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentDashboard;
