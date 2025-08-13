require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/userRoutes');
const vacancyRoutes = require('./routes/vacancyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const Message = require('./models/Message');
const bodyParser = require('body-parser');

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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chatMessage', (msg) => {
    io.emit('chatMessage', msg); // Send message to everyone
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

// ✅ SINGLE session middleware
app.use(session({
  secret: 'flatmate-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));

app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.userId;
  next();
});

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


io.on('connection', (socket) => {
  socket.on('chatMessage', async ({ senderId, receiverId, text }) => {
    const message = new Message({ sender: senderId, receiver: receiverId, text });
    await message.save();
    io.emit('chatMessage', text);
  });
});


// Start server
// app.listen(3000, () => {
//   console.log('Server running on http://localhost:3000');
// });

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});