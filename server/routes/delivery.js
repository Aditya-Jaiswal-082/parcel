const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const Delivery = require('../models/Delivery');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

const generateTrackingId = () => {
  const prefix = 'TRK';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-5);
  return `${prefix}-${random}-${timestamp}`;
};

// ✅ PUBLIC ROUTES (no authentication required)

// Track a delivery by its tracking ID
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

// ✅ AUTHENTICATED ROUTES
router.use(authenticate); // Apply authentication to all routes below

// Create new delivery (users only)
router.post('/create', authorizeRoles('user'), async (req, res) => {
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

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }
    if (pickupAddress.length < 10 || deliveryAddress.length < 10) {
      return res.status(400).json({ error: 'Address too short. Please enter a valid full address.' });
    }
    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: 'Pickup and delivery addresses are required' });
    }
    if (!pickupCoordinates || !deliveryCoordinates) {
      return res.status(400).json({ error: 'Coordinates for both locations are required' });
    }

    const trackingId = generateTrackingId();

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
      status: 'created',
      statusUpdates: [
        {
          status: 'created',
          timestamp: new Date()
        }
      ]
    });

    await newDelivery.save();

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

// Get all deliveries (admin only)
router.get('/all', authorizeRoles('admin'), async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching all deliveries:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all unassigned deliveries (admin and agents)
router.get('/unassigned', authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const deliveries = await Delivery.find({ assignedAgent: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching unassigned deliveries:', err.message);
    res.status(500).json({ error: 'Failed to fetch unassigned deliveries' });
  }
});

// Get pending deliveries (admin and agents)
router.get('/pending', authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const pendingDeliveries = await Delivery.find({ status: 'pending' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(pendingDeliveries);
  } catch (err) {
    console.error('❌ Error fetching pending deliveries:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's deliveries
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Users can only access their own deliveries, admins can access any
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid user ID required' });
  }

  try {
    const deliveries = await Delivery.find({ userId })
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching user deliveries:', err.message);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Get agent's assigned deliveries
router.get('/assigned/:agentId', authorizeRoles('admin', 'agent'), async (req, res) => {
  const { agentId } = req.params;
  
  // Agents can only see their own assignments, admins can see any
  if (req.user.role === 'agent' && req.user._id.toString() !== agentId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    return res.status(400).json({ error: 'Invalid agent ID' });
  }

  try {
    const deliveries = await Delivery.find({ assignedAgent: agentId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching agent deliveries:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign delivery to agent (admin only)
router.post('/assign/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    const delivery = await Delivery.findById(req.params.id).populate('userId', 'name email');
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    if (delivery.assignedAgent) {
      return res.status(400).json({ error: 'Delivery already assigned' });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Assign delivery
    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    delivery.statusUpdates.push({ status: 'assigned', timestamp: new Date() });
    await delivery.save();

    // Notify agent (in-app)
    const notification = new Notification({
      userId: agentId,
      message: `📦 You have been assigned a new delivery: ${delivery.pickupAddress} → ${delivery.deliveryAddress}`
    });
    await notification.save();

    // Notify user (email)
    const subject = '📦 Delivery Assigned';
    const message = `Hello ${delivery.userId.name},\n\nYour delivery (Tracking ID: ${delivery.trackingId}) has been assigned to our agent **${agent.name}**.\nThey will be reaching you soon to pick up the parcel.\n\nThanks for choosing our service!\n\n- Team`;

    try {
      await sendEmail(delivery.userId.email, subject, message);
    } catch (emailErr) {
      console.error(`❌ Failed to send email to user:`, emailErr.message);
    }

    res.status(200).json({ message: '✅ Delivery assigned and user notified' });

  } catch (err) {
    console.error('❌ Error in assigning delivery:', err.message);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// Agent claims delivery
router.patch('/claim/:id', authorizeRoles('agent'), async (req, res) => {
  try {
    const agentId = req.user._id; // Get from authenticated user

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.assignedAgent) return res.status(400).json({ error: 'Delivery already assigned' });

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    delivery.statusUpdates.push({ status: 'assigned', timestamp: new Date() });
    await delivery.save();

    const notification = new Notification({
      userId: agentId,
      message: `📦 You claimed a delivery from ${delivery.pickupAddress} to ${delivery.deliveryAddress}`
    });

    await notification.save();

    res.status(200).json({ message: '✅ Delivery successfully claimed' });
  } catch (err) {
    console.error('❌ Error in claiming delivery:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update delivery status (agents and admin)
router.patch('/update-status/:id', authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const { newStatus } = req.body;
    const delivery = await Delivery.findById(req.params.id).populate('userId', 'name email');

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    // Agents can only update deliveries assigned to them
    if (req.user.role === 'agent' && delivery.assignedAgent?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update your assigned deliveries' });
    }

    const validStatuses = ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    delivery.status = newStatus;
    delivery.statusUpdates.push({ status: newStatus, timestamp: new Date() });
    await delivery.save();

    const subject = `📦 Delivery Status Update: ${newStatus}`;
    const message = `Hello ${delivery.userId.name},\n\nYour delivery (Tracking ID: ${delivery.trackingId}) status has been updated to: ${newStatus.replace('_', ' ').toUpperCase()}.\n\nYou can track your delivery for more information.`;

    try {
      await sendEmail(delivery.userId.email, subject, message);
    } catch (emailErr) {
      console.error(`❌ Failed to send status update email:`, emailErr.message);
    }

    res.status(200).json({ message: `✅ Status updated to ${newStatus}` });
  } catch (err) {
    console.error('❌ Error updating status:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Complete delivery (agents and admin)
router.patch('/complete/:id', authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('userId', 'name email');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    // Agents can only complete deliveries assigned to them
    if (req.user.role === 'agent' && delivery.assignedAgent?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only complete your assigned deliveries' });
    }

    delivery.status = 'delivered';
    delivery.statusUpdates.push({ status: 'delivered', timestamp: new Date() });
    await delivery.save();

    // Notify user
    const subject = '📦 Delivery Completed';
    const message = `Hello ${delivery.userId.name},\n\nYour delivery (Tracking ID: ${delivery.trackingId}) has been successfully delivered!\n\nThank you for choosing our service.`;

    try {
      await sendEmail(delivery.userId.email, subject, message);
    } catch (emailErr) {
      console.error(`❌ Failed to send completion email:`, emailErr.message);
    }

    res.status(200).json({ message: '✅ Delivery marked as delivered' });
  } catch (err) {
    console.error('❌ Error completing delivery:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel delivery (admin and users)
router.patch('/cancel/:id', async (req, res) => {
  try {
    const { cancelledBy } = req.body;

    if (!cancelledBy || !['user', 'admin'].includes(cancelledBy)) {
      return res.status(400).json({ error: 'Invalid cancelledBy value (should be user or admin)' });
    }

    const delivery = await Delivery.findById(req.params.id).populate('userId', 'email');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    // Users can only cancel their own deliveries
    if (req.user.role === 'user' && delivery.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only cancel your own deliveries' });
    }

    if (delivery.status === 'cancelled' || delivery.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel a delivered or already cancelled order' });
    }

    delivery.status = 'cancelled';
    delivery.statusUpdates.push({ status: 'cancelled', timestamp: new Date(), cancelledBy });
    await delivery.save();

    if (delivery.assignedAgent) {
      const notifyAgent = new Notification({
        userId: delivery.assignedAgent,
        message: `⚠️ Delivery has been cancelled: ${delivery.pickupAddress} → ${delivery.deliveryAddress}`
      });
      await notifyAgent.save();
    }

    if (delivery.userId?.email) {
      const subject = '⚠️ Delivery Cancelled';
      const message = `Your delivery (Tracking ID: ${delivery.trackingId}) was cancelled by the ${cancelledBy}.\n\nIf you have questions, please reach out to our support team.`;
      await sendEmail(delivery.userId.email, subject, message);
    }

    res.status(200).json({ message: `✅ Delivery cancelled by ${cancelledBy}` });
  } catch (err) {
    console.error('❌ Error cancelling delivery:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete delivery (admin only)
router.delete('/admin-delete/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('userId', 'email');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const trackingId = delivery.trackingId || '[No Tracking ID]';
    const email = delivery.userId?.email;

    await Delivery.deleteOne({ _id: req.params.id });

    if (email) {
      const subject = '❌ Delivery Cancelled by Admin';
      const message = `Your delivery (${trackingId}) has been cancelled by the admin.\n\nIf you believe this was a mistake or need help, please contact support.`;
      await sendEmail(email, subject, message);
    }

    res.status(200).json({ message: '✅ Delivery deleted and user notified' });
  } catch (err) {
    console.error('❌ Error deleting delivery by admin:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
