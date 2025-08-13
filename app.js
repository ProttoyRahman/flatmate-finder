require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const Chat = require('./models/Chat');
const unreadMessages = require('./middleware/unreadMessages');
const userRoutes = require('./routes/userRoutes');
const vacancyRoutes = require('./routes/vacancyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

// Session
app.use(session({
  secret: 'flatmate-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));

// Make login status available to templates
app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.userId;
  next();
});

// Add unread messages middleware globally
app.use(unreadMessages);

// View engine
app.set('view engine', 'ejs');

// Routes
app.use('/', userRoutes);
app.use('/vacancies', vacancyRoutes);
app.use('/chats', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.render('index');
});

// Socket.IO

io.on('connection', (socket) => {
  console.log('A user connected');

  // Join a chat room
  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  // Handle chat message
  socket.on('chatMessage', async ({ chatId, senderId, content }) => {
    try {
      const chat = await Chat.findById(chatId).populate('participants', '_id name');
      if (!chat) return;

      // Save message in DB
      const newMessage = { sender: senderId, content, sentAt: new Date() };
      chat.messages.push(newMessage);
      await chat.save();

      // Find sender name
      const sender = chat.participants.find(p => p._id.toString() === senderId);
      const msgToSend = {
        chatId,
        content,
        sender: { _id: sender._id, name: sender.name },
        sentAt: newMessage.sentAt
      };

      // Emit to all participants in that chat room
      io.to(chatId).emit('newChatMessage', msgToSend);
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


// Start server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});