const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');

// ✅ GET /api/admin/users - Get all users (for role-based filtering in frontend)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name email role');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/agents - returns only agents (for delivery assignment)
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('name email role');
    res.status(200).json(agents);
  } catch (err) {
    console.error('❌ Error fetching agents:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ✅ PATCH /api/admin/assign-delivery/:deliveryId - Assign a delivery to an agent
router.patch('/assign-delivery/:deliveryId', async (req, res) => {
  const { deliveryId } = req.params;
  const { agentId } = req.body;

  try {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (delivery.assignedAgent) {
      return res.status(400).json({ error: 'Delivery already assigned' });
    }

    delivery.assignedAgent = agentId;
    delivery.status = 'assigned';
    await delivery.save();

    // 🔔 Send notification to agent
    const notification = new Notification({
      userId: agentId,
      message: `You have been assigned a delivery from ${delivery.pickupAddress} to ${delivery.deliveryAddress}`
    });
    await notification.save();

    res.status(200).json({ message: '✅ Delivery assigned to agent successfully' });
  } catch (err) {
    console.error('❌ Admin assign error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ PATCH /api/admin/user/:id - Update user info or role
router.patch('/user/:id', async (req, res) => {
  const { name, email, role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('❌ Error updating user:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ DELETE /api/admin/user/:id - Delete a user
router.delete('/user/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting user:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
