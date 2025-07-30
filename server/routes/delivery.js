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

// ✅ FIXED: Get agent statistics with proper ObjectId handling
router.get('/agent/stats/:agentId', authorizeRoles('agent', 'admin'), async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Verify the agent is requesting their own stats (unless admin)
    if (req.user.role === 'agent' && req.user._id.toString() !== agentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }
    
    // Get current date for today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get total available deliveries (unassigned)
    const totalAvailable = await Delivery.countDocuments({ 
      $or: [
        { assignedAgent: null },
        { assignedAgent: { $exists: false } }
      ],
      status: { $in: ['pending', 'created'] }
    });

    // Get total assigned deliveries for this agent
    const totalAssigned = await Delivery.countDocuments({ 
      assignedAgent: agentId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    });

    // Get completed deliveries today
    const completedToday = await Delivery.countDocuments({
      assignedAgent: agentId,
      status: 'delivered',
      updatedAt: { $gte: today, $lt: tomorrow }
    });

    // ✅ FIXED: Calculate today's earnings with proper ObjectId conversion
    let todaysEarnings = 0;
    
    try {
      const earningsResult = await Delivery.aggregate([
        {
          $match: {
            assignedAgent: new mongoose.Types.ObjectId(agentId), // Fixed ObjectId conversion
            status: 'delivered',
            updatedAt: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { 
              $sum: { 
                $toDouble: { 
                  $ifNull: [
                    { $ifNull: ['$estimatedPrice', '$price'] }, 
                    0
                  ] 
                } 
              } 
            }
          }
        }
      ]);

      todaysEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;
    } catch (aggregationError) {
      console.error('Aggregation error, using fallback calculation:', aggregationError);
      
      // Fallback: Simple calculation without aggregation
      const deliveredToday = await Delivery.find({
        assignedAgent: agentId,
        status: 'delivered',
        updatedAt: { $gte: today, $lt: tomorrow }
      }).select('estimatedPrice price');
      
      todaysEarnings = deliveredToday.reduce((total, delivery) => {
        const price = delivery.estimatedPrice || delivery.price || 0;
        return total + parseFloat(price);
      }, 0);
    }

    console.log('Agent stats calculated:', {
      totalAvailable,
      totalAssigned,
      completedToday,
      earnings: Math.round(todaysEarnings)
    });

    res.status(200).json({
      totalAvailable,
      totalAssigned,
      completedToday,
      earnings: Math.round(todaysEarnings)
    });

  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agent statistics',
      details: error.message 
    });
  }
});

