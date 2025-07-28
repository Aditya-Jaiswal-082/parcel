// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// 📦 Generate a unique tracking ID
const generateTrackingId = () => {
  const prefix = 'TRK';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-5);
  return `${prefix}-${random}-${timestamp}`;
};

// ✅ Protect ALL admin routes with authentication and admin-only access
router.use(authenticate);
router.use(authorizeRoles('admin'));

// 📊 Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalAgents = await User.countDocuments({ role: 'agent' });
    const totalDeliveries = await Delivery.countDocuments();
    const pendingDeliveries = await Delivery.countDocuments({ status: 'pending' });
    const assignedDeliveries = await Delivery.countDocuments({ status: 'assigned' });
    const completedDeliveries = await Delivery.countDocuments({ status: 'delivered' });
    
    res.status(200).json({
      stats: {
        totalUsers,
        totalAgents,
        totalDeliveries,
        pendingDeliveries,
        assignedDeliveries,
        completedDeliveries
      }
    });
  } catch (err) {
    console.error('❌ Error fetching dashboard stats:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name email role createdAt');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET users by role
router.get('/users/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['user', 'agent', 'admin'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const users = await User.find({ role }).select('name email role createdAt');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Error fetching users by role:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET only agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('name email role');
    res.status(200).json(agents);
  } catch (err) {
    console.error('❌ Error fetching agents:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📦 GET all deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching deliveries:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📦 GET deliveries by status
router.get('/deliveries/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const deliveries = await Delivery.find({ status })
      .populate('userId', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(deliveries);
  } catch (err) {
    console.error('❌ Error fetching deliveries by status:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ ASSIGN delivery to agent and send notification
router.patch('/assign-delivery/:deliveryId', async (req, res) => {
  const { deliveryId } = req.params;
  const { agentId } = req.body;

  try {
    const delivery = await Delivery.findById(deliveryId).populate('userId', 'name email');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (delivery.assignedAgent) {
      return res.status(400).json({ error: 'Delivery already assigned' });
    }

    if (!delivery.pickupAddress || !delivery.deliveryAddress || !delivery.contactNumber) {
      return res.status(400).json({ error: 'Delivery missing required details' });
    }

    if (!delivery.trackingId) {
      delivery.trackingId = generateTrackingId();
      console.warn(`⚠️ Assigned new trackingId to delivery: ${delivery.trackingId}`);
    }

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    delivery.statusUpdates.push({ status: 'assigned', timestamp: new Date() });

    await delivery.save();

    // In-app notification to agent
    const notification = new Notification({
      userId: agentId,
      message: `📦 You have been assigned a delivery from ${delivery.pickupAddress} to ${delivery.deliveryAddress}`
    });
    await notification.save();

    // Email notification to user
    const agent = await User.findById(agentId);
    const subject = '📦 Delivery Assigned';
    const message = `Hello ${delivery.userId.name},\n\nYour delivery (Tracking ID: ${delivery.trackingId}) has been assigned to our agent ${agent.name}.\nThey will be reaching you soon to pick up the parcel.\n\nThanks for choosing our service!\n\n- Team`;

    try {
      await sendEmail(delivery.userId.email, subject, message);
    } catch (err) {
      console.error(`❌ Failed to send email to user:`, err.message);
    }

    res.status(200).json({ message: '✅ Delivery assigned to agent and user notified' });

  } catch (err) {
    console.error('❌ Admin assign error:', err.message);
    res.status(500).json({ error: 'Server error during assignment' });
  }
});

// 📦 Update delivery status manually
router.patch('/delivery/:deliveryId/status', async (req, res) => {
  const { deliveryId } = req.params;
  const { status, notes } = req.body;

  try {
    const delivery = await Delivery.findById(deliveryId).populate('userId', 'name email');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const validStatuses = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    delivery.status = status;
    delivery.statusUpdates.push({ 
      status, 
      timestamp: new Date(),
      notes: notes || `Status updated by admin`
    });

    await delivery.save();

    // Notify user about status change
    const notification = new Notification({
      userId: delivery.userId._id,
      message: `📦 Your delivery (${delivery.trackingId}) status updated to: ${status.replace('_', ' ').toUpperCase()}`
    });
    await notification.save();

    res.status(200).json({ message: '✅ Delivery status updated successfully' });
  } catch (err) {
    console.error('❌ Error updating delivery status:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ UPDATE user details or role
router.patch('/user/:id', async (req, res) => {
  const { name, email, role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousRole = user.role;
    let roleChanged = false;

    if (name) user.name = name;
    if (email) user.email = email;

    if (role && role !== user.role) {
      const validRoles = ['user', 'agent', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      user.role = role;
      roleChanged = true;
    }

    await user.save();

    if (roleChanged) {
      const messageToUser = `Your role has been changed from ${previousRole} to ${role}`;
      const subjectToUser = '🛂 Your Role Has Been Updated';

      await new Notification({ userId: user._id, message: messageToUser }).save();

      try {
        await sendEmail(user.email, subjectToUser, messageToUser);
      } catch (err) {
        console.error(`❌ Failed to send role change email to ${user.email}:`, err.message);
      }

      const admins = await User.find({ role: 'admin' });
      const messageToAdmins = `User ${user.name} (${user.email}) role changed from ${previousRole} to ${role}`;
      const subjectToAdmins = '👤 User Role Updated';

      for (const admin of admins) {
        await new Notification({ userId: admin._id, message: messageToAdmins }).save();
        try {
          await sendEmail(admin.email, subjectToAdmins, messageToAdmins);
        } catch (err) {
          console.error(`❌ Failed to email admin ${admin.email}:`, err.message);
        }
      }
    }

    res.status(200).json({ message: '✅ User updated successfully', user });
  } catch (err) {
    console.error('❌ Error updating user:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ DELETE user
router.delete('/user/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: '🗑️ User deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting user:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔔 GET all notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json(notifications);
  } catch (err) {
    console.error('❌ Error fetching notifications:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📢 Send broadcast notification
router.post('/broadcast', async (req, res) => {
  const { message, userType } = req.body;

  try {
    let userQuery = {};
    if (userType === 'users') userQuery = { role: 'user' };
    if (userType === 'agents') userQuery = { role: 'agent' };
    if (userType === 'all') userQuery = { role: { $ne: 'admin' } };

    const users = await User.find(userQuery);
    
    const notifications = users.map(user => ({
      userId: user._id,
      message: `📢 Admin Announcement: ${message}`
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({ 
      message: `✅ Broadcast sent to ${users.length} users`,
      count: users.length 
    });
  } catch (err) {
    console.error('❌ Error sending broadcast:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
