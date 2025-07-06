import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state;

  const [price, setPrice] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  const hasSubmitted = useRef(false); // 🔒 Flag to prevent multiple submissions

  useEffect(() => {
    if (!order) {
      alert('No order data found. Please restart the process.');
      navigate('/');
      return;
    }

    const {
      userId,
      pickupAddress,
      deliveryAddress,
      pickupCoordinates,
      deliveryCoordinates,
      description,
      contactNumber,
      deliveryDate,
      additionalInfoPickup,
      additionalInfoDelivery
    } = order;

    const isValid =
      userId &&
      pickupAddress &&
      deliveryAddress &&
      pickupCoordinates?.lat &&
      pickupCoordinates?.lng &&
      deliveryCoordinates?.lat &&
      deliveryCoordinates?.lng &&
      description &&
      contactNumber &&
      deliveryDate;

    if (!isValid) {
      console.error("❌ Missing field in order:", order);
      alert("Order information is incomplete. Please re-enter.");
      navigate('/');
      return;
    }

    const calculateDistanceAndSubmit = async () => {
      if (hasSubmitted.current) return; // ✅ Prevent duplicate submission
      hasSubmitted.current = true;

      try {
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
          {
            origins: [new window.google.maps.LatLng(pickupCoordinates.lat, pickupCoordinates.lng)],
            destinations: [new window.google.maps.LatLng(deliveryCoordinates.lat, deliveryCoordinates.lng)],
            travelMode: 'DRIVING'
          },
          async (response, status) => {
            if (status === 'OK') {
              const distanceInMeters = response.rows[0].elements[0].distance.value;
              const distanceInKm = distanceInMeters / 1000;
              const calculatedPrice = 20 + distanceInKm * 10;

              setDistanceKm(distanceInKm.toFixed(2));
              setPrice(calculatedPrice.toFixed(2));

              const payload = {
                userId,
                pickupAddress: additionalInfoPickup
                  ? `${pickupAddress}, ${additionalInfoPickup}`
                  : pickupAddress,
                deliveryAddress: additionalInfoDelivery
                  ? `${deliveryAddress}, ${additionalInfoDelivery}`
                  : deliveryAddress,
                pickupCoordinates,
                deliveryCoordinates,
                description,
                contactNumber,
                deliveryDate,
                price: calculatedPrice.toFixed(2)
              };

              const token = localStorage.getItem('token');
              await axios.post('http://localhost:5000/api/delivery/create', payload, {
                headers: { Authorization: `Bearer ${token}` }
              });

              alert('✅ Order placed successfully! Please pay in cash upon pickup.');
              navigate('/mydeliveries');
            } else {
              console.error('Distance matrix error:', status);
              alert('Failed to calculate distance. Try again.');
              hasSubmitted.current = false;
            }
          }
        );
      } catch (err) {
        console.error("❌ Error during distance calculation or submission:", err.message);
        alert("Error while placing order. Please try again later.");
        hasSubmitted.current = false;
      }
    };

    if (window.google && window.google.maps) {
      calculateDistanceAndSubmit();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = calculateDistanceAndSubmit;
      document.body.appendChild(script);
    }
  }, [order, navigate]);

  return (
    <div className="container">
      <h2>Placing Your Order...</h2>
      {distanceKm && price ? (
        <div>
          <p>📍 Distance: {distanceKm} km</p>
          <p>💰 Price: ₹{price}</p>
        </div>
      ) : (
        <p>Please wait while we confirm your delivery request.</p>
      )}
    </div>
  );
}

export default Payments;
