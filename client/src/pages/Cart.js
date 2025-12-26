// src/pages/Cart.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Cart.css';
import api from "../api/api";
function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [showDetails, setShowDetails] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    delivered: 0,
    cancelled: 0,
    totalSpent: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  // User authentication
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Check authentication
  useEffect(() => {
    if (!token || !userId) {
      alert('🔐 Please login to view your deliveries');
      navigate('/login');
      return;
    }

    if (userRole === 'agent') {
      alert('🚫 Access Denied: Use the Agent Dashboard to view deliveries');
      navigate('/agent-dashboard');
      return;
    }

    // Check for success message from payments
    if (location.state?.message) {
      setTimeout(() => {
        alert(`✅ ${location.state.message}`);
      }, 500);
    }

    fetchDeliveries();
  }, [userId, token, userRole, navigate, location.state]);

  // Enhanced fetch deliveries with statistics
  const fetchDeliveries = useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      setError(null);

      const res = await api.get(`api/delivery/user/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const deliveriesData = res.data || [];
      setDeliveries(deliveriesData);
      
      // Calculate statistics
      const statistics = {
        total: deliveriesData.length,
        pending: deliveriesData.filter(d => ['pending', 'created', 'assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
        delivered: deliveriesData.filter(d => d.status === 'delivered').length,
        cancelled: deliveriesData.filter(d => d.status === 'cancelled').length,
        totalSpent: deliveriesData
          .filter(d => d.status === 'delivered')
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
  }, [userId, token, navigate]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeliveries(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  // Enhanced cancel delivery
  const handleCancel = async (delivery) => {
    const confirmMessage = `🚫 Cancel this delivery?\n\n` +
      `Tracking ID: ${delivery.trackingId}\n` +
      `From: ${delivery.pickupAddress}\n` +
      `To: ${delivery.deliveryAddress}\n` +
      `Amount: ₹${delivery.estimatedPrice || delivery.price}\n\n` +
      `This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      
      await api.patch(`api/delivery/cancel/${delivery._id}`, {
        cancelledBy: 'user'
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('✅ Delivery cancelled successfully! You will receive a confirmation email.');
      await fetchDeliveries();
      
    } catch (err) {
      console.error("Error cancelling delivery:", err);
      const errorMsg = err.response?.data?.error || 'Could not cancel delivery. Please try again.';
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Track delivery
  const handleTrack = (trackingId) => {
    navigate(`/track/${trackingId}`);
  };

  // Repeat order
  const handleRepeatOrder = (delivery) => {
    const orderData = {
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: delivery.deliveryAddress,
      description: delivery.description,
      contactNumber: delivery.contactNumber,
      pickupCoordinates: delivery.pickupLocation,
      deliveryCoordinates: delivery.deliveryLocation,
      // Enhanced fields
      senderName: delivery.senderName,
      recipientName: delivery.recipientName,
      recipientContact: delivery.recipientContact,
      deliveryTime: delivery.deliveryTime,
      packageType: delivery.packageType,
      packageWeight: delivery.packageWeight,
      urgency: delivery.urgency,
      fragile: delivery.fragile,
      requiresSignature: delivery.requiresSignature,
      specialInstructions: delivery.specialInstructions,
      additionalInfoPickup: delivery.additionalInfoPickup,
      additionalInfoDelivery: delivery.additionalInfoDelivery,
      requiresPackaging: delivery.requiresPackaging,
      packagingType: delivery.packagingType,
      sameBuildingDelivery: delivery.sameBuildingDelivery,
      userId: userId
    };

    navigate('/addtocart', { state: { repeatOrder: orderData } });
  };

  // Download invoice/receipt
  const handleDownloadReceipt = async (delivery) => {
    try {
      const response = await api.get(`api/delivery/receipt/${delivery._id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${delivery.trackingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading receipt:", err);
      alert('❌ Could not download receipt. Feature coming soon!');
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
        d.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'active') {
        filtered = filtered.filter(d => ['pending', 'created', 'assigned', 'picked_up', 'in_transit'].includes(d.status));
      } else {
        filtered = filtered.filter(d => d.status === filter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'createdAt':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'price':
          aVal = parseFloat(a.estimatedPrice || a.price || 0);
          bVal = parseFloat(b.estimatedPrice || b.price || 0);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
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

  // Select deliveries for bulk actions
  const toggleSelectDelivery = (deliveryId) => {
    setSelectedDeliveries(prev => {
      if (prev.includes(deliveryId)) {
        return prev.filter(id => id !== deliveryId);
      } else {
        return [...prev, deliveryId];
      }
    });
  };

  // Bulk cancel selected deliveries
  const handleBulkCancel = async () => {
    if (selectedDeliveries.length === 0) {
      alert('Please select deliveries to cancel');
      return;
    }

    const activeDeliveries = selectedDeliveries.filter(id => {
      const delivery = deliveries.find(d => d._id === id);
      return delivery && !['delivered', 'cancelled'].includes(delivery.status);
    });

    if (activeDeliveries.length === 0) {
      alert('No active deliveries selected for cancellation');
      return;
    }

    if (!window.confirm(`Cancel ${activeDeliveries.length} selected deliveries?`)) return;

    try {
      setLoading(true);
      
      await Promise.all(
        activeDeliveries.map(id =>
          api.patch(`api/delivery/cancel/${id}`, {
            cancelledBy: 'user'
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
      );

      alert(`✅ ${activeDeliveries.length} deliveries cancelled successfully!`);
      setSelectedDeliveries([]);
      await fetchDeliveries();
      
    } catch (err) {
      console.error("Error in bulk cancel:", err);
      alert('❌ Some deliveries could not be cancelled. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get status info with styling
  const getStatusInfo = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', color: '#6c757d', icon: '⏳', bgColor: '#f8f9fa' },
      'created': { label: 'Created', color: '#17a2b8', icon: '📋', bgColor: '#d1ecf1' },
      'assigned': { label: 'Assigned', color: '#007bff', icon: '👤', bgColor: '#d1ecf1' },
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
        <div className="cart-container">
          <div className="loading-container">
            <div className="loading-spinner">📦</div>
            <h3>Loading your deliveries...</h3>
            <p>Please wait while we fetch your order history</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeliveries = getFilteredAndSortedDeliveries();

  return (
    <div className="page-content">
      <div className="cart-container">
        {/* Header Section */}
        <div className="cart-header">
          <div className="header-info">
            <h1>📦 My Deliveries</h1>
            <p>Track and manage all your delivery orders</p>
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
              onClick={() => navigate('/addtocart')} 
              className="new-order-btn"
            >
              ➕ New Order
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
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Active Orders</p>
            </div>
          </div>
          <div className="stat-card delivered">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.delivered}</h3>
              <p>Delivered</p>
            </div>
          </div>
          <div className="stat-card spent">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.totalSpent)}</h3>
              <p>Total Spent</p>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search by tracking ID, address, or description..."
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
              <option value="all">All Status</option>
              <option value="active">Active Orders</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="createdAt">Order Date</option>
              <option value="deliveryDate">Delivery Date</option>
              <option value="price">Price</option>
              <option value="status">Status</option>
            </select>

            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {selectedDeliveries.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedDeliveries.length} selected</span>
              <button onClick={handleBulkCancel} className="bulk-cancel-btn">
                Cancel Selected
              </button>
              <button onClick={() => setSelectedDeliveries([])} className="clear-selection-btn">
                Clear
              </button>
            </div>
          )}
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
                  : 'You haven\'t placed any orders yet'
                }
              </p>
              {!searchQuery && filter === 'all' && (
                <button onClick={() => navigate('/addtocart')} className="create-order-btn">
                  📦 Create Your First Order
                </button>
              )}
            </div>
          ) : (
            <div className="deliveries-grid">
              {filteredDeliveries.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                const dateInfo = formatDate(delivery.createdAt);
                const deliveryDateInfo = formatDate(delivery.deliveryDate);
                const isExpanded = showDetails[delivery._id];

                return (
                  <div key={delivery._id} className="delivery-card">
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="header-left">
                        <input
                          type="checkbox"
                          checked={selectedDeliveries.includes(delivery._id)}
                          onChange={() => toggleSelectDelivery(delivery._id)}
                          className="delivery-checkbox"
                        />
                        <div className="delivery-id">#{delivery.trackingId}</div>
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
                            <strong>From:</strong>
                            <p>{delivery.pickupAddress}</p>
                          </div>
                        </div>
                        <div className="route-arrow">→</div>
                        <div className="route-point to">
                          <span className="route-icon">📥</span>
                          <div className="route-details">
                            <strong>To:</strong>
                            <p>{delivery.deliveryAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="delivery-summary">
                        <div className="summary-item">
                          <span className="label">📦 Package:</span>
                          <span className="value">{delivery.description}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">💰 Amount:</span>
                          <span className="value">{formatCurrency(delivery.estimatedPrice || delivery.price)}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">📅 Ordered:</span>
                          <span className="value">{dateInfo.date} at {dateInfo.time}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">🎯 Delivery Date:</span>
                          <span className="value">{deliveryDateInfo.date}</span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="expanded-details">
                          <div className="details-grid">
                            {delivery.senderName && (
                              <div className="detail-item">
                                <span className="detail-label">👤 Sender:</span>
                                <span className="detail-value">{delivery.senderName}</span>
                              </div>
                            )}
                            {delivery.recipientName && (
                              <div className="detail-item">
                                <span className="detail-label">👤 Recipient:</span>
                                <span className="detail-value">{delivery.recipientName}</span>
                              </div>
                            )}
                            {delivery.contactNumber && (
                              <div className="detail-item">
                                <span className="detail-label">📞 Contact:</span>
                                <span className="detail-value">{delivery.contactNumber}</span>
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
                            {delivery.specialInstructions && (
                              <div className="detail-item full-width">
                                <span className="detail-label">📝 Instructions:</span>
                                <span className="detail-value">{delivery.specialInstructions}</span>
                              </div>
                            )}
                          </div>

                          {/* Status Timeline */}
                          {delivery.statusUpdates && delivery.statusUpdates.length > 0 && (
                            <div className="status-timeline">
                              <h4>📊 Status Timeline</h4>
                              <div className="timeline">
                                {delivery.statusUpdates.map((update, index) => (
                                  <div key={index} className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                      <strong>{getStatusInfo(update.status).label}</strong>
                                      <span className="timeline-date">
                                        {formatDate(update.timestamp).date} at {formatDate(update.timestamp).time}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                          {isExpanded ? '👆 Less Details' : '👇 More Details'}
                        </button>
                        
                        <button 
                          onClick={() => handleTrack(delivery.trackingId)}
                          className="track-btn"
                        >
                          📍 Track
                        </button>

                        {delivery.status === 'delivered' && (
                          <button 
                            onClick={() => handleDownloadReceipt(delivery)}
                            className="receipt-btn"
                          >
                            📄 Receipt
                          </button>
                        )}

                        <button 
                          onClick={() => handleRepeatOrder(delivery)}
                          className="repeat-btn"
                        >
                          🔄 Repeat
                        </button>

                        {!['delivered', 'cancelled'].includes(delivery.status) && (
                          <button 
                            onClick={() => handleCancel(delivery)}
                            className="cancel-btn"
                          >
                            ❌ Cancel
                          </button>
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

export default Cart;
