// routes/waitlist.js
const express = require('express');
const router = express.Router();
const User = require('../models/waitlist');

// Add user to waitlist
router.post('/add', async (req, res) => {
  const { email } = req.body;
  try {
    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   return res.status(200).json({ message: 'Email already exists in the waitlist' });
    // }

    const newUser = new User({ email });
    await newUser.save();
    res.status(201).json({ message: 'User added to waitlist', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Error adding user', error: err.message });
  }
});

// Get all users in the waitlist
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

module.exports = router;