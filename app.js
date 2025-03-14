// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const waitlistRoutes = require('./routes/waitlist');
const errorHandler = require('./middleware/error');

const app = express();

connectDB();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/waitlist', waitlistRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});