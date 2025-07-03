const mongoose = require('mongoose'); // ✅ Add this line

const DeliverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickupAddress: String,
  deliveryAddress: String,
  description: String,
  contactNumber: String,
  deliveryDate: Date,
  status: {
    type: String,
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
