require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/userRoutes');
const vacancyRoutes = require('./routes/vacancyRoutes');
const bodyParser = require('body-parser');

const app = express();

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

// Root route
app.get('/', (req, res) => {
  res.render('index');
});



// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
