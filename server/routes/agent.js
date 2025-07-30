// routes/agent.js - Complete file with proper setup
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // This line was missing!
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const Delivery = require('../models/Delivery');

// Apply authentication to all routes
router.use(authenticate);

// GET /api/agent/stats/:agentId - Get agent statistics
router.get('/stats/:agentId', authorizeRoles('agent', 'admin'), async (req, res) => {
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

    // Calculate today's earnings with fallback
    let todaysEarnings = 0;
    
    try {
      const earningsResult = await Delivery.aggregate([
        {
          $match: {
            assignedAgent: new mongoose.Types.ObjectId(agentId),
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
      console.error('Aggregation error, using fallback:', aggregationError);
      
      // Fallback calculation
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

module.exports = router; 
