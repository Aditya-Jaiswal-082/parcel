import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function AddToCart() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    description: '',
    contactNumber: '',
    deliveryDate: '',
    pickupCoordinates: null,
    deliveryCoordinates: null
  });

  const [userId, setUserId] = useState(null);
  const [price, setPrice] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const pickupRef = useRef(null);
  const deliveryRef = useRef(null);
  const navigate = useNavigate();

  const RATE_PER_KM = 10;
  const BASE_PRICE = 20;

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) setUserId(id);
    else alert('User not logged in. Please log in first.');
  }, []);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }

      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initAutocomplete;
        document.body.appendChild(script);
      }
    };

    const initAutocomplete = () => {
      const setPlaceData = (place, type) => {
        if (!place.geometry || !place.formatted_address) {
          alert('Please select a valid address from suggestions.');
          return;
        }

        const fullAddress = place.formatted_address || place.name;
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        setFormData(prev => ({
          ...prev,
          [`${type}Address`]: fullAddress,
          [`${type}Coordinates`]: coordinates
        }));
      };

      if (pickupRef.current) {
        const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupRef.current);
        pickupAutocomplete.addListener('place_changed', () => {
          const place = pickupAutocomplete.getPlace();
          setPlaceData(place, 'pickup');
        });
      }

      if (deliveryRef.current) {
        const deliveryAutocomplete = new window.google.maps.places.Autocomplete(deliveryRef.current);
        deliveryAutocomplete.addListener('place_changed', () => {
          const place = deliveryAutocomplete.getPlace();
          setPlaceData(place, 'delivery');
        });
      }
    };

    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    const calculateDistance = () => {
      if (
        formData.pickupCoordinates &&
        formData.deliveryCoordinates &&
        window.google?.maps?.DistanceMatrixService
      ) {
        const service = new window.google.maps.DistanceMatrixService();

        service.getDistanceMatrix(
          {
            origins: [
              new window.google.maps.LatLng(
                formData.pickupCoordinates.lat,
                formData.pickupCoordinates.lng
              )
            ],
            destinations: [
              new window.google.maps.LatLng(
                formData.deliveryCoordinates.lat,
                formData.deliveryCoordinates.lng
              )
            ],
            travelMode: 'DRIVING'
          },
          (response, status) => {
            if (status === 'OK') {
              const distanceInMeters = response.rows[0].elements[0].distance.value;
              const distanceInKm = distanceInMeters / 1000;
              const finalPrice = BASE_PRICE + distanceInKm * RATE_PER_KM;

              setDistanceKm(distanceInKm.toFixed(2));
              setPrice(finalPrice.toFixed(2));
              setShowConfirm(true);
            } else {
              console.error('Distance matrix error:', status);
              alert('Could not calculate distance. Try again.');
            }
          }
        );
      }
    };

    calculateDistance();
  }, [formData.pickupCoordinates, formData.deliveryCoordinates]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = e => {
    e.preventDefault();
    if (!formData.pickupCoordinates || !formData.deliveryCoordinates) {
      alert('Please select both pickup and delivery addresses.');
      return;
    }
    // Triggered by useEffect
  };

  const handleConfirm = () => {
  setShowConfirm(false);
  navigate('/payment', { state: { ...formData, price, userId } });
};


  return (
    <div className="container">
      <h2>Create a Delivery</h2>
      <form onSubmit={handleNext}>
        <label>Pickup Address</label>
        <input
          type="text"
          name="pickupAddress"
          ref={pickupRef}
          value={formData.pickupAddress}
          onChange={handleChange}
          required
        />

        <label>Delivery Address</label>
        <input
          type="text"
          name="deliveryAddress"
          ref={deliveryRef}
          value={formData.deliveryAddress}
          onChange={handleChange}
          required
        />

        <label>Parcel Description</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <label>Contact Number</label>
        <input
          type="tel"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          required
        />

        <label>Delivery Date</label>
        <input
          type="date"
          name="deliveryDate"
          value={formData.deliveryDate}
          onChange={handleChange}
        />

        <button type="submit">Next</button>
      </form>

      {showConfirm && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm Order</h3>
            <p>Estimated Distance: {distanceKm} km</p>
            <p>Total Price: ₹{price}</p>
            <button onClick={handleConfirm}>Proceed to Payment</button>
            <button onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddToCart;
