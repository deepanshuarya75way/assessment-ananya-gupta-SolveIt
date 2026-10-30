const express = require('express');
const app = express();
require('dotenv').config({override:true});
const main = require('./config/db');
const cookieParser = require('cookie-parser');
const authRouter = require("./routes/userAuth");
const redisClient = require('./config/redis');
const problemRouter = require("./routes/problemCreator");
const submitRouter = require("./routes/submit");
const videoRouter = require("./routes/videoCreator");

const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/user', authRouter);
app.use('/problem', problemRouter);
app.use('/submission', submitRouter);
app.use('/video', videoRouter);

const { DEFAULT_PROBLEMS } = require("./utils/seedData");
const Problem = require("./models/problem");

const InitializeConnection = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log("DB connected");

    // Auto-seed database if empty
    const count = await Problem.countDocuments();
    if (count === 0 && DEFAULT_PROBLEMS.length > 0) {
      const seeded = DEFAULT_PROBLEMS.map(p => ({
        ...p,
        problemCreator: "6688f0000000000000000000"
      }));
      await Problem.insertMany(seeded);
      console.log(`Auto-seeded ${DEFAULT_PROBLEMS.length} standard problems into MongoDB!`);
    }

    app.listen(process.env.PORT, () => {
      console.log("Server listening at port number:" + process.env.PORT);
    });
  } catch (err) {
    console.log("error:" + err.message);
  }
};

InitializeConnection();
