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
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
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

module.exports = router;
