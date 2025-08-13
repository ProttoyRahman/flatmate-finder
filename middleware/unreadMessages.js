const Chat = require('../models/Chat');

module.exports = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const chats = await Chat.find({ participants: req.session.userId });
      let unreadCount = 0;

      chats.forEach(chat => {
        chat.messages.forEach(msg => {
          if (!msg.isRead && msg.sender.toString() !== req.session.userId) {
            unreadCount++;
          }
        });
      });

      res.locals.newMessagesCount = unreadCount;
    } catch (err) {
      console.error("Error fetching unread messages:", err);
      res.locals.newMessagesCount = 0;
    }
  }
  next();
};