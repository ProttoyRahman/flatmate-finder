const mongoose = require('mongoose');

const vacancySchema = new mongoose.Schema({
    title: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: String,
    rent: Number,
    roomSize: String,
    requirements: String,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vacancy', vacancySchema);
