const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Delivery = require('../models/Delivery');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// ✅ POST /api/delivery/create
router.post('/create', async (req, res) => {
  try {
    const {
      userId,
      pickupAddress,
      deliveryAddress,
      description,
      contactNumber,
      deliveryDate,
      pickupCoordinates,
      deliveryCoordinates,
      price
    } = req.body;

    // Validate input
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }
    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: 'Pickup and delivery addresses are required' });
    }
    if (!pickupCoordinates || !deliveryCoordinates) {
      return res.status(400).json({ error: 'Coordinates for both locations are required' });
    }

    // Generate a unique tracking ID
    const trackingId = 'TRK' + Date.now();

    // Create delivery document
    const newDelivery = new Delivery({
      userId,
      pickupAddress,
      deliveryAddress,
      pickupLocation: pickupCoordinates,
      deliveryLocation: deliveryCoordinates,
      description,
      contactNumber,
      deliveryDate,
      price,
      trackingId,
      status: 'pending',
      statusUpdates: [
        {
          status: 'pending',
          timestamp: new Date()
        }
      ]
    });

    await newDelivery.save();

    // Notify all agents and admins
    const usersToNotify = await User.find({ role: { $in: ['admin', 'agent'] } });

    const subject = '📦 New Delivery Created';
    const message = `A new delivery has been created:\nFrom: ${pickupAddress}\nTo: ${deliveryAddress}\nDescription: ${description}`;

    for (const user of usersToNotify) {
      try {
        await sendEmail(user.email, subject, message);
      } catch (emailErr) {
        console.error(`❌ Email error to ${user.email}:`, emailErr.message);
      }

      const notification = new Notification({
        userId: user._id,
        message: `New delivery from ${pickupAddress} to ${deliveryAddress}`
      });

      await notification.save();
    }

    res.status(201).json({ message: '✅ Delivery created successfully', trackingId });
  } catch (err) {
    console.error('❌ Error in /create:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET delivery by tracking ID
router.get('/track/:trackingId', async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ trackingId: req.params.trackingId })
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email');

    if (!delivery) return res.status(404).json({ error: 'Tracking ID not found' });

    res.status(200).json(delivery);
  } catch (err) {
    console.error('Error in tracking:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET unassigned deliveries
router.get('/unassigned', async (req, res) => {
  try {
    const deliveries = await Delivery.find({ assignedAgent: null }).populate('userId', 'name email');
    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unassigned deliveries' });
  }
});

// ✅ PATCH assign delivery to agent
router.patch('/assign/:id', async (req, res) => {
  try {
    const { agentId } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.assignedAgent) return res.status(400).json({ error: 'Delivery already assigned' });

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    delivery.statusUpdates.push({ status: 'assigned', timestamp: new Date() });
    await delivery.save();

    const agent = await User.findById(agentId);
    const notification = new Notification({
      userId: agentId,
      message: `You have been assigned a new delivery from ${delivery.pickupAddress} to ${delivery.deliveryAddress}`
    });

    await notification.save();

    res.status(200).json({ message: 'Delivery assigned to agent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// ✅ GET pending deliveries
router.get('/pending', async (req, res) => {
  try {
    const pendingDeliveries = await Delivery.find({ status: 'pending' });
    res.status(200).json(pendingDeliveries);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET deliveries by user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid user ID required' });
  }

  try {
    const deliveries = await Delivery.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// ✅ GET all deliveries
router.get('/all', async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email');
    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET deliveries assigned to a specific agent
router.get('/assigned/:agentId', async (req, res) => {
  const { agentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    return res.status(400).json({ error: 'Invalid agent ID' });
  }

  try {
    const deliveries = await Delivery.find({ assignedAgent: agentId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ PATCH mark delivery as completed
router.patch('/complete/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (delivery.status !== 'assigned') {
      return res.status(400).json({ error: 'Only assigned deliveries can be completed' });
    }

    delivery.status = 'completed';
    delivery.statusUpdates.push({ status: 'completed', timestamp: new Date() });
    await delivery.save();

    res.status(200).json({ message: 'Delivery marked as completed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ PATCH allow agents to claim delivery
router.patch('/claim/:id', async (req, res) => {
  try {
    const { agentId } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.assignedAgent) return res.status(400).json({ error: 'Delivery already assigned' });

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    delivery.statusUpdates.push({ status: 'assigned', timestamp: new Date() });
    await delivery.save();

    res.status(200).json({ message: 'Delivery successfully claimed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
