// src/components/LocationInput.js
import React, { useState, useEffect } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import axios from 'axios';

const libraries = ['places'];

export default function LocationInput({ label, onLocationResolved }) {
  const [autocomplete, setAutocomplete] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const onLoad = (autoC) => setAutocomplete(autoC);

  const onPlaceChanged = async () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const fullAddress = place.formatted_address || place.name;

      try {
        const res = await axios.post('http://localhost:5000/api/location/resolve', {
          address: fullAddress
        });

        onLocationResolved(res.data); // returns { address, coordinates }
      } catch (err) {
        console.error('Failed to resolve address', err);
      }
    }
  };

  return isLoaded ? (
    <div style={{ marginBottom: '1rem' }}>
      <label>{label}</label><br />
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          placeholder="Enter address"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ width: '100%', padding: '8px' }}
        />
      </Autocomplete>
    </div>
  ) : <p>Loading Maps...</p>;
}
