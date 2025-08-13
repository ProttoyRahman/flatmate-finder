const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { requireLogin } = require('../middleware/authMiddleware');

// Show list of chats for logged-in user
router.get('/', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'name')
    .sort({ updatedAt: -1 });
  res.render('chatList', { chats, userId });
});

// Show messages in a chat thread
router.get('/:chatId', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const chat = await Chat.findById(req.params.chatId)
    .populate('participants', 'name')
    .populate('messages.sender', 'name');

  if (!chat || !chat.participants.some(p => p._id.equals(userId))) {
    return res.status(403).send('Access denied');
  }

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

  if (currentUserId === otherUserId) {
    return res.redirect('back'); // prevent chatting with self
  }

  // Check if a chat between these two users already exists
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
