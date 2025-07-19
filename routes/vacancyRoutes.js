const express = require('express');
const router = express.Router();
const Vacancy = require('../models/Vacancy');
const { requireLogin } = require('../middleware/authMiddleware');


// Show all vacancies (open to everyone)
router.get('/', async (req, res) => {
  try {
    const vacancies = await Vacancy.find();
    const loggedIn = !!req.session.userId;  // true if logged in
    res.render('catalog', { listings: vacancies, loggedIn });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving vacancies");
  }
});


// Show form to post a new vacancy (requires login)
router.get('/post', requireLogin, (req, res) => {
  res.render('postVacancy');
});

// Handle form submission for new vacancy (requires login)
router.post('/post', requireLogin, async (req, res) => {
  try {
    const { title, description, location, rent } = req.body;
    await Vacancy.create({
      title,
      description,
      location,
      rent,
      postedBy: req.session.userId
    });
    res.redirect('/vacancies');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error posting vacancy");
  }
});

module.exports = router;