// Create new delivery (users and admin only)
router.post('/create', authorizeRoles('user', 'admin'), async (req, res) => {
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
      price,
      estimatedPrice,
      estimatedDistance,
      // Enhanced fields from AddToCart
      senderName,
      recipientName,
      recipientContact,
      deliveryTime,
      packageType,
      packageWeight,
      urgency,
      fragile,
      requiresSignature,
      specialInstructions,
      additionalInfoPickup,
      additionalInfoDelivery,
      requiresPackaging,
      packagingType,
      sameBuildingDelivery,
      pickupUnit,
      deliveryUnit,
      pricingBreakdown
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
    const finalPrice = estimatedPrice || price || 0;

    const newDelivery = new Delivery({
      userId,
      pickupAddress,
      deliveryAddress,
      pickupLocation: pickupCoordinates,
      deliveryLocation: deliveryCoordinates,
      description,
      contactNumber,
      deliveryDate,
      price: finalPrice,
      estimatedPrice: finalPrice,
      estimatedDistance,
      trackingId,
      status: 'pending',
      
      // Enhanced fields
      senderName,
      recipientName,
      recipientContact,
      deliveryTime,
      packageType,
      packageWeight,
      urgency,
      fragile,
      requiresSignature,
      specialInstructions,
      additionalInfoPickup,
      additionalInfoDelivery,
      requiresPackaging,
      packagingType,
      sameBuildingDelivery,
      pickupUnit,
      deliveryUnit,
      pricingBreakdown,
      
      statusUpdates: [
        {
          status: 'pending',
          timestamp: new Date()
        }
      ]
    });

    await newDelivery.save();

    // Notify admins and agents
    const usersToNotify = await User.find({ role: { $in: ['admin', 'agent'] } });

    const subject = '📦 New Delivery Created';
    const message = `A new delivery has been created:\n\nFrom: ${pickupAddress}\nTo: ${deliveryAddress}\nDescription: ${description}\nPackage Type: ${packageType}\nUrgency: ${urgency}\nEstimated Price: ₹${finalPrice}\n\nTracking ID: ${trackingId}`;

    for (const user of usersToNotify) {
      try {
        await sendEmail(user.email, subject, message);
      } catch (emailErr) {
        console.error(`❌ Email error to ${user.email}:`, emailErr.message);
      }

      try {
        const notification = new Notification({
          userId: user._id,
          message: `📦 New delivery created: ${pickupAddress} → ${deliveryAddress} (${trackingId})`,
          type: 'delivery',
          deliveryId: newDelivery._id
        });
        await notification.save();
      } catch (notificationErr) {
        console.error('Failed to create notification:', notificationErr);
      }
    }

    // Notify user about successful creation
    try {
      const userNotification = new Notification({
        userId,
        message: `✅ Your delivery has been created successfully. Tracking ID: ${trackingId}`,
        type: 'order_confirmation',
        deliveryId: newDelivery._id
      });
      await userNotification.save();
    } catch (notificationErr) {
      console.error('Failed to create user notification:', notificationErr);
    }

    res.status(201).json({ 
      message: '✅ Delivery created successfully', 
      trackingId,
      deliveryId: newDelivery._id,
      estimatedPrice: finalPrice
    });
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
    const deliveries = await Delivery.find({ 
      $or: [
        { assignedAgent: null },
        { assignedAgent: { $exists: false } }
      ],
      status: { $in: ['pending', 'created'] }
    })
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
    const pendingDeliveries = await Delivery.find({ status: { $in: ['pending', 'created'] } })
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
    delivery.assignedAt = new Date();
    delivery.statusUpdates.push({ 
      status: 'assigned', 
      timestamp: new Date(),
      updatedBy: req.user._id 
    });
    await delivery.save();

    // Notify agent (in-app)
    try {
      const notification = new Notification({
        userId: agentId,
        message: `📦 You have been assigned a new delivery: ${delivery.pickupAddress} → ${delivery.deliveryAddress}`,
        type: 'assignment',
        deliveryId: delivery._id
      });
      await notification.save();
    } catch (notificationErr) {
      console.error('Failed to create agent notification:', notificationErr);
    }

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

// ✅ FIXED: Agent claims delivery with better error handling
router.patch('/claim/:id', authorizeRoles('agent'), async (req, res) => {
  try {
    const { agentId } = req.body;
    const requestingAgentId = req.user._id.toString();

    // Verify the agent is claiming for themselves
    if (agentId && agentId !== requestingAgentId) {
      return res.status(403).json({ error: 'You can only claim deliveries for yourself' });
    }

    const delivery = await Delivery.findById(req.params.id).populate('userId', 'name email');
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (delivery.assignedAgent) {
      return res.status(409).json({ error: 'Delivery already claimed by another agent' });
    }

    if (!['pending', 'created'].includes(delivery.status)) {
      return res.status(400).json({ error: 'Delivery is not available for claiming' });
    }

    // Claim the delivery
    delivery.assignedAgent = requestingAgentId;
    delivery.status = 'assigned';
    delivery.assignedAt = new Date();
    delivery.statusUpdates.push({ 
      status: 'assigned', 
      timestamp: new Date(),
      updatedBy: requestingAgentId
    });
    await delivery.save();

    // Create notifications with error handling
    try {
      const agentNotification = new Notification({
        userId: requestingAgentId,
        message: `✅ You successfully claimed delivery: ${delivery.pickupAddress} → ${delivery.deliveryAddress}`,
        type: 'assignment',
        deliveryId: delivery._id
      });
      await agentNotification.save();

      // Notify user about assignment
      const userNotification = new Notification({
        userId: delivery.userId._id,
        message: `📦 Your delivery has been assigned to an agent and will be picked up soon.`,
        type: 'assignment',
        deliveryId: delivery._id
      });
      await userNotification.save();
    } catch (notificationErr) {
      console.error('Failed to create notifications:', notificationErr);
      // Don't fail the main request if notifications fail
    }

    res.status(200).json({ 
      message: '✅ Delivery successfully claimed',
      delivery: {
        _id: delivery._id,
        trackingId: delivery.trackingId,
        status: delivery.status,
        assignedAgent: requestingAgentId
      }
    });
  } catch (err) {
    console.error('❌ Error in claiming delivery:', err.message);
    res.status(500).json({ error: 'Failed to claim delivery' });
  }
});

// ✅ FIXED: Update delivery status with enhanced error handling
router.patch('/update-status/:deliveryId', authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { newStatus, agentId, timestamp } = req.body;

    console.log('📝 Update status request:', deliveryId, newStatus);

    // Validate required fields
    if (!newStatus) {
      return res.status(400).json({ error: 'New status is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return res.status(400).json({ error: 'Invalid delivery ID' });
    }

    // Find the delivery
    const delivery = await Delivery.findById(deliveryId).populate('userId', 'name email');
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    console.log('📦 Found delivery:', delivery._id, 'Current status:', delivery.status);

    // Validate agent authorization
    if (req.user.role === 'agent') {
      if (!delivery.assignedAgent || delivery.assignedAgent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You can only update deliveries assigned to you' });
      }
    }

    // Validate status transition
    const validStatuses = ['pending', 'created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update the delivery
    delivery.status = newStatus;
    delivery.updatedAt = timestamp || new Date();
    
    // Add to status history
    delivery.statusUpdates.push({
      status: newStatus,
      timestamp: timestamp || new Date(),
      updatedBy: req.user._id
    });

    await delivery.save();
    
    console.log('✅ Status updated successfully to:', newStatus);

    // Create notifications with error handling
    try {
      const userNotification = new Notification({
        userId: delivery.userId._id,
        message: `📊 Your delivery status has been updated to: ${newStatus.replace('_', ' ')}`,
        type: 'status_update',
        deliveryId: delivery._id
      });
      await userNotification.save();

      // Send email notification
      const subject = `📦 Delivery Status Update: ${newStatus.replace('_', ' ').toUpperCase()}`;
      const emailMessage = `Hello ${delivery.userId.name},\n\nYour delivery (Tracking ID: ${delivery.trackingId}) status has been updated to: ${newStatus.replace('_', ' ').toUpperCase()}.\n\nYou can track your delivery for more information.`;

      await sendEmail(delivery.userId.email, subject, emailMessage);
    } catch (notificationErr) {
      console.error('Failed to send notification/email:', notificationErr);
      // Don't fail the main request if notification fails
    }

    res.status(200).json({ 
      message: `✅ Status updated to ${newStatus}`,
      delivery: {
        _id: delivery._id,
        status: delivery.status,
        updatedAt: delivery.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating delivery status:', error);
    res.status(500).json({ 
      error: 'Failed to update delivery status',
      details: error.message 
    });
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
    delivery.statusUpdates.push({ 
      status: 'delivered', 
      timestamp: new Date(),
      updatedBy: req.user._id 
    });
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
    delivery.statusUpdates.push({ 
      status: 'cancelled', 
      timestamp: new Date(), 
      cancelledBy,
      updatedBy: req.user._id 
    });
    await delivery.save();

    // Notify agent with error handling
    if (delivery.assignedAgent) {
      try {
        const notifyAgent = new Notification({
          userId: delivery.assignedAgent,
          message: `⚠️ Delivery has been cancelled: ${delivery.pickupAddress} → ${delivery.deliveryAddress}`,
          type: 'cancellation',
          deliveryId: delivery._id
        });
        await notifyAgent.save();
      } catch (notificationErr) {
        console.error('Failed to notify agent about cancellation:', notificationErr);
      }
    }

    if (delivery.userId?.email) {
      const subject = '⚠️ Delivery Cancelled';
      const message = `Your delivery (Tracking ID: ${delivery.trackingId}) was cancelled by the ${cancelledBy}.\n\nIf you have questions, please reach out to our support team.`;
      
      try {
        await sendEmail(delivery.userId.email, subject, message);
      } catch (emailErr) {
        console.error('Failed to send cancellation email:', emailErr);
      }
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
      
      try {
        await sendEmail(email, subject, message);
      } catch (emailErr) {
        console.error('Failed to send deletion email:', emailErr);
      }
    }

    res.status(200).json({ message: '✅ Delivery deleted and user notified' });
  } catch (err) {
    console.error('❌ Error deleting delivery by admin:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
