const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Show registration form
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('register');
});


// Handle registration form submission
router.post('/register', async (req, res) => {
  const { name, email, password, age, gender, phone } = req.body;

  // 1️⃣ Check if all required fields are filled
  if (!name || !email || !password) {
    return res.send('Please fill in all required fields.');
  }

  try {
    // 2️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('This email is already registered. Please login instead.');
    }

    // 3️⃣ Hash password and save user
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, age, gender, phone });
    await user.save();

    res.redirect('/login');
  } catch (error) {
    res.send('Error registering user: ' + error.message);
  }
});


// Show login form
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login');
});




// Handle login submission
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/profile');
    } else {
      res.send('Invalid email or password');
    }
  } catch (error) {
    res.send('Login error: ' + error.message);
  }
});

// Profile page (requires login)
router.get('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = await User.findById(req.session.userId);
  res.render('profile', { user });
});

const { requireLogin } = require('../middleware/authMiddleware');

// Show edit profile form
router.get('/profile/edit', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('editProfile', { user });
});

// Handle edit profile submission
router.post('/profile/edit', requireLogin, async (req, res) => {
  const { name, age, gender, phone, smoking, pets, cleanliness } = req.body;

  try {
    await User.findByIdAndUpdate(req.session.userId, {
      name,
      age,
      gender,
      phone,
      preferences: { smoking, pets, cleanliness }
    });
    res.redirect('/profile');
  } catch (error) {
    res.status(500).send('Error updating profile: ' + error.message);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/profile'); // or some error page
    }
    res.clearCookie('connect.sid'); // clear the session cookie
    res.redirect('/login');          // redirect to login page after logout
  });
});

// Public profile (view by ID)
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // hide password
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.render('publicProfile', { 
      user, 
      userId: req.session.userId
    });
  } catch (error) {
    res.status(500).send('Error loading user profile');
  }
});


module.exports = router;