// utils/notificationHelper.js
const Notification = require('../models/Notification');

const createNotification = async (userId, message, type = 'general', deliveryId = null, priority = 'medium') => {
  try {
    const notification = new Notification({
      userId,
      message,
      type,
      deliveryId,
      priority,
      read: false
    });

    await notification.save();
    console.log(`✅ Notification created for user ${userId}: ${message}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Create notifications for different events
const notificationHelpers = {
  // For new delivery creation
  newDeliveryCreated: async (userId, deliveryId, trackingId) => {
    const message = `📦 New delivery created with tracking ID: ${trackingId}`;
    return createNotification(userId, message, 'delivery', deliveryId, 'medium');
  },

  // For delivery assignment
  deliveryAssigned: async (agentId, deliveryId, trackingId) => {
    const message = `🚛 You have been assigned a new delivery: ${trackingId}`;
    return createNotification(agentId, message, 'assignment', deliveryId, 'high');
  },

  // For status updates
  statusUpdated: async (userId, deliveryId, trackingId, newStatus) => {
    const statusMessages = {
      'picked_up': `📋 Your package ${trackingId} has been picked up`,
      'in_transit': `🚛 Your package ${trackingId} is in transit`,
      'delivered': `✅ Your package ${trackingId} has been delivered`,
      'cancelled': `❌ Your delivery ${trackingId} has been cancelled`
    };
    
    const message = statusMessages[newStatus] || `📊 Status updated for ${trackingId}: ${newStatus}`;
    const priority = newStatus === 'cancelled' ? 'high' : 'medium';
    
    return createNotification(userId, message, 'status_update', deliveryId, priority);
  },

  // Admin notifications
  adminNotification: async (message, type = 'system', deliveryId = null, priority = 'medium') => {
    // Get all admin users
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    
    const notifications = [];
    for (const admin of admins) {
      const notification = await createNotification(admin._id, message, type, deliveryId, priority);
      notifications.push(notification);
    }
    
    return notifications;
  }
};

module.exports = { createNotification, notificationHelpers };
