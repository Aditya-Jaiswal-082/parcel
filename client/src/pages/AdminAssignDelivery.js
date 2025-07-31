// File: src/AdminAssignDelivery.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AdminAssignDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [agentSelections, setAgentSelections] = useState({});
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth headers builder with redirect on fail
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch deliveries and agents
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      const [deliveryRes, agentRes] = await Promise.all([
        axios.get('http://localhost:5000/api/delivery/unassigned', { headers }),
        axios.get('http://localhost:5000/api/admin/agents', { headers })
      ]);

      setDeliveries(Array.isArray(deliveryRes.data) ? deliveryRes.data : []);
      setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || 'Failed to fetch data'
      );

      // Redirect on 401 unauthorized
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  // Assign handler
  const handleAssign = async (deliveryId) => {
    const agentId = agentSelections[deliveryId];
    if (!agentId) return toast.warning('Please select an agent first.');

    try {
      const headers = getAuthHeaders();
      await axios.post(
        `http://localhost:5000/api/delivery/assign/${deliveryId}`,
        { agentId },
        { headers }
      );
      toast.success('✅ Delivery successfully assigned!');
      setAgentSelections(prev => {
        const updated = { ...prev };
        delete updated[deliveryId];
        return updated;
      });
      fetchData();
    } catch (err) {
      toast.error(
        `❌ ${err.response?.data?.error || err.message || 'Assignment failed'}`
      );
    }
  };

  // Delete handler
  const handleDelete = async (deliveryId) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;

    try {
      const headers = getAuthHeaders();
      await axios.delete(
        `http://localhost:5000/api/delivery/admin-delete/${deliveryId}`,
        { headers }
      );
      toast.success('✅ Delivery deleted and user notified');
      fetchData();
    } catch (err) {
      toast.error(
        `❌ ${err.response?.data?.error || 'Delete failed'}`
      );
    }
  };

  // === UI STATES ===

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <h2>📝 Assign Deliveries</h2>
        <p>Loading deliveries and agents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <h2>📝 Assign Deliveries</h2>
        <div style={{
          color: '#fff',
          background: '#ef4444',
          padding: 18,
          borderRadius: 7,
          margin: '24px 0',
          fontWeight: 500
        }}>
          <strong>Error:</strong> {error}
          <br />
          <button
            onClick={fetchData}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              marginTop: 14,
              padding: '7px 18px',
              cursor: 'pointer'
            }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <h2>📝 Assign Deliveries</h2>

      <div style={{ marginBottom: '20px', marginTop: 8 }}>
        <button
          onClick={fetchData}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            marginBottom: 10,
            padding: '7px 16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
          🔄 Refresh Data
        </button>
        <div style={{ marginTop: 6, color: '#4b5563' }}>
          <strong>Unassigned Deliveries:</strong> {deliveries.length} |{' '}
          <strong>Available Agents:</strong> {agents.length}
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          backgroundColor: '#e0f7fa',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#22c55e', fontSize: 20, marginBottom: 6 }}>✅ All deliveries assigned!</p>
          <p>There are no unassigned deliveries.</p>
        </div>
      ) : agents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          backgroundColor: '#fdf6b2',
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <p style={{ color: '#d97706', fontSize: 20, marginBottom: 6 }}>⚠️ No agents available!</p>
          <p>Please create agent accounts first.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table border="0" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#f5f7fa', borderRadius: 8 }}>
            <thead>
              <tr style={{ backgroundColor: '#e0e7ef', borderBottom: '2px solid #3b82f6' }}>
                <th>Tracking ID</th>
                <th>From</th>
                <th>To</th>
                <th>User</th>
                <th>Contact</th>
                <th>Assign to Agent</th>
                <th>Action</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(delivery => (
                <tr key={delivery._id} style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    background: '#f0f5fa',
                    color: '#222',
                    fontSize: '1.05em'
                  }}>
                    {delivery.trackingId || '(no ID)'}
                  </td>
                  <td style={{ maxWidth: '170px', wordBreak: 'break-word' }}>
                    {delivery.pickupAddress}
                  </td>
                  <td style={{ maxWidth: '170px', wordBreak: 'break-word' }}>
                    {delivery.deliveryAddress}
                  </td>
                  <td>
                    <div>
                      <strong>{(delivery.userId && delivery.userId.name) || 'Unknown'}</strong>
                      <br />
                      <small>{(delivery.userId && delivery.userId.email) || 'No email'}</small>
                    </div>
                  </td>
                  <td>{delivery.contactNumber || 'N/A'}</td>
                  <td>
                    <select
                      value={agentSelections[delivery._id] || ''}
                      onChange={e =>
                        setAgentSelections({ ...agentSelections, [delivery._id]: e.target.value })
                      }
                      style={{
                        width: '160px',
                        padding: '4px 6px',
                        borderRadius: 5,
                        outline: '1px solid #d1d5db',
                        background: '#f3f4f6'
                      }}>
                      <option value="">-- Select Agent --</option>
                      {agents.map(agent => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleAssign(delivery._id)}
                      disabled={!agentSelections[delivery._id]}
                      style={{
                        backgroundColor: agentSelections[delivery._id] ? '#22c55e' : '#94a3b8',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '1em',
                        cursor: agentSelections[delivery._id] ? 'pointer' : 'not-allowed'
                      }}>
                      📋 Assign
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(delivery._id)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '1em',
                        cursor: 'pointer'
                      }}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default AdminAssignDelivery;
