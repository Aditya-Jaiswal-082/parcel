// File: server/routes/delivery.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Delivery = require('../models/Delivery');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

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

    const agentsAndAdmins = await User.find({ role: { $in: ['admin', 'agent'] } });
    const subject = '📦 New Delivery Created';
    const message = `A new delivery has been created:\nFrom: ${pickupAddress}\nTo: ${deliveryAddress}\nDescription: ${description}`;

    for (const user of agentsAndAdmins) {
      try {
        await sendEmail(user.email, subject, message);
      } catch (emailErr) {
        console.error(`❌ Error sending email to ${user.email}:`, emailErr.message);
      }

      const notification = new Notification({
        userId: user._id,
        message: `New delivery from ${pickupAddress} to ${deliveryAddress}`
      });

      await notification.save();
    }

    console.log(`✅ Notifications sent to ${agentsAndAdmins.length} users`);

    res.status(200).json({ message: 'Delivery created successfully' });
  } catch (err) {
    console.error("🔥 Error creating delivery:", err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/delivery/user/:userId
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid user ID required' });
  }

  try {
    const deliveries = await Delivery.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    console.error("❌ Error fetching deliveries:", err.message);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// GET /api/delivery/all
router.get('/all', async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email');
    res.status(200).json(deliveries);
  } catch (err) {
    console.error("❌ Error fetching deliveries:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/delivery/unassigned
router.get('/unassigned', async (req, res) => {
  try {
    const deliveries = await Delivery.find({ assignedAgent: null })
      .populate('userId', 'name email');
    res.status(200).json(deliveries);
  } catch (err) {
    console.error("❌ Error fetching unassigned deliveries:", err.message);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// PATCH /api/delivery/claim/:id
router.patch('/claim/:id', async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const agentId = req.body.agentId;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (delivery.assignedAgent)
      return res.status(400).json({ error: 'Delivery already assigned' });

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    await delivery.save();

    res.status(200).json({ message: 'Delivery successfully claimed' });
  } catch (err) {
    console.error("❌ Claim error:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
