const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Vacancy = require('../models/Vacancy');

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

  // Check if all required fields are filled
  if (!name || !email || !password) {
    return res.send('Please fill in all required fields.');
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('This email is already registered. Please login instead.');
    }

    // Hash password and save user
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
      return res.redirect('/profile');
    }
    res.clearCookie('connect.sid'); 
    res.redirect('/login');          
  });
});

// Public profile
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

// User dashboard
router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Posted vacancies
    const postedVacancies = await Vacancy.find({ postedBy: userId });

    // Saved vacancies
    const user = await User.findById(userId).populate('savedVacancies');
    const savedVacancies = user.savedVacancies || [];

    res.render('dashboard', {
      postedVacancies,
      savedVacancies,
      loggedIn: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// Save a vacancy
router.post('/user/vacancies/:id/save', requireLogin, async (req, res) => {
  try {
    const vacancyId = req.params.id;
    await User.findByIdAndUpdate(req.session.userId, {
      $addToSet: { savedVacancies: vacancyId }
    });
    res.redirect(`/vacancies/${vacancyId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving vacancy');
  }
});

// Unsave a vacancy
router.post('/user/vacancies/:id/unsave', requireLogin, async (req, res) => {
  try {
    const vacancyId = req.params.id;
    await User.findByIdAndUpdate(req.session.userId, {
      $pull: { savedVacancies: vacancyId }
    });
    res.redirect(`/vacancies/${vacancyId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error unsaving vacancy');
  }
});

// View saved vacancies
router.get('/profile/saved', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .populate({
        path: 'savedVacancies',
        populate: { path: 'postedBy', select: 'name' }
      });

    res.render('savedVacancies', { saved: user.savedVacancies, loggedIn: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving saved vacancies');
  }
});

module.exports = router;