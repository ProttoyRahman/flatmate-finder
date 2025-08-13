const express = require('express');
const router = express.Router();
const Vacancy = require('../models/Vacancy');
const { requireLogin } = require('../middleware/authMiddleware');


// Show all vacancies (open to everyone)
router.get('/', async (req, res) => {
  try {
    const vacancies = await Vacancy.find()
      .populate('postedBy', 'name') 
      .exec();

    const loggedIn = !!req.session.userId;

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

// Show edit vacancy form
router.get('/:id/edit', requireLogin, async (req, res) => {
  try {
    const vacancy = await Vacancy.findById(req.params.id);

    if (!vacancy) {
      return res.status(404).send('Vacancy not found');
    }

    // Only allow the creator to edit
    if (vacancy.postedBy.toString() !== req.session.userId) {
      return res.status(403).send('You are not authorized to edit this listing.');
    }

    res.render('editVacancy', { vacancy });
  } catch (error) {
    res.status(500).send('Error loading vacancy: ' + error.message);
  }
});

// Handle edit vacancy form submission
router.post('/:id/edit', requireLogin, async (req, res) => {
  const { title, description, location, rent, roomSize, requirements } = req.body;

  try {
    const vacancy = await Vacancy.findById(req.params.id);

    if (!vacancy) {
      return res.status(404).send('Vacancy not found');
    }

    if (vacancy.postedBy.toString() !== req.session.userId) {
      return res.status(403).send('You are not authorized to edit this listing.');
    }

    vacancy.title = title;
    vacancy.description = description;
    vacancy.location = location;
    vacancy.rent = rent;
    vacancy.roomSize = roomSize;
    vacancy.requirements = requirements;

    await vacancy.save();
    res.redirect(`/vacancies/${vacancy._id}`);
  } catch (error) {
    res.status(500).send('Error updating vacancy: ' + error.message);
  }
});


// Show full vacancy details by ID
router.get('/:id', async (req, res) => {
  try {
    const vacancy = await Vacancy.findById(req.params.id).populate('postedBy', 'name');
    if (!vacancy) {
      return res.status(404).send('Vacancy not found');
    }

    // Pass userId from session for template logic
    res.render('vacancyDetails', { vacancy, userId: req.session.userId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving vacancy details');
  }
});



module.exports = router;
