const express = require('express');
const router = express.Router();
const Vacancy = require('../models/Vacancy');
const { requireLogin } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Show all vacancies or search with filters + sorting
router.get('/', async (req, res) => {
  try {
    const { search = '', minRent, maxRent, sort } = req.query;
    const query = {};

    // Location search
    if (search) {
      query.location = { $regex: search, $options: 'i' };
    }

    // Rent filter
    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    // Sorting
    let sortOption = {};
    if (sort === 'rentAsc') sortOption.rent = 1;
    else if (sort === 'rentDesc') sortOption.rent = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;

    const vacancies = await Vacancy.find(query)
      .populate('postedBy', 'name')
      .sort(sortOption)
      .exec();

    const loggedIn = !!req.session.userId;

    res.render('catalog', {
      listings: vacancies,
      loggedIn,
      search,
      minRent,
      maxRent,
      sort,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving vacancies');
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
    if (!vacancy) return res.status(404).send('Vacancy not found');

    // Fetch saved vacancies
    let userSavedVacancies = [];
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      userSavedVacancies = user.savedVacancies.map(v => v.toString());
    }

    res.render('vacancyDetails', {
      vacancy,
      userId: req.session.userId,
      userSavedVacancies
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving vacancy details');
  }
});


module.exports = router;
