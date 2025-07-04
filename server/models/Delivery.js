const mongoose = require('mongoose');

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
  status: {
    type: String,
    enum: ['pending', 'assigned', 'completed'], // ✅ fixed capitalization from "Enum" to "enum"
    default: 'pending'
  },
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
