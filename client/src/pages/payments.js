// src/pages/payments.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Payments.css';
import api from "../api/api";

function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state;

  // State management
  const [price, setPrice] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [processingStage, setProcessingStage] = useState('validating');
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);

  const hasSubmitted = useRef(false);
  const progressInterval = useRef(null);

  // Processing stages with messages
  const stages = {
    validating: { message: '🔍 Validating order details...', progress: 10 },
    calculating: { message: '📏 Calculating distance and pricing...', progress: 40 },
    submitting: { message: '📦 Creating your delivery request...', progress: 70 },
    payment: { message: '💳 Processing payment options...', progress: 90 },
    completed: { message: '✅ Order placed successfully!', progress: 100 },
    error: { message: '❌ Something went wrong', progress: 0 }
  };

  // Animate progress bar
  const animateProgress = (targetProgress) => {
    const currentProgress = progress;
    const increment = (targetProgress - currentProgress) / 20;
    
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= targetProgress) {
          clearInterval(progressInterval.current);
          return targetProgress;
        }
        return newProgress;
      });
    }, 50);
  };

  // Calculate estimated delivery time
  const calculateEstimatedTime = (distance) => {
    const baseTime = 30; // 30 minutes base time
    const travelTime = distance * 2; // 2 minutes per km
    return Math.ceil(baseTime + travelTime);
  };

  // ✅ FIXED: Enhanced pricing calculation matching AddToCart.js
  const calculateDetailedPrice = (distance) => {
    if (!order) return null;

    // For same building delivery, set minimum distance
    let finalDistance = parseFloat(distance);
    if (order.sameBuildingDelivery) {
      finalDistance = Math.max(finalDistance, 0.1); // Minimum 0.1 km for same building
    }

    const baseCharge = 25;
    const perKmRate = 10;
    const distanceCharge = finalDistance * perKmRate;
    
    // Weight ranges with pricing (matching AddToCart)
    const weightRanges = {
      '0-1': { charge: 0 },
      '1-3': { charge: 20 },
      '3-5': { charge: 40 },
      '5-10': { charge: 80 },
      '10+': { charge: 150 }
    };
    
    const weightCharge = weightRanges[order.packageWeight]?.charge || 0;
    
    // Urgency multiplier
    const urgencyMultiplier = order.urgency === 'express' ? 1.5 : 1;
    
    // Additional charges
    const fragileCharge = order.fragile ? 25 : 0;
    const signatureCharge = order.requiresSignature ? 15 : 0;
    
    // Packaging options with pricing
    const packagingOptions = {
      'small': { charge: 15 },
      'medium': { charge: 25 },
      'large': { charge: 40 },
      'extra-large': { charge: 60 }
    };
    
    const packagingCharge = order.requiresPackaging ? 
      packagingOptions[order.packagingType]?.charge || 0 : 0;
    
    // Same building delivery discount
    const sameBuildingDiscount = order.sameBuildingDelivery ? 10 : 0;
    
    // Calculate subtotal before urgency multiplier
    const subtotal = baseCharge + distanceCharge + weightCharge - sameBuildingDiscount;
    const urgencyCharge = order.urgency === 'express' ? Math.round(subtotal * 0.5) : 0;
    
    // Total calculation
    const total = Math.round(Math.max(30, subtotal + urgencyCharge + fragileCharge + signatureCharge + packagingCharge));

    return {
      baseCharge,
      distance: finalDistance.toFixed(2),
      distanceCharge: Math.round(distanceCharge),
      weightRange: weightRanges[order.packageWeight] ? `${order.packageWeight} kg` : '0-1 kg',
      weightCharge,
      urgencyLabel: order.urgency === 'express' ? 'Express (50% extra)' : 'Standard',
      urgencyCharge,
      fragileCharge,
      signatureCharge,
      packagingCharge,
      packagingType: order.requiresPackaging ? packagingOptions[order.packagingType]?.label : null,
      sameBuildingDiscount,
      subtotal: Math.max(30, subtotal),
      total
    };
  };

  // Enhanced error handling
  const handleError = (errorMsg, stage = 'error') => {
    setError(errorMsg);
    setProcessingStage(stage);
    setProgress(0);
    hasSubmitted.current = false;
  };

  // Retry mechanism
  const retryOrder = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError(null);
      setProcessingStage('validating');
      setProgress(0);
      hasSubmitted.current = false;
      setTimeout(() => {
        calculateDistanceAndSubmit();
      }, 1000);
    } else {
      alert('Maximum retry attempts reached. Please try again later.');
      navigate('/addtocart');
    }
  };

  // Enhanced order validation
  const validateOrder = () => {
    setProcessingStage('validating');
    animateProgress(stages.validating.progress);

    if (!order) {
      handleError('No order data found. Please restart the process.');
      setTimeout(() => navigate('/addtocart'), 3000);
      return false;
    }

    // ✅ FIXED: Check if pricing data is already available from AddToCart
    if (order.estimatedPrice && order.estimatedDistance && order.pricingBreakdown) {
      console.log('Using pricing from AddToCart:', order.estimatedPrice);
      setPrice(order.estimatedPrice);
      setDistanceKm(order.estimatedDistance);
      setPricingBreakdown(order.pricingBreakdown);
      return true;
    }

    const {
      userId, pickupAddress, deliveryAddress, pickupCoordinates,
      deliveryCoordinates, description, contactNumber, deliveryDate
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
      handleError("Order information is incomplete. Please re-enter.");
      setTimeout(() => navigate('/addtocart'), 3000);
      return false;
    }

    return true;
  };

  // ✅ FIXED: Updated calculation function to use AddToCart pricing if available
  const calculateDistanceAndSubmit = useCallback(async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    try {
      // Stage 1: Validation
      if (!validateOrder()) return;

      // ✅ If pricing is already calculated in AddToCart, use it directly
      if (order.estimatedPrice && order.estimatedDistance && order.pricingBreakdown) {
        console.log('✅ Using pre-calculated pricing from AddToCart');
        
        setDistanceKm(order.estimatedDistance);
        setPrice(order.estimatedPrice);
        setPricingBreakdown(order.pricingBreakdown);
        setEstimatedTime(calculateEstimatedTime(parseFloat(order.estimatedDistance)));

        // Skip to payment stage
        setTimeout(() => {
          setProcessingStage('payment');
          animateProgress(stages.payment.progress);
          
          // Create order summary
          setOrderSummary({
            distance: order.estimatedDistance,
            price: order.estimatedPrice,
            estimatedTime: calculateEstimatedTime(parseFloat(order.estimatedDistance)),
            pickupAddress: order.additionalInfoPickup ? 
              `${order.pickupAddress}, ${order.additionalInfoPickup}` : order.pickupAddress,
            deliveryAddress: order.additionalInfoDelivery ? 
              `${order.deliveryAddress}, ${order.additionalInfoDelivery}` : order.deliveryAddress,
            description: order.description,
            deliveryDate: order.deliveryDate,
            pricingBreakdown: order.pricingBreakdown
          });
          
          setShowPaymentOptions(true);
        }, 2000);
        
        return;
      }

      // Stage 2: Distance Calculation (only if not pre-calculated)
      setTimeout(() => {
        setProcessingStage('calculating');
        animateProgress(stages.calculating.progress);
      }, 1000);

      const { pickupCoordinates, deliveryCoordinates, userId, pickupAddress, 
              deliveryAddress, description, contactNumber, deliveryDate,
              additionalInfoPickup, additionalInfoDelivery } = order;

      const service = new window.google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix(
        {
          origins: [new window.google.maps.LatLng(pickupCoordinates.lat, pickupCoordinates.lng)],
          destinations: [new window.google.maps.LatLng(deliveryCoordinates.lat, deliveryCoordinates.lng)],
          travelMode: 'DRIVING'
        },
        async (response, status) => {
          if (status === 'OK') {
            const element = response.rows[0].elements[0];
            
            if (element.status === 'NOT_FOUND') {
              handleError('Unable to find route between locations. Please check addresses.');
              return;
            }

            const distanceInMeters = element.distance.value;
            const distanceInKm = distanceInMeters / 1000;
            
            // ✅ FIXED: Use enhanced pricing calculation
            const pricingDetails = calculateDetailedPrice(distanceInKm);
            const calculatedPrice = pricingDetails.total;
            
            const estimatedMinutes = calculateEstimatedTime(distanceInKm);

            setDistanceKm(distanceInKm.toFixed(2));
            setPrice(calculatedPrice);
            setPricingBreakdown(pricingDetails);
            setEstimatedTime(estimatedMinutes);

            // Stage 3: Creating order
            setTimeout(async () => {
              setProcessingStage('submitting');
              animateProgress(stages.submitting.progress);

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
                price: calculatedPrice,
                estimatedPrice: calculatedPrice,
                estimatedDistance: distanceInKm.toFixed(2),
                estimatedTime: estimatedMinutes,
                pricingBreakdown: pricingDetails,
                // Include all enhanced fields from AddToCart
                senderName: order.senderName,
                recipientName: order.recipientName,
                recipientContact: order.recipientContact,
                deliveryTime: order.deliveryTime,
                packageType: order.packageType,
                packageWeight: order.packageWeight,
                urgency: order.urgency,
                fragile: order.fragile,
                requiresSignature: order.requiresSignature,
                specialInstructions: order.specialInstructions,
                additionalInfoPickup: order.additionalInfoPickup,
                additionalInfoDelivery: order.additionalInfoDelivery,
                requiresPackaging: order.requiresPackaging,
                packagingType: order.packagingType,
                sameBuildingDelivery: order.sameBuildingDelivery,
                pickupUnit: order.pickupUnit,
                deliveryUnit: order.deliveryUnit
              };

              // Create order summary
              setOrderSummary({
                distance: distanceInKm.toFixed(2),
                price: calculatedPrice,
                estimatedTime: estimatedMinutes,
                pickupAddress: payload.pickupAddress,
                deliveryAddress: payload.deliveryAddress,
                description,
                deliveryDate,
                pricingBreakdown: pricingDetails
              });

              try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                  handleError('Authentication token not found. Please login again.');
                  setTimeout(() => navigate('/login'), 2000);
                  return;
                }

                await api.post('api/delivery/create', payload, {
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                // Stage 4: Payment options
                setTimeout(() => {
                  setProcessingStage('payment');
                  animateProgress(stages.payment.progress);
                  setShowPaymentOptions(true);
                }, 1500);

              } catch (apiError) {
                console.error("❌ API Error:", apiError);
                if (apiError.response?.status === 401) {
                  handleError('Session expired. Please login again.');
                  setTimeout(() => navigate('/login'), 2000);
                } else {
                  handleError(apiError.response?.data?.error || 'Failed to create delivery. Please try again.');
                }
              }
            }, 2000);

          } else {
            console.error('Distance matrix error:', status);
            handleError('Failed to calculate distance. Please check your addresses and try again.');
          }
        }
      );
    } catch (err) {
      console.error("❌ Error during process:", err.message);
      handleError("Unexpected error occurred. Please try again later.");
    }
  }, [order, navigate, retryCount, stages.calculating.progress, stages.validating.progress, stages.payment.progress]);

  // Handle payment confirmation
  const handlePaymentConfirm = () => {
    setProcessingStage('completed');
    animateProgress(stages.completed.progress);
    
    setTimeout(() => {
      navigate('/cart', { 
        state: { 
          message: 'Order placed successfully!',
          orderSummary 
        }
      });
    }, 2000);
  };

  useEffect(() => {
    if (window.google && window.google.maps) {
      calculateDistanceAndSubmit();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = calculateDistanceAndSubmit;
      script.onerror = () => handleError('Failed to load maps. Please check your internet connection.');
      document.body.appendChild(script);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [calculateDistanceAndSubmit]);

  // Render loading animation
  const renderLoadingAnimation = () => (
    <div className="loading-container">
      <div className="delivery-truck">
        <div className="truck-body">🚛</div>
        <div className="truck-wheels">
          <div className="wheel">⚪</div>
          <div className="wheel">⚪</div>
        </div>
      </div>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );

  // Render progress bar
  const renderProgressBar = () => (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="progress-text">{stages[processingStage]?.message}</p>
      <span className="progress-percentage">{Math.round(progress)}%</span>
    </div>
  );

  // ✅ FIXED: Enhanced order summary with pricing breakdown
  const renderOrderSummary = () => (
    <div className="order-summary">
      <h3>📋 Order Summary</h3>
      <div className="summary-item">
        <span className="label">📍 From:</span>
        <span className="value">{orderSummary.pickupAddress}</span>
      </div>
      <div className="summary-item">
        <span className="label">🎯 To:</span>
        <span className="value">{orderSummary.deliveryAddress}</span>
      </div>
      <div className="summary-item">
        <span className="label">📦 Package:</span>
        <span className="value">{orderSummary.description}</span>
      </div>
      <div className="summary-item">
        <span className="label">📏 Distance:</span>
        <span className="value">{orderSummary.distance} km</span>
      </div>
      <div className="summary-item">
        <span className="label">⏱️ Est. Time:</span>
        <span className="value">{orderSummary.estimatedTime} minutes</span>
      </div>

      {/* ✅ NEW: Show detailed pricing breakdown if available */}
      {orderSummary.pricingBreakdown && (
        <div className="pricing-breakdown">
          <h4>💰 Pricing Details</h4>
          <div className="breakdown-item">
            <span>Base Charge:</span>
            <span>₹{orderSummary.pricingBreakdown.baseCharge}</span>
          </div>
          <div className="breakdown-item">
            <span>Distance ({orderSummary.pricingBreakdown.distance} km):</span>
            <span>₹{orderSummary.pricingBreakdown.distanceCharge}</span>
          </div>
          {orderSummary.pricingBreakdown.weightCharge > 0 && (
            <div className="breakdown-item">
              <span>Weight ({orderSummary.pricingBreakdown.weightRange}):</span>
              <span>₹{orderSummary.pricingBreakdown.weightCharge}</span>
            </div>
          )}
          {orderSummary.pricingBreakdown.urgencyCharge > 0 && (
            <div className="breakdown-item">
              <span>{orderSummary.pricingBreakdown.urgencyLabel}:</span>
              <span>₹{orderSummary.pricingBreakdown.urgencyCharge}</span>
            </div>
          )}
          {orderSummary.pricingBreakdown.packagingCharge > 0 && (
            <div className="breakdown-item">
              <span>Packaging:</span>
              <span>₹{orderSummary.pricingBreakdown.packagingCharge}</span>
            </div>
          )}
          {orderSummary.pricingBreakdown.fragileCharge > 0 && (
            <div className="breakdown-item">
              <span>Fragile Handling:</span>
              <span>₹{orderSummary.pricingBreakdown.fragileCharge}</span>
            </div>
          )}
          {orderSummary.pricingBreakdown.signatureCharge > 0 && (
            <div className="breakdown-item">
              <span>Signature Required:</span>
              <span>₹{orderSummary.pricingBreakdown.signatureCharge}</span>
            </div>
          )}
          {orderSummary.pricingBreakdown.sameBuildingDiscount > 0 && (
            <div className="breakdown-item discount">
              <span>Same Building Discount:</span>
              <span>-₹{orderSummary.pricingBreakdown.sameBuildingDiscount}</span>
            </div>
          )}
        </div>
      )}

      <div className="summary-item total">
        <span className="label">💰 Total:</span>
        <span className="value">₹{orderSummary.price}</span>
      </div>
    </div>
  );

  // Render payment options
  const renderPaymentOptions = () => (
    <div className="payment-options">
      <h3>💳 Choose Payment Method</h3>
      <div className="payment-methods">
        <label className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="cash"
            checked={paymentMethod === 'cash'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <div className="option-content">
            <span className="option-icon">💵</span>
            <div>
              <h4>Cash on Pickup</h4>
              <p>Pay when agent arrives for pickup</p>
            </div>
          </div>
        </label>

        <label className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="online"
            checked={paymentMethod === 'online'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <div className="option-content">
            <span className="option-icon">💳</span>
            <div>
              <h4>Pay Online</h4>
              <p>Secure online payment</p>
            </div>
          </div>
        </label>

        <label className={`payment-option ${paymentMethod === 'wallet' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="wallet"
            checked={paymentMethod === 'wallet'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <div className="option-content">
            <span className="option-icon">📱</span>
            <div>
              <h4>Digital Wallet</h4>
              <p>UPI, Paytm, PhonePe</p>
            </div>
          </div>
        </label>
      </div>

      <button 
        className="confirm-payment-btn"
        onClick={handlePaymentConfirm}
      >
        Confirm Order - ₹{price}
      </button>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="error-container">
      <div className="error-icon">❌</div>
      <h3>Oops! Something went wrong</h3>
      <p>{error}</p>
      <div className="error-actions">
        <button className="retry-btn" onClick={retryOrder}>
          🔄 Retry ({3 - retryCount} attempts left)
        </button>
        <button className="back-btn" onClick={() => navigate('/addtocart')}>
          ← Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="payments-container">
      <div className="payments-card">
        <div className="card-header">
          <h2>🚚 Processing Your Delivery</h2>
          <div className="status-badge">{processingStage.toUpperCase()}</div>
        </div>

        <div className="card-body">
          {processingStage === 'error' ? (
            renderError()
          ) : processingStage === 'completed' ? (
            <div className="success-container">
              <div className="success-animation">✅</div>
              <h3>Order Placed Successfully!</h3>
              <p>Redirecting to your orders...</p>
            </div>
          ) : (
            <>
              {renderLoadingAnimation()}
              {renderProgressBar()}
              
              {orderSummary && processingStage !== 'completed' && (
                <div className="order-details">
                  {renderOrderSummary()}
                  {showPaymentOptions && renderPaymentOptions()}
                </div>
              )}
              
              {distanceKm && price && estimatedTime && (
                <div className="calculation-display">
                  <p>📏 Distance: {distanceKm} km</p>
                  <p>💰 Price: ₹{price}</p>
                  <p>⏱️ Estimated Time: {estimatedTime} minutes</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card-footer">
          <p className="help-text">
            Need help? <span className="help-link">Contact Support</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Payments;
