const mongoose = require('mongoose');

const StatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'created',
      'assigned',
      'onpickup',
      'payment done',
      'in progress',
      'delivered',
      'cancelled' // ✅ Allow cancellation status
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
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
  pickupAddress: String,
  deliveryAddress: String,
  pickupLocation: {
    lat: Number,
    lng: Number
  },
  deliveryLocation: {
    lat: Number,
    lng: Number
  },
  description: String,
  contactNumber: String,
  deliveryDate: Date,
  price: Number,

  trackingId: {
    type: String,
    required: true,
    unique: true
  },

  status: {
    type: String,
    enum: [
      'created',
      'assigned',
      'onpickup',
      'payment done',
      'in progress',
      'delivered',
      'cancelled' // ✅ Add cancelled as a valid status
    ],
    default: 'created'
  },

  statusUpdates: [StatusUpdateSchema],

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
