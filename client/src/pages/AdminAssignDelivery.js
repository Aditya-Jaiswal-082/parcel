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

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // Fetch both unassigned deliveries and agents
      const [deliveryRes, agentRes] = await Promise.all([
        axios.get('http://localhost:5000/api/delivery/unassigned', { headers }),
        axios.get('http://localhost:5000/api/admin/agents', { headers })
      ]);

      console.log('Unassigned deliveries:', deliveryRes.data);
      console.log('Available agents:', agentRes.data);

      setDeliveries(Array.isArray(deliveryRes.data) ? deliveryRes.data : []);
      setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch data';
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

  const handleDelete = async (deliveryId) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`http://localhost:5000/api/delivery/admin-delete/${deliveryId}`, { headers });
      
      toast.success('✅ Delivery deleted and user notified');
      fetchData(); // Refresh list
    } catch (err) {
      console.error('❌ Delete failed:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || 'Delete failed';
      toast.error(`❌ ${errorMessage}`);
    }
  };

  const handleAssign = async (deliveryId) => {
    const agentId = agentSelections[deliveryId];
    if (!agentId) {
      toast.warning('Please select an agent first');
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      // ✅ FIXED: Use the correct endpoint from your backend
      await axios.post(`http://localhost:5000/api/delivery/assign/${deliveryId}`, {
        agentId
      }, { headers });

      toast.success('✅ Delivery successfully assigned!');
      
      // Clear the selection for this delivery
      setAgentSelections(prev => {
        const updated = { ...prev };
        delete updated[deliveryId];
        return updated;
      });
      
      fetchData(); // Refresh the list
    } catch (err) {
      console.error("❌ Assignment failed:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || 'Assignment failed';
      toast.error(`❌ ${errorMessage}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container">
        <h2>📝 Assign Deliveries</h2>
        <p>Loading deliveries and agents...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <h2>📝 Assign Deliveries</h2>
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
          <br />
          <button onClick={fetchData} style={{ marginTop: '10px' }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>📝 Assign Deliveries</h2>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={fetchData} style={{ marginBottom: '10px' }}>
          🔄 Refresh Data
        </button>
        <p>
          <strong>Unassigned Deliveries:</strong> {deliveries.length} | 
          <strong> Available Agents:</strong> {agents.length}
        </p>
      </div>

      {deliveries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <p>✅ No unassigned deliveries found.</p>
          <p>All deliveries have been assigned to agents.</p>
        </div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
          <p>⚠️ No agents available for assignment.</p>
          <p>Please create agent accounts first.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
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
                <tr key={delivery._id}>
                  <td style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa' }}>
                    {delivery.trackingId || 'N/A'}
                  </td>
                  <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                    {delivery.pickupAddress}
                  </td>
                  <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                    {delivery.deliveryAddress}
                  </td>
                  <td>
                    <div>
                      <strong>{delivery.userId?.name || 'Unknown'}</strong>
                      <br />
                      <small>{delivery.userId?.email || 'No email'}</small>
                    </div>
                  </td>
                  <td>{delivery.contactNumber || 'N/A'}</td>
                  <td>
                    <select
                      value={agentSelections[delivery._id] || ''}
                      onChange={e =>
                        setAgentSelections({ ...agentSelections, [delivery._id]: e.target.value })
                      }
                      style={{ width: '150px', padding: '5px' }}
                    >
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
                        backgroundColor: agentSelections[delivery._id] ? '#4caf50' : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: agentSelections[delivery._id] ? 'pointer' : 'not-allowed'
                      }}
                    >
                      📋 Assign
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(delivery._id)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
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
        autoClose={3000}
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
