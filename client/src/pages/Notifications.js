import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/notifications/${userId}`);
        setNotifications(res.data);
      } catch (err) {
        console.error('❌ Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [userId]);

  return (
    <div className="container">
      <h2>🔔 My Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications found.</p>
      ) : (
        <ul>
          {notifications.map((note, index) => (
            <li key={index}>{note.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Notifications;
