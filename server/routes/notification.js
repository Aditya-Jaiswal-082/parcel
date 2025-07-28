const express = require('express');
const Notification = require('../models/Notification');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware'); // Import your auth middleware
const router = express.Router();

// GET /api/notifications/admin - Get all notifications for admin
router.get('/admin', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('userId', 'name email role')
      .populate('deliveryId', 'trackingId')
      .sort({ createdAt: -1 })
      .limit(100);

    // Add additional context for admin notifications
    const enhancedNotifications = notifications.map(notification => ({
      ...notification.toObject(),
      category: categorizeNotification(notification.message, 'admin'),
      priority: getPriority(notification.message),
      timestamp: notification.createdAt
    }));

    res.status(200).json(enhancedNotifications);
  } catch (err) {
    console.error('❌ Error fetching admin notifications:', err);
    res.status(500).json({ error: 'Failed to fetch admin notifications' });
  }
});

// GET /api/notifications/agent/:agentId - Get agent-specific notifications
router.get('/agent/:agentId', authenticate, authorizeRoles('agent'), async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Get notifications for agent (assignments and new deliveries)
    const notifications = await Notification.find({
      $or: [
        { userId: agentId }, // Direct notifications to this agent
        { 
          message: { 
            $regex: 'new delivery.*created', 
            $options: 'i' 
          } 
        }, // New delivery notifications
        { 
          message: { 
            $regex: `assigned.*${agentId}|assigned to you`, 
            $options: 'i' 
          } 
        } // Assignment notifications
      ]
    })
    .populate('userId', 'name email')
    .populate('deliveryId', 'trackingId pickupAddress deliveryAddress')
    .sort({ createdAt: -1 })
    .limit(50);

    const enhancedNotifications = notifications.map(notification => ({
      ...notification.toObject(),
      category: categorizeNotification(notification.message, 'agent'),
      priority: getPriority(notification.message),
      timestamp: notification.createdAt
    }));

    res.status(200).json(enhancedNotifications);
  } catch (err) {
    console.error('❌ Error fetching agent notifications:', err);
    res.status(500).json({ error: 'Failed to fetch agent notifications' });
  }
});

// GET /api/notifications/user/:userId - Get user-specific notifications
router.get('/user/:userId', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await Notification.find({ userId })
      .populate('deliveryId', 'trackingId status pickupAddress deliveryAddress assignedAgent')
      .sort({ createdAt: -1 })
      .limit(50);

    const enhancedNotifications = notifications.map(notification => ({
      ...notification.toObject(),
      category: categorizeNotification(notification.message, 'user'),
      priority: getPriority(notification.message),
      timestamp: notification.createdAt
    }));

    res.status(200).json(enhancedNotifications);
  } catch (err) {
    console.error('❌ Error fetching user notifications:', err);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
  }
});

// GET /api/notifications/:userId - Your original route (keep for backward compatibility)
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role; // Get role from authenticated user
    
    let notifications;
    
    // Route based on user role
    switch (userRole) {
      case 'admin':
        notifications = await Notification.find()
          .populate('userId', 'name email role')
          .populate('deliveryId', 'trackingId')
          .sort({ createdAt: -1 })
          .limit(100);
        break;
        
      case 'agent':
        notifications = await Notification.find({
          $or: [
            { userId },
            { message: { $regex: 'new delivery.*created', $options: 'i' } },
            { message: { $regex: `assigned.*${userId}|assigned to you`, $options: 'i' } }
          ]
        })
        .populate('userId', 'name email')
        .populate('deliveryId', 'trackingId pickupAddress deliveryAddress')
        .sort({ createdAt: -1 })
        .limit(50);
        break;
        
      default: // user
        notifications = await Notification.find({ userId })
          .populate('deliveryId', 'trackingId status pickupAddress deliveryAddress assignedAgent')
          .sort({ createdAt: -1 })
          .limit(50);
        break;
    }

    // Enhance notifications with metadata
    const enhancedNotifications = notifications.map(notification => ({
      ...notification.toObject(),
      category: categorizeNotification(notification.message, userRole),
      priority: getPriority(notification.message),
      timestamp: notification.createdAt
    }));

    res.status(200).json(enhancedNotifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (err) {
    console.error('❌ Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/mark-all-read - Mark all notifications as read for a user
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const userRole = req.user.role;
    
    let updateQuery;
    
    if (userRole === 'admin') {
      // Admin can mark all notifications as read
      updateQuery = {};
    } else {
      // Regular users can only mark their own notifications as read
      updateQuery = { userId };
    }

    const result = await Notification.updateMany(
      updateQuery,
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.status(200).json({ 
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    let deleteQuery = { _id: id };
    
    // Non-admin users can only delete their own notifications
    if (userRole !== 'admin') {
      deleteQuery.userId = userId;
    }

    const notification = await Notification.findOneAndDelete(deleteQuery);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/create - Create a new notification (for system use)
router.post('/create', authenticate, authorizeRoles('admin', 'system'), async (req, res) => {
  try {
    const { userId, message, type, deliveryId, priority = 'medium' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const notification = new Notification({
      userId,
      message,
      type: type || 'general',
      deliveryId,
      priority,
      read: false,
      createdAt: new Date()
    });

    await notification.save();

    // Populate the notification before sending response
    const populatedNotification = await Notification.findById(notification._id)
      .populate('userId', 'name email')
      .populate('deliveryId', 'trackingId');

    res.status(201).json(populatedNotification);
  } catch (err) {
    console.error('❌ Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// GET /api/notifications/stats/:userId - Get notification statistics
router.get('/stats/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;
    
    let matchQuery;
    
    if (userRole === 'admin') {
      matchQuery = {}; // Admin sees all notifications
    } else {
      matchQuery = { userId }; // Users see only their notifications
    }

    const stats = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] }
          },
          today: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$createdAt",
                    new Date(new Date().setHours(0, 0, 0, 0))
                  ]
                },
                1,
                0
              ]
            }
          },
          thisWeek: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$createdAt",
                    new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      unread: 0,
      today: 0,
      thisWeek: 0
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Error fetching notification stats:', err);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Utility functions
function categorizeNotification(message, role) {
  if (!message) return 'general';
  
  const lowerMessage = message.toLowerCase();
  
  if (role === 'admin') {
    if (lowerMessage.includes('new delivery') && lowerMessage.includes('created')) return 'deliveries';
    if (lowerMessage.includes('assigned') || lowerMessage.includes('agent')) return 'assignments';
    if (lowerMessage.includes('completed') || lowerMessage.includes('cancelled') || lowerMessage.includes('delivered')) return 'status_updates';
    return 'system';
  } else if (role === 'agent') {
    if (lowerMessage.includes('assigned') && lowerMessage.includes('you')) return 'assignments';
    if (lowerMessage.includes('new delivery')) return 'new_deliveries';
    return 'updates';
  } else if (role === 'user') {
    if (lowerMessage.includes('order') || lowerMessage.includes('delivery')) return 'orders';
    if (lowerMessage.includes('status') || lowerMessage.includes('completed') || lowerMessage.includes('delivered')) return 'status_updates';
    return 'general';
  }
  
  return 'general';
}

function getPriority(message) {
  if (!message) return 'low';
  
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('urgent') || lowerMessage.includes('cancelled') || lowerMessage.includes('failed')) return 'high';
  if (lowerMessage.includes('assigned') || lowerMessage.includes('completed')) return 'medium';
  return 'low';
}

module.exports = router;
