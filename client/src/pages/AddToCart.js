// src/pages/AddToCart.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddToCart.css';

function AddToCart() {
  const navigate = useNavigate();
  const pickupRef = useRef(null);
  const deliveryRef = useRef(null);

  // User authentication and role check
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = localStorage.getItem('role');
  const isLoggedIn = !!localStorage.getItem('token');

  // Enhanced form state
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    description: '',
    contactNumber: '',
    deliveryDate: '',
    pickupCoordinates: null,
    deliveryCoordinates: null,
    additionalInfoPickup: '',
    additionalInfoDelivery: '',
    // Enhanced fields
    senderName: '', // New field for sender name
    recipientName: '',
    recipientContact: '',
    deliveryTime: 'anytime',
    packageType: 'document',
    packageWeight: '0-1',
    urgency: 'standard',
    fragile: false,
    requiresSignature: false,
    specialInstructions: '',
    // Packaging options
    requiresPackaging: false,
    packagingType: 'small',
    // Additional options for same building delivery
    sameBuildingDelivery: false,
    buildingName: '',
    pickupFloor: '',
    deliveryFloor: '',
    pickupUnit: '',
    deliveryUnit: ''
  });

  const [userId, setUserId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');

  // Weight ranges with pricing
  const weightRanges = {
    '0-1': { label: '0-1 kg', charge: 0 },
    '1-3': { label: '1-3 kg', charge: 20 },
    '3-5': { label: '3-5 kg', charge: 40 },
    '5-10': { label: '5-10 kg', charge: 80 },
    '10+': { label: '10+ kg', charge: 150 }
  };

  // Packaging options with pricing
  const packagingOptions = {
    'small': { label: 'Small (Documents, Cards)', charge: 15 },
    'medium': { label: 'Medium (Books, Electronics)', charge: 25 },
    'large': { label: 'Large (Clothing, Gifts)', charge: 40 },
    'extra-large': { label: 'Extra Large (Appliances)', charge: 60 }
  };

  // Additional options for deliveries
  const additionalOptions = [
    { value: 'home', label: '🏠 Home', icon: '🏠' },
    { value: 'office', label: '🏢 Office', icon: '🏢' },
    { value: 'apartment', label: '🏬 Apartment Complex', icon: '🏬' },
    { value: 'mall', label: '🛒 Shopping Mall', icon: '🛒' },
    { value: 'hospital', label: '🏥 Hospital', icon: '🏥' },
    { value: 'school', label: '🏫 School/College', icon: '🏫' },
    { value: 'hotel', label: '🏨 Hotel', icon: '🏨' },
    { value: 'restaurant', label: '🍽️ Restaurant', icon: '🍽️' },
    { value: 'shop', label: '🏪 Shop', icon: '🏪' },
    { value: 'other', label: '📍 Other', icon: '📍' }
  ];

  // Check access permissions and initialize
  useEffect(() => {
    // Authentication check
    if (!isLoggedIn) {
      alert('🔐 Please login to create a delivery order');
      navigate('/login');
      return;
    }

    // Role-based access control
    if (userRole === 'agent') {
      alert('🚫 Access Denied: Agents cannot create delivery orders. Only users and admins can create orders.');
      navigate('/dashboard');
      return;
    }

    // Set user ID
    const id = localStorage.getItem('userId') || user._id;
    if (id) {
      setUserId(id);
    } else {
      alert('❌ User session error. Please login again.');
      navigate('/login');
      return;
    }

    // Load ALL saved addresses (not separated by type)
    const saved = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
    setSavedAddresses(Array.isArray(saved) ? saved : []);

    // Initialize Google Maps
    loadGoogleMapsScript();
  }, [isLoggedIn, userRole, navigate, user._id]);

  // Load Google Maps Script
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
      script.onerror = () => {
        setErrors({ maps: 'Failed to load Google Maps. Please check your internet connection and API key.' });
      };
      document.body.appendChild(script);
    }
  };

  // Initialize Autocomplete
  const initAutocomplete = () => {
    if (!window.google?.maps?.places) return;

    const autocompleteOptions = {
      componentRestrictions: { country: 'IN' },
      fields: ['formatted_address', 'geometry', 'name', 'place_id']
    };

    const setPlaceData = (place, type) => {
      if (!place.geometry || !place.formatted_address) {
        alert('⚠️ Please select a valid address from the dropdown suggestions.');
        return;
      }

      const coordinates = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };

      setFormData(prev => ({
        ...prev,
        [`${type}Address`]: place.formatted_address,
        [`${type}Coordinates`]: coordinates
      }));

      // Clear errors for this field
      setErrors(prev => ({ ...prev, [`${type}Address`]: '' }));

      // Calculate distance when both addresses are set
      if (type === 'delivery' && formData.pickupCoordinates) {
        setTimeout(() => calculateDistance(formData.pickupCoordinates, coordinates), 500);
      } else if (type === 'pickup' && formData.deliveryCoordinates) {
        setTimeout(() => calculateDistance(coordinates, formData.deliveryCoordinates), 500);
      }
    };

    // Pickup autocomplete
    if (pickupRef.current) {
      const pickupAutocomplete = new window.google.maps.places.Autocomplete(
        pickupRef.current,
        autocompleteOptions
      );
      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        setPlaceData(place, 'pickup');
      });
    }

    // Delivery autocomplete
    if (deliveryRef.current) {
      const deliveryAutocomplete = new window.google.maps.places.Autocomplete(
        deliveryRef.current,
        autocompleteOptions
      );
      deliveryAutocomplete.addListener('place_changed', () => {
        const place = deliveryAutocomplete.getPlace();
        setPlaceData(place, 'delivery');
      });
    }
  };

  // Calculate distance
  const calculateDistance = (pickupCoords, deliveryCoords) => {
    if (!pickupCoords || !deliveryCoords || !window.google?.maps) return;

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [new window.google.maps.LatLng(pickupCoords.lat, pickupCoords.lng)],
      destinations: [new window.google.maps.LatLng(deliveryCoords.lat, deliveryCoords.lng)],
      travelMode: 'DRIVING',
      unitSystem: window.google.maps.UnitSystem.METRIC
    }, (response, status) => {
      if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
        const distance = response.rows[0].elements[0].distance.value / 1000; // in km
        setEstimatedDistance(distance.toFixed(2));
      } else {
        console.error('Distance calculation failed:', status);
        setErrors(prev => ({ ...prev, distance: 'Unable to calculate distance. Please check addresses.' }));
      }
    });
  };

  // Calculate detailed pricing
  const calculateDetailedPrice = () => {
    if (!estimatedDistance) return null;

    let distance = parseFloat(estimatedDistance);
    
    // For same building delivery, set minimum distance
    if (formData.sameBuildingDelivery) {
      distance = Math.max(distance, 0.1); // Minimum 0.1 km for same building
    }

    const baseCharge = 25;
    const perKmRate = 10;
    const distanceCharge = distance * perKmRate;
    
    // Weight charge
    const weightCharge = weightRanges[formData.packageWeight]?.charge || 0;
    
    // Urgency multiplier
    const urgencyMultiplier = formData.urgency === 'express' ? 1.5 : 1;
    const urgencyLabel = formData.urgency === 'express' ? 'Express (50% extra)' : 'Standard';
    
    // Additional charges
    const fragileCharge = formData.fragile ? 25 : 0;
    const signatureCharge = formData.requiresSignature ? 15 : 0;
    const packagingCharge = formData.requiresPackaging ? 
      packagingOptions[formData.packagingType]?.charge || 0 : 0;
    
    // Same building delivery discount
    const sameBuildingDiscount = formData.sameBuildingDelivery ? 10 : 0;
    
    // Calculate subtotal before urgency multiplier
    const subtotal = baseCharge + distanceCharge + weightCharge - sameBuildingDiscount;
    const urgencyCharge = formData.urgency === 'express' ? Math.round(subtotal * 0.5) : 0;
    
    // Total calculation
    const total = Math.round(Math.max(30, subtotal + urgencyCharge + fragileCharge + signatureCharge + packagingCharge));

    return {
      baseCharge,
      distance: distance.toFixed(2),
      distanceCharge: Math.round(distanceCharge),
      weightRange: weightRanges[formData.packageWeight]?.label || '',
      weightCharge,
      urgencyLabel,
      urgencyCharge,
      fragileCharge,
      signatureCharge,
      packagingCharge,
      packagingType: formData.requiresPackaging ? packagingOptions[formData.packagingType]?.label : null,
      sameBuildingDiscount,
      subtotal: Math.max(30, subtotal),
      total
    };
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Clear field error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Handle same building delivery toggle
    if (name === 'sameBuildingDelivery' && checked) {
      setFormData(prev => ({
        ...prev,
        deliveryAddress: prev.pickupAddress,
        deliveryCoordinates: prev.pickupCoordinates
      }));
      
      if (deliveryRef.current) {
        deliveryRef.current.value = formData.pickupAddress;
      }
    }
  };

  // Enhanced save address function
  const saveAddressToLocalStorage = (type) => {
    const address = formData[`${type}Address`];
    const coordinates = formData[`${type}Coordinates`];
    const additionalInfo = formData[`additionalInfo${type.charAt(0).toUpperCase() + type.slice(1)}`];

    if (!address || !coordinates) {
      alert(`⚠️ Please select a valid ${type} address first.`);
      return;
    }

    const label = prompt(`💾 Give a label for this address (e.g., Home, Office, Mom's House):`);
    if (!label) return;

    // Check if address already exists
    const exists = savedAddresses.some(addr => 
      addr.address === address || addr.label.toLowerCase() === label.toLowerCase()
    );

    if (exists) {
      alert('📍 This address or label already exists in your saved addresses.');
      return;
    }

    // Create full address with additional info
    const fullAddress = additionalInfo ? `${address}, ${additionalInfo}` : address;

    const newEntry = { 
      label, 
      address, 
      fullAddress,
      additionalInfo,
      coordinates, 
      type,
      senderName: type === 'pickup' ? formData.senderName : null,
      createdAt: new Date().toISOString() 
    };

    const updated = [...savedAddresses, newEntry];
    setSavedAddresses(updated);
    localStorage.setItem('savedAddresses', JSON.stringify(updated));
    alert(`✅ Address saved as "${label}"`);
  };

  // Enhanced saved address selection
  const handleSavedAddressSelect = (addressObj) => {
    const type = addressObj.forType; // 'pickup' or 'delivery'
    
    setFormData(prev => ({
      ...prev,
      [`${type}Address`]: addressObj.address,
      [`${type}Coordinates`]: addressObj.coordinates,
      [`additionalInfo${type.charAt(0).toUpperCase() + type.slice(1)}`]: addressObj.additionalInfo || '',
      ...(type === 'pickup' && addressObj.senderName ? { senderName: addressObj.senderName } : {})
    }));

    // Update the input field
    if (type === 'pickup' && pickupRef.current) {
      pickupRef.current.value = addressObj.address;
    } else if (type === 'delivery' && deliveryRef.current) {
      deliveryRef.current.value = addressObj.address;
    }

    // Clear errors
    setErrors(prev => ({ ...prev, [`${type}Address`]: '' }));
    setShowSavedAddresses(false);

    // Calculate distance if both addresses are selected
    if (type === 'pickup' && formData.deliveryCoordinates) {
      calculateDistance(addressObj.coordinates, formData.deliveryCoordinates);
    } else if (type === 'delivery' && formData.pickupCoordinates) {
      calculateDistance(formData.pickupCoordinates, addressObj.coordinates);
    }
  };

  // Delete saved address
  const deleteSavedAddress = (index) => {
    if (window.confirm('🗑️ Are you sure you want to delete this saved address?')) {
      const updated = savedAddresses.filter((_, i) => i !== index);
      setSavedAddresses(updated);
      localStorage.setItem('savedAddresses', JSON.stringify(updated));
    }
  };

  // Filter saved addresses based on search
  const filteredAddresses = savedAddresses.filter(addr =>
    addr.label.toLowerCase().includes(addressSearchQuery.toLowerCase()) ||
    addr.address.toLowerCase().includes(addressSearchQuery.toLowerCase())
  );

  // Enhanced form validation with same-building support
  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.pickupAddress) newErrors.pickupAddress = '📍 Pickup address is required';
    if (!formData.deliveryAddress) newErrors.deliveryAddress = '📍 Delivery address is required';
    if (!formData.description) newErrors.description = '📝 Package description is required';
    if (!formData.contactNumber) newErrors.contactNumber = '📞 Contact number is required';
    if (!formData.senderName) newErrors.senderName = '👤 Sender name is required';
    if (!formData.recipientName) newErrors.recipientName = '👤 Recipient name is required';
    if (!formData.recipientContact) newErrors.recipientContact = '📞 Recipient contact is required';
    if (!formData.deliveryDate) newErrors.deliveryDate = '📅 Delivery date is required';

    // Coordinates validation
    if (!formData.pickupCoordinates) newErrors.pickupAddress = '📍 Please select pickup address from suggestions';
    if (!formData.deliveryCoordinates) newErrors.deliveryAddress = '📍 Please select delivery address from suggestions';

    // Phone validation
    const phoneRegex = /^[+]?[\d\s-()]{10,15}$/;
    if (formData.contactNumber && !phoneRegex.test(formData.contactNumber)) {
      newErrors.contactNumber = '📞 Please enter a valid contact number';
    }
    if (formData.recipientContact && !phoneRegex.test(formData.recipientContact)) {
      newErrors.recipientContact = '📞 Please enter a valid recipient contact';
    }

    // Date validation
    if (formData.deliveryDate) {
      const selectedDate = new Date(formData.deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.deliveryDate = '📅 Delivery date cannot be in the past';
      }
    }

    // Enhanced same address check with same-building support
    if (formData.pickupCoordinates && formData.deliveryCoordinates && !formData.sameBuildingDelivery) {
      const distance = calculateHaversineDistance(
        formData.pickupCoordinates.lat, formData.pickupCoordinates.lng,
        formData.deliveryCoordinates.lat, formData.deliveryCoordinates.lng
      );
      
      // Only show error if addresses are exactly the same AND no different unit numbers
      if (distance < 0.05 && 
          formData.pickupAddress === formData.deliveryAddress &&
          formData.additionalInfoPickup === formData.additionalInfoDelivery) {
        newErrors.deliveryAddress = '📍 For same building delivery, please check "Same Building Delivery" option and provide different unit numbers';
      }
    }

    // Same building validation
    if (formData.sameBuildingDelivery) {
      if (!formData.pickupUnit) newErrors.pickupUnit = '🏠 Pickup unit/room number is required for same building delivery';
      if (!formData.deliveryUnit) newErrors.deliveryUnit = '🏠 Delivery unit/room number is required for same building delivery';
      if (formData.pickupUnit === formData.deliveryUnit) {
        newErrors.deliveryUnit = '🏠 Pickup and delivery units cannot be the same';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate distance between coordinates
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Handle next step
  const handleNext = (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate step 1 fields
      const step1Fields = ['pickupAddress', 'deliveryAddress', 'description', 'contactNumber', 'senderName'];
      const step1Errors = {};
      
      step1Fields.forEach(field => {
        if (!formData[field]) {
          step1Errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
        }
      });

      if (!formData.pickupCoordinates) step1Errors.pickupAddress = 'Please select pickup address from suggestions';
      if (!formData.deliveryCoordinates) step1Errors.deliveryAddress = 'Please select delivery address from suggestions';

      // Same building validation for step 1
      if (formData.sameBuildingDelivery) {
        if (!formData.pickupUnit) step1Errors.pickupUnit = 'Pickup unit number is required';
        if (!formData.deliveryUnit) step1Errors.deliveryUnit = 'Delivery unit number is required';
      }

      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        return;
      }
      
      setStep(2);
      setErrors({});
    } else {
      // Final submission
      if (!validateForm()) return;

      setLoading(true);
      
      // Prepare order data with detailed pricing
      const pricingDetails = calculateDetailedPrice();
      const orderData = {
        ...formData,
        userId,
        estimatedDistance,
        estimatedPrice: pricingDetails?.total || 0,
        pricingBreakdown: pricingDetails
      };

      // Navigate to payment
      navigate('/payment', { state: orderData });
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setStep(1);
    setErrors({});
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="page-content">
      <div className="create-delivery-container">
        <div className="delivery-header">
          <h2>📦 Create New Delivery</h2>
          <p>Welcome <strong>{user.name}</strong>! Fill out the details to create your delivery order.</p>
          
          {/* Enhanced Progress Indicator */}
          <div className="progress-indicator">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <span>Address & Details</span>
            </div>
            <div className={`progress-line ${step >= 2 ? 'completed' : ''}`}></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <span>Options & Pricing</span>
            </div>
          </div>
        </div>

        {errors.maps && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            {errors.maps}
          </div>
        )}

        <form onSubmit={handleNext} className="delivery-form">
          {step === 1 && (
            <div className="form-step">
              <h3>📍 Step 1: Address & Package Information</h3>
              
              {/* Enhanced Saved Addresses Section */}
              {savedAddresses.length > 0 && (
                <div className="saved-addresses-section">
                  <div className="saved-addresses-header">
                    <h4>📋 Your Saved Addresses ({savedAddresses.length})</h4>
                    <button 
                      type="button" 
                      className="toggle-addresses-btn"
                      onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                    >
                      {showSavedAddresses ? '👆 Hide Addresses' : '👇 Show Saved Addresses'}
                    </button>
                  </div>
                  
                  {showSavedAddresses && (
                    <div className="saved-addresses-dropdown">
                      <div className="address-search">
                        <input
                          type="text"
                          placeholder="🔍 Search saved addresses..."
                          value={addressSearchQuery}
                          onChange={(e) => setAddressSearchQuery(e.target.value)}
                          className="address-search-input"
                        />
                      </div>
                      
                      <div className="addresses-grid">
                        {filteredAddresses.map((addr, i) => (
                          <div key={i} className="saved-address-card">
                            <div className="address-info">
                              <h5>{addr.label}</h5>
                              <p className="address-text">{addr.fullAddress || addr.address}</p>
                              {addr.senderName && (
                                <p className="sender-name">👤 {addr.senderName}</p>
                              )}
                            </div>
                            
                            <div className="address-actions">
                              <button
                                type="button"
                                className="use-for-pickup-btn"
                                onClick={() => handleSavedAddressSelect({...addr, forType: 'pickup'})}
                              >
                                📤 Use as Pickup
                              </button>
                              <button
                                type="button"
                                className="use-for-delivery-btn"
                                onClick={() => handleSavedAddressSelect({...addr, forType: 'delivery'})}
                              >
                                📥 Use as Delivery
                              </button>
                              <button
                                type="button"
                                className="delete-address-btn"
                                onClick={() => deleteSavedAddress(i)}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Same Building Delivery Option */}
              <div className="same-building-section">
                <label className="same-building-checkbox">
                  <input
                    type="checkbox"
                    name="sameBuildingDelivery"
                    checked={formData.sameBuildingDelivery}
                    onChange={handleChange}
                  />
                  <span className="checkmark">🏢</span>
                  <div className="checkbox-content">
                    <strong>Same Building Delivery</strong>
                    <small>Delivery within the same building (₹10 discount)</small>
                  </div>
                </label>
              </div>

              {/* Pickup Address Section */}
              <div className="form-section pickup-section">
                <h4>📤 Pickup Address</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Sender Name *</label>
                    <input
                      type="text"
                      name="senderName"
                      value={formData.senderName}
                      onChange={handleChange}
                      placeholder="Full name of the sender"
                      className={errors.senderName ? 'error' : ''}
                    />
                    {errors.senderName && <span className="error-text">{errors.senderName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Your Contact Number *</label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      className={errors.contactNumber ? 'error' : ''}
                    />
                    {errors.contactNumber && <span className="error-text">{errors.contactNumber}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Pickup Address *</label>
                  <input
                    type="text"
                    name="pickupAddress"
                    ref={pickupRef}
                    value={formData.pickupAddress}
                    onChange={handleChange}
                    placeholder="Start typing your pickup address..."
                    className={errors.pickupAddress ? 'error' : ''}
                    disabled={formData.sameBuildingDelivery && formData.deliveryAddress}
                  />
                  {errors.pickupAddress && <span className="error-text">{errors.pickupAddress}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Additional Pickup Info</label>
                    <div className="additional-info-group">
                      <input
                        type="text"
                        name="additionalInfoPickup"
                        value={formData.additionalInfoPickup}
                        onChange={handleChange}
                        placeholder="Flat/Room No, Landmark, Floor, etc."
                      />
                      <select 
                        className="location-type-select"
                        onChange={(e) => {
                          if (e.target.value && e.target.value !== 'custom') {
                            const option = additionalOptions.find(opt => opt.value === e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              additionalInfoPickup: prev.additionalInfoPickup + (prev.additionalInfoPickup ? ', ' : '') + option.label.split(' ').slice(1).join(' ')
                            }));
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">📍 Quick Add</option>
                        {additionalOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.sameBuildingDelivery && (
                    <div className="form-group">
                      <label>Pickup Unit/Room *</label>
                      <input
                        type="text"
                        name="pickupUnit"
                        value={formData.pickupUnit}
                        onChange={handleChange}
                        placeholder="e.g., 201, A-301, Room 15"
                        className={errors.pickupUnit ? 'error' : ''}
                      />
                      {errors.pickupUnit && <span className="error-text">{errors.pickupUnit}</span>}
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  className="save-address-btn"
                  onClick={() => saveAddressToLocalStorage('pickup')}
                >
                  💾 Save This Pickup Address
                </button>
              </div>

              {/* Delivery Address Section */}
              <div className="form-section delivery-section">
                <h4>📥 Delivery Address</h4>

                <div className="form-group">
                  <label>Delivery Address *</label>
                  <input
                    type="text"
                    name="deliveryAddress"
                    ref={deliveryRef}
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    placeholder={formData.sameBuildingDelivery ? "Same as pickup address" : "Start typing your delivery address..."}
                    className={errors.deliveryAddress ? 'error' : ''}
                    disabled={formData.sameBuildingDelivery}
                  />
                  {errors.deliveryAddress && <span className="error-text">{errors.deliveryAddress}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Additional Delivery Info</label>
                    <div className="additional-info-group">
                      <input
                        type="text"
                        name="additionalInfoDelivery"
                        value={formData.additionalInfoDelivery}
                        onChange={handleChange}
                        placeholder="Flat/Room No, Landmark, Floor, etc."
                      />
                      <select 
                        className="location-type-select"
                        onChange={(e) => {
                          if (e.target.value && e.target.value !== 'custom') {
                            const option = additionalOptions.find(opt => opt.value === e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              additionalInfoDelivery: prev.additionalInfoDelivery + (prev.additionalInfoDelivery ? ', ' : '') + option.label.split(' ').slice(1).join(' ')
                            }));
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">📍 Quick Add</option>
                        {additionalOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.sameBuildingDelivery && (
                    <div className="form-group">
                      <label>Delivery Unit/Room *</label>
                      <input
                        type="text"
                        name="deliveryUnit"
                        value={formData.deliveryUnit}
                        onChange={handleChange}
                        placeholder="e.g., 310, B-405, Room 25"
                        className={errors.deliveryUnit ? 'error' : ''}
                      />
                      {errors.deliveryUnit && <span className="error-text">{errors.deliveryUnit}</span>}
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  className="save-address-btn"
                  onClick={() => saveAddressToLocalStorage('delivery')}
                >
                  💾 Save This Delivery Address
                </button>
              </div>

              {/* Package Details */}
              <div className="form-section package-section">
                <h4>📝 Package Details</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Package Description *</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="e.g., Documents, Electronics, Clothes..."
                      className={errors.description ? 'error' : ''}
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                  </div>

                  <div className="form-group">
                    <label>Package Type</label>
                    <select name="packageType" value={formData.packageType} onChange={handleChange}>
                      <option value="document">📄 Documents</option>
                      <option value="electronics">📱 Electronics</option>
                      <option value="clothing">👕 Clothing</option>
                      <option value="food">🍕 Food Items</option>
                      <option value="gifts">🎁 Gifts</option>
                      <option value="other">📦 Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Delivery Date *</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    min={getMinDate()}
                    className={errors.deliveryDate ? 'error' : ''}
                  />
                  {errors.deliveryDate && <span className="error-text">{errors.deliveryDate}</span>}
                </div>
              </div>

              {/* Enhanced Distance Display */}
              {estimatedDistance && (
                <div className="distance-info">
                  <h4>📏 Distance Information</h4>
                  <div className="distance-display">
                    <div className="distance-stats">
                      <div className="stat">
                        <span className="stat-value">{estimatedDistance} km</span>
                        <span className="stat-label">Distance</span>
                      </div>
                      {formData.sameBuildingDelivery && (
                        <div className="stat special">
                          <span className="stat-value">₹10</span>
                          <span className="stat-label">Discount</span>
                        </div>
                      )}
                    </div>
                    <small className="pricing-note">💡 Final pricing will be calculated on the next step</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h3>📋 Step 2: Delivery Options & Pricing</h3>
              
              {/* Recipient Details */}
              <div className="form-section">
                <h4>👤 Recipient Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Recipient Name *</label>
                    <input
                      type="text"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleChange}
                      placeholder="Full name of the recipient"
                      className={errors.recipientName ? 'error' : ''}
                    />
                    {errors.recipientName && <span className="error-text">{errors.recipientName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Recipient Contact *</label>
                    <input
                      type="tel"
                      name="recipientContact"
                      value={formData.recipientContact}
                      onChange={handleChange}
                      placeholder="Recipient's phone number"
                      className={errors.recipientContact ? 'error' : ''}
                    />
                    {errors.recipientContact && <span className="error-text">{errors.recipientContact}</span>}
                  </div>
                </div>
              </div>

              {/* Delivery Preferences */}
              <div className="form-section">
                <h4>⚙️ Delivery Preferences</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Preferred Delivery Time</label>
                    <select name="deliveryTime" value={formData.deliveryTime} onChange={handleChange}>
                      <option value="anytime">🕐 Anytime</option>
                      <option value="morning">🌅 Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">☀️ Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">🌆 Evening (5 PM - 8 PM)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Delivery Urgency</label>
                    <select name="urgency" value={formData.urgency} onChange={handleChange}>
                      <option value="standard">📦 Standard</option>
                      <option value="express">⚡ Express (20% extra)</option>
                    </select>
                  </div>
                </div>

                {/* Weight Ranges */}
                <div className="form-group">
                  <label>Package Weight Range</label>
                  <select name="packageWeight" value={formData.packageWeight} onChange={handleChange}>
                    {Object.entries(weightRanges).map(([key, range]) => (
                      <option key={key} value={key}>
                        ⚖️ {range.label} {range.charge > 0 && `(+₹${range.charge})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Packaging Options */}
              <div className="form-section">
                <h4>📦 Packaging Options</h4>
                
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requiresPackaging"
                      checked={formData.requiresPackaging}
                      onChange={handleChange}
                    />
                    <span className="checkmark">📦</span>
                    <div className="checkbox-content">
                      <strong>Require packaging from our side</strong>
                      <small>We'll provide professional packaging for your item</small>
                    </div>
                  </label>
                </div>

                {formData.requiresPackaging && (
                  <div className="form-group">
                    <label>Packaging Size</label>
                    <select name="packagingType" value={formData.packagingType} onChange={handleChange}>
                      {Object.entries(packagingOptions).map(([key, option]) => (
                        <option key={key} value={key}>
                          📦 {option.label} (+₹{option.charge})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div className="form-section">
                <h4>📋 Additional Options</h4>
                
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="fragile"
                      checked={formData.fragile}
                      onChange={handleChange}
                    />
                    <span className="checkmark">⚠️</span>
                    <div className="checkbox-content">
                      <strong>Fragile Package (+₹15)</strong>
                      <small>Extra care handling for delicate items</small>
                    </div>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requiresSignature"
                      checked={formData.requiresSignature}
                      onChange={handleChange}
                    />
                    <span className="checkmark">✍️</span>
                    <div className="checkbox-content">
                      <strong>Requires Signature (+₹5)</strong>
                      <small>Recipient must sign upon delivery</small>
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label>Special Instructions</label>
                  <textarea
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    placeholder="Any special handling instructions, delivery notes, or other requirements..."
                    rows="3"
                  />
                </div>
              </div>

              {/* Enhanced Detailed Pricing Breakdown */}
              {estimatedDistance && (
                <div className="detailed-pricing">
                  <h4>💰 Detailed Pricing Breakdown</h4>
                  {(() => {
                    const pricing = calculateDetailedPrice();
                    if (!pricing) return null;

                    return (
                      <div className="pricing-breakdown">
                        <div className="pricing-item">
                          <span>Base Charge:</span>
                          <span>₹{pricing.baseCharge}</span>
                        </div>
                        
                        <div className="pricing-item">
                          <span>Distance Charge ({pricing.distance} km × ₹10/km):</span>
                          <span>₹{pricing.distanceCharge}</span>
                        </div>
                        
                        <div className="pricing-item">
                          <span>Weight Charge ({pricing.weightRange}):</span>
                          <span>₹{pricing.weightCharge}</span>
                        </div>

                        {pricing.sameBuildingDiscount > 0 && (
                          <div className="pricing-item discount">
                            <span>Same Building Discount:</span>
                            <span>-₹{pricing.sameBuildingDiscount}</span>
                          </div>
                        )}

                        <div className="pricing-subtotal">
                          <span>Subtotal:</span>
                          <span>₹{pricing.subtotal}</span>
                        </div>

                        {pricing.urgencyCharge > 0 && (
                          <div className="pricing-item urgency">
                            <span>{pricing.urgencyLabel}:</span>
                            <span>₹{pricing.urgencyCharge}</span>
                          </div>
                        )}

                        {pricing.packagingCharge > 0 && (
                          <div className="pricing-item">
                            <span>Packaging ({pricing.packagingType}):</span>
                            <span>₹{pricing.packagingCharge}</span>
                          </div>
                        )}

                        {pricing.fragileCharge > 0 && (
                          <div className="pricing-item">
                            <span>Fragile Handling:</span>
                            <span>₹{pricing.fragileCharge}</span>
                          </div>
                        )}

                        {pricing.signatureCharge > 0 && (
                          <div className="pricing-item">
                            <span>Signature Required:</span>
                            <span>₹{pricing.signatureCharge}</span>
                          </div>
                        )}

                        <div className="pricing-total">
                          <span><strong>Total Amount:</strong></span>
                          <span><strong>₹{pricing.total}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Form Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="form-errors">
              <h4>⚠️ Please fix the following errors:</h4>
              <ul>
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Enhanced Form Navigation */}
          <div className="form-navigation">
            {step === 2 && (
              <button type="button" onClick={handlePrevious} className="btn btn-secondary">
                ← Previous Step
              </button>
            )}
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner">🔄 Processing...</span>
              ) : step === 1 ? (
                'Continue to Options →'
              ) : (
                '💳 Proceed to Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddToCart;
