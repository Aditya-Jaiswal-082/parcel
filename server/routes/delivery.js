// File: server/routes/delivery.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Delivery = require('../models/Delivery');
const User = require('../models/User');

// POST /api/delivery/create
router.post('/create', async (req, res) => {
  try {
    console.log("📦 Incoming data:", req.body);

    const {
      userId,
      pickupAddress,
      deliveryAddress,
      description,
      contactNumber,
      deliveryDate
    } = req.body;

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid or missing userId");
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const newDelivery = new Delivery({
      userId,
      pickupAddress,
      deliveryAddress,
      description,
      contactNumber,
      deliveryDate
    });

    await newDelivery.save();

    // Notify agents and admin (console log)
    const agents = await User.find({ role: { $in: ['admin', 'agent'] } });
    agents.forEach(u => {
      console.log(`🔔 Notify ${u.role} (${u.email}) about new delivery`);
    });

    res.status(200).json({ message: 'Delivery created successfully' });
  } catch (err) {
    console.error("🔥 Error creating delivery:", err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
