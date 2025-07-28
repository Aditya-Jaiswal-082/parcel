// Fix the agent stats route - replace the existing one
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
      assignedAgent: agentId, // Use string instead of ObjectId
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    });

    // Get completed deliveries today
    const completedToday = await Delivery.countDocuments({
      assignedAgent: agentId, // Use string instead of ObjectId
      status: 'delivered',
      updatedAt: { $gte: today, $lt: tomorrow }
    });

    // Calculate today's earnings - FIXED VERSION
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

    const todaysEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;

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
