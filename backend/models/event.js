const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true }, // or Date type depending on your use case
    description: String
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
