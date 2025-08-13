const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { ensureAuthenticated } = require('../middleware/auth'); // if you have one

// Get chat between two users
router.get('/:userId', ensureAuthenticated, async (req, res) => {
  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user._id }
    ]
  }).populate('sender receiver').sort({ createdAt: 1 });

  res.render('chat', { messages, otherUserId: req.params.userId });
});

module.exports = router;
