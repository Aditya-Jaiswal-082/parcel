// models/Delivery.js - Enhanced version
const mongoose = require('mongoose');

const StatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'pending',        // Added for new orders
      'created',
      'assigned',
      'picked_up',      // Changed from 'onpickup' to match routes
      'in_transit',     // Changed from 'in progress' to match routes
      'delivered',
      'cancelled'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {       // Added to track who updated the status
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'admin'],
    default: null
  },
  reason: {
    type: String,
    default: null
  }
});

const DeliverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Address fields
  pickupAddress: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  pickupLocation: {
    lat: Number,
    lng: Number
  },
  deliveryLocation: {
    lat: Number,
    lng: Number
  },
  
  // Basic delivery info
  description: { type: String, required: true },
  contactNumber: { type: String, required: true },
  deliveryDate: Date,
  
  // Pricing fields
  price: Number,
  estimatedPrice: Number,    // Added for enhanced pricing
  estimatedDistance: Number, // Added for distance tracking
  
  // Tracking
  trackingId: {
    type: String,
    required: true,
    unique: true
  },

  // Status with updated enum values
  status: {
    type: String,
    enum: [
      'pending',        // For newly created orders
      'created',        // Keep for backward compatibility
      'assigned',
      'picked_up',      // Changed from 'onpickup'
      'in_transit',     // Changed from 'in progress'
      'delivered',
      'cancelled'
    ],
    default: 'pending'  // Changed default to 'pending'
  },

  statusUpdates: [StatusUpdateSchema],

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Enhanced fields from AddToCart
  senderName: String,
  recipientName: String,
  recipientContact: String,
  deliveryTime: {
    type: String,
    enum: ['anytime', 'morning', 'afternoon', 'evening'],
    default: 'anytime'
  },
  packageType: {
    type: String,
    enum: ['document', 'electronics', 'clothing', 'food', 'gifts', 'other'],
    default: 'other'
  },
  packageWeight: {
    type: String,
    enum: ['0-1', '1-3', '3-5', '5-10', '10+'],
    default: '0-1'
  },
  urgency: {
    type: String,
    enum: ['standard', 'express'],
    default: 'standard'
  },
  fragile: {
    type: Boolean,
    default: false
  },
  requiresSignature: {
    type: Boolean,
    default: false
  },
  specialInstructions: String,
  additionalInfoPickup: String,
  additionalInfoDelivery: String,

  // Packaging options
  requiresPackaging: {
    type: Boolean,
    default: false
  },
  packagingType: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra-large'],
    default: 'small'
  },

  // Same building delivery
  sameBuildingDelivery: {
    type: Boolean,
    default: false
  },
  pickupUnit: String,
  deliveryUnit: String,

  // Pricing breakdown
  pricingBreakdown: {
    baseCharge: Number,
    distanceCharge: Number,
    weightCharge: Number,
    urgencyCharge: Number,
    fragileCharge: Number,
    signatureCharge: Number,
    packagingCharge: Number,
    sameBuildingDiscount: Number,
    total: Number
  },

  // Timestamps
  assignedAt: Date,        // When agent was assigned
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {            // Added for tracking updates
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
DeliverySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better performance
DeliverySchema.index({ userId: 1 });
DeliverySchema.index({ assignedAgent: 1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ trackingId: 1 });
DeliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', DeliverySchema);
