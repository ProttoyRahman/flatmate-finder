const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    age: Number,
    gender: String,
    phone: String,
    preferences: {
        smoking: { type: String, default: 'No preference' },
        pets: { type: String, default: 'No preference' },
        cleanliness: { type: String, default: 'No preference' }
    }
});

module.exports = mongoose.model('User', userSchema);
