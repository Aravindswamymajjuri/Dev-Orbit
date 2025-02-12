const express = require('express');
const router = express.Router();
const Event = require('../models/event'); // Ensure the correct path

// GET all events
router.get('/events', async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST new event
router.post('/events', async (req, res) => {
    try {
        const newEvent = new Event(req.body);
        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error saving event' });
    }
});

// PUT update event by date
router.put('/events/:date', async (req, res) => {
    try {
        const updatedEvent = await Event.findOneAndUpdate(
            { date: req.params.date },
            req.body,
            { new: true }
        );
        if (!updatedEvent) return res.status(404).json({ message: 'Event not found' });
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error updating event' });
    }
});

// DELETE event by date
router.delete('/events/:date', async (req, res) => {
    try {
        const deletedEvent = await Event.findOneAndDelete({ date: req.params.date });
        if (!deletedEvent) return res.status(404).json({ message: 'Event not found' });
        res.status(200).json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting event' });
    }
});

module.exports = router;
