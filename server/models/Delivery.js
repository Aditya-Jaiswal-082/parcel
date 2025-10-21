// models/Delivery.js
const mongoose = require('mongoose');

// Schema for status updates
const StatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'pending',       // New orders
      'created',
      'assigned',
      'picked_up',     // Changed from 'onpickup'
      'in_transit',    // Changed from 'in progress'
      'delivered',
      'cancelled'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
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

// Main Delivery schema
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
  estimatedPrice: Number,
  estimatedDistance: Number,

  // Tracking
  trackingId: {
    type: String,
    required: true,
    unique: true // ✅ This already creates an index — no need to add it below
  },

  // Status
  status: {
    type: String,
    enum: [
      'pending',
      'created',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  },

  statusUpdates: [StatusUpdateSchema],

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Enhanced fields
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
  assignedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to auto-update updatedAt before saving
DeliverySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ✅ Useful indexes (trackingId removed to avoid duplicate)
DeliverySchema.index({ userId: 1 });
DeliverySchema.index({ assignedAgent: 1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', DeliverySchema);
