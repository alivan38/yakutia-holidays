const express = require('express');
const cors = require('cors');
require('dotenv').config();

const proposalsRoutes = require('./routes/proposals');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/proposals', proposalsRoutes);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});