const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const colors = require("colors");
const morgan = require("morgan");
const connectDb = require("./config/db");
const authRoute = require("./routes/auth.router");
const loanRoute = require("./routes/loan-router");
const errorMiddleware = require("./middlewares/error-middleware");



// dot env
dotenv.config();
// connect database // Connect to the database
connectDb();
// rest object
const app = express();

// middlewares

var corsOptions = {
  origin: ["http://localhost:8080", "http://127.0.0.1:8080","http://192.168.67.82"],
  methods: "GET,POST,PUT,PATCH,DELETE,HEAD",
  credentials: true,
};


app.use(cors(corsOptions));
app.use(express.json());

app.use(morgan("dev"));
// Routes Home
app.use('/public', express.static('public'));

// This is home route
app.get("/", (req, res) => {
  res.status(200).send({
    "success":true,
    "message":"node server is running"
  });
});

//Routes for Auth
app.use("/api/auth", authRoute);
app.use("/api/loan", loanRoute);
/// PORT
const PORT = process.env.PORT || 8080;


app.use(errorMiddleware);
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`.bgGreen);
});
