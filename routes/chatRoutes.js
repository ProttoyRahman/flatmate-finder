const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { requireLogin } = require('../middleware/authMiddleware');

// List all chats for logged-in user
router.get('/', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'name')
    .sort({ updatedAt: -1 });
  res.render('chatList', { chats, userId });
});

// View a chat thread
router.get('/:chatId', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const chat = await Chat.findById(req.params.chatId)
    .populate('participants', 'name')
    .populate('messages.sender', 'name');

  if (!chat || !chat.participants.some(p => p._id.equals(userId))) {
    return res.status(403).send('Access denied');
  }

  // Mark messages from others as read
  let updated = false;
  chat.messages.forEach(msg => {
    if (!msg.isRead && msg.sender._id.toString() !== userId.toString()) {
      msg.isRead = true;
      updated = true;
    }
  });
  if (updated) await chat.save();

  res.render('chatThread', { chat, userId });
});

// Send message in chat thread
router.post('/:chatId/message', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const { content } = req.body;
  const chat = await Chat.findById(req.params.chatId);

  if (!chat || !chat.participants.some(p => p.equals(userId))) {
    return res.status(403).send('Access denied');
  }

  chat.messages.push({ sender: userId, content });
  await chat.save();

  res.redirect(`/chats/${chat._id}`);
});

// Start or get chat with a specific user
router.post('/start/:userId', requireLogin, async (req, res) => {
  const currentUserId = req.session.userId;
  const otherUserId = req.params.userId;

  if (currentUserId === otherUserId) return res.redirect('back');

  let chat = await Chat.findOne({
    participants: { $all: [currentUserId, otherUserId] }
  });

  if (!chat) {
    chat = new Chat({
      participants: [currentUserId, otherUserId],
      messages: []
    });
    await chat.save();
  }

  res.redirect(`/chats/${chat._id}`);
});

module.exports = router;