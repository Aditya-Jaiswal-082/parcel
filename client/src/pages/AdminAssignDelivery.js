// File: src/AdminAssignDelivery.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminAssignDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [agentSelections, setAgentSelections] = useState({});
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const deliveryRes = await axios.get('http://localhost:5000/api/delivery/unassigned');
      const agentRes = await axios.get('http://localhost:5000/api/admin/agents');

      setDeliveries(deliveryRes.data);
      setAgents(agentRes.data); // already filtered to role === 'agent' from backend
    } catch (err) {
      console.error('❌ Error fetching data:', err.message);
    }
  };

  const handleAssign = async (deliveryId) => {
    const agentId = agentSelections[deliveryId];
    if (!agentId) return alert('Please select an agent.');

    try {
      await axios.patch(`http://localhost:5000/api/admin/assign-delivery/${deliveryId}`, {
        agentId
      });

      alert('✅ Delivery successfully assigned!');
      fetchData(); // refresh the list
    } catch (err) {
      console.error("❌ Assignment failed:", err.response?.data || err.message);
      alert("Assignment failed.");
    }
  };

  return (
    <div className="container">
      <h2>📝 Assign Deliveries</h2>

      {deliveries.length === 0 ? (
        <p>No unassigned deliveries.</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>User</th>
              <th>Assign to Agent</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map(delivery => (
              <tr key={delivery._id}>
                <td>{delivery.pickupAddress}</td>
                <td>{delivery.deliveryAddress}</td>
                <td>{delivery.userId?.name || 'Unknown'}</td>
                <td>
                  <select
                    value={agentSelections[delivery._id] || ''}
                    onChange={e =>
                      setAgentSelections({ ...agentSelections, [delivery._id]: e.target.value })
                    }
                  >
                    <option value="">-- Select Agent --</option>
                    {agents.map(agent => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleAssign(delivery._id)}
                    disabled={!agentSelections[delivery._id]}
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminAssignDelivery;
