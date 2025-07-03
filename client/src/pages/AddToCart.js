import React, { useState } from 'react';

function AddToCart() {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const handleAdd = async () => {
    const token = localStorage.getItem('token');

    const res = await fetch('http://localhost:5000/api/parcels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ pickup, drop })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Delivery added successfully');
    } else {
      alert(data.message || 'Failed');
    }
  };

  return (
    <div>
      <h2>Create Delivery</h2>
      <input placeholder="Pickup Address" onChange={(e) => setPickup(e.target.value)} />
      <input placeholder="Drop Address" onChange={(e) => setDrop(e.target.value)} />
      <button onClick={handleAdd}>Submit</button>
    </div>
  );
}

export default AddToCart;