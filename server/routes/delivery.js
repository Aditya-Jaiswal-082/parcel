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

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid or missing userId");
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    // ✅ Create delivery first
    const newDelivery = new Delivery({
      userId,
      pickupAddress,
      deliveryAddress,
      description,
      contactNumber,
      deliveryDate
    });

    await newDelivery.save();

    // ✅ Find agents and admins
    const recipients = await User.find({ role: { $in: ['admin', 'agent'] } });

    // ✅ Notify via Email and In-app
    const subject = '📦 New Delivery Created';
    const message = `A new delivery has been created:\nFrom: ${pickupAddress}\nTo: ${deliveryAddress}\nDescription: ${description}`;

    for (const user of recipients) {
      // 📧 Send email
      await sendEmail(user.email, subject, message);

      // 🔔 Save in-app notification
      const notification = new Notification({
        userId: user._id,
        message: `New delivery from ${pickupAddress} to ${deliveryAddress}`
      });
      await notification.save();
    }

    console.log(`✅ Notifications sent to ${recipients.length} users`);
    res.status(200).json({ message: 'Delivery created and notifications sent' });

  } catch (err) {
    console.error("🔥 Error creating delivery:", err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
