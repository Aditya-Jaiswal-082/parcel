// File: src/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    delivered: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // ✅ FIXED: Added authentication headers
      const res = await axios.get('http://localhost:5000/api/delivery/all', { headers });
      
      console.log('Fetched deliveries:', res.data);
      const deliveriesData = Array.isArray(res.data) ? res.data : [];
      setDeliveries(deliveriesData);

      // Calculate statistics
      const newStats = {
        total: deliveriesData.length,
        pending: deliveriesData.filter(d => d.status === 'pending').length,
        assigned: deliveriesData.filter(d => d.status === 'assigned').length,
        delivered: deliveriesData.filter(d => d.status === 'delivered').length,
        cancelled: deliveriesData.filter(d => d.status === 'cancelled').length,
        created: deliveriesData.filter(d => d.status === 'created').length,
        picked_up: deliveriesData.filter(d => d.status === 'picked_up').length,
        in_transit: deliveriesData.filter(d => d.status === 'in_transit').length
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching deliveries:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch deliveries';
      setError(errorMessage);
      
      // Redirect to login if unauthorized
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'created': '#2196f3',
      'pending': '#ff9800',
      'assigned': '#9c27b0',
      'picked_up': '#3f51b5',
      'in_transit': '#00bcd4',
      'delivered': '#4caf50',
      'cancelled': '#f44336'
    };
    return colors[status] || '#757575';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="container">
        <h2>📋 Admin Dashboard</h2>
        <p>Loading deliveries...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <h2>📋 Admin Dashboard</h2>
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
          <br />
          <button onClick={fetchDeliveries} style={{ marginTop: '10px' }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>📋 Admin Dashboard</h2>

      {/* Statistics Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{stats.total}</h3>
          <p style={{ margin: 0, color: '#666' }}>Total Deliveries</p>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3e0', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ffcc02'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>{stats.pending}</h3>
          <p style={{ margin: 0, color: '#ef6c00' }}>Pending</p>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #9c27b0'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>{stats.assigned}</h3>
          <p style={{ margin: 0, color: '#6a1b9a' }}>Assigned</p>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #4caf50'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>{stats.delivered}</h3>
          <p style={{ margin: 0, color: '#1b5e20' }}>Delivered</p>
        </div>
      </div>

      {/* Filter Section */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label><strong>Filter by Status:</strong></label>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="all">All ({stats.total})</option>
          <option value="created">Created ({stats.created})</option>
          <option value="pending">Pending ({stats.pending})</option>
          <option value="assigned">Assigned ({stats.assigned})</option>
          <option value="picked_up">Picked Up ({stats.picked_up})</option>
          <option value="in_transit">In Transit ({stats.in_transit})</option>
          <option value="delivered">Delivered ({stats.delivered})</option> {/* ✅ FIXED: changed from 'completed' */}
          <option value="cancelled">Cancelled ({stats.cancelled})</option>
        </select>
        
        <button 
          onClick={fetchDeliveries}
          style={{ 
            padding: '8px 12px', 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Deliveries List */}
      <div style={{ marginTop: '20px' }}>
        {filteredDeliveries.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '8px',
            color: '#666'
          }}>
            <h3>No deliveries found</h3>
            <p>No deliveries match the selected filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredDeliveries.map((delivery) => (
              <div 
                key={delivery._id} 
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                      📦 {delivery.trackingId || 'No Tracking ID'}
                    </h4>
                    <span 
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(delivery.status),
                        textTransform: 'uppercase'
                      }}
                    >
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </div>
                  <small style={{ color: '#999' }}>
                    Created: {formatDate(delivery.createdAt)}
                  </small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>📍 From:</strong><br />
                      <span style={{ color: '#666' }}>{delivery.pickupAddress}</span>
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>📍 To:</strong><br />
                      <span style={{ color: '#666' }}>{delivery.deliveryAddress}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>👤 Customer:</strong><br />
                      <span style={{ color: '#666' }}>
                        {delivery.userId?.name || 'Unknown'}<br />
                        <small>{delivery.userId?.email || 'No email'}</small>
                      </span>
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>🚛 Assigned Agent:</strong><br />
                      <span style={{ color: '#666' }}>
                        {delivery.assignedAgent?.name || '—'}<br />
                        {delivery.assignedAgent?.email && (
                          <small>{delivery.assignedAgent.email}</small>
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                {delivery.description && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <strong>📝 Description:</strong> {delivery.description}
                  </div>
                )}

                {delivery.contactNumber && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>📞 Contact:</strong> {delivery.contactNumber}
                  </div>
                )}

                {delivery.price && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>💰 Price:</strong> ${delivery.price}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
