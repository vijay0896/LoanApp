const userModel = require("../models/user-models");
const BorrowerModel = require("../models/borrowerSchema");
var jwt = require("jsonwebtoken");
// const { sendEmail } = require("./emailService");
const bcrypt = require("bcrypt");
const Home = async (req, res) => {
  try {
    res.send("welcome Home");
  } catch (error) {
    console.log(error);
  }
};

const Register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    const userExists = await userModel.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const userCreated = await userModel.create({
      username,
      email,
      phone,
      password,
    });

    // Generate a token for the user
    const token = await userCreated.generateToken();

    // Send the response
    return res.status(201).json({
      msg: "Register successful",
      token,
      userId: userCreated._id.toString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userExists = await userModel.findOne({ email });

    if (!userExists) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = await bcrypt.compare(password, userExists.password);

    if (user) {
      res.status(200).json({
        msg: "Login succesful",
        token: await userExists.generateToken(),
        userId: userExists._id.toString(),
      });
    } else {
      res.status(401).json({ message: "invalid email or password" });
    }
  } catch (error) {
    res.status(500).json("interal server error");
  }
};

const User = async (req, res) => {
  try {
    const userData = req.user;

    if (!userData) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Send the user details (name, phone, and email)
    return res.status(200).json({
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
    });
  } catch (error) {
    console.error(`Error from the user route: ${error}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

// Function to generate a random reset token
const generateCode = (length) => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

const ResetPassword = async (req, res) => {
  try {
    const email = req.body.email;
    // userModel = Schemas.SIGNIN
    const existingUser = await userModel.findOne({ email });

    if (!existingUser) {
      console.error({ success: false, message: "There was an Error" });
      return res.send({
        success: false,
        message: "If user exists, an email was sent",
      });
    }

    const token = await generateCode(5);
    existingUser.resettoken = token;
    existingUser.resettokenExpiration = Date.now() + 3600000;
    await existingUser.save();
    await sendEmail(email, `Here is your Reset Token ${token}`);
    return res.send({ success: true, message: "Email sent" });
  } catch (error) {
    console.error(error);
  }
};
const addBorrow = async (req, res) => {
  try {
    const { borrowerName,loanDate, borrowerMobile, borrowerAddress, loanAmount, interestRate } = req.body;

    // Access the authenticated user's ID from req.userID (set in authMiddleware)
    const userId = req.userID;

    // Create a new borrower record with the authenticated user's ID
    const borrower = new BorrowerModel({
      borrowerName,
      borrowerMobile,
      borrowerAddress,
      loanDate,
      loanAmount,
      interestRate,
      userId, // Link the borrower to the authenticated user
    });

    // Save the borrower details to the database
    await borrower.save();

    res.status(201).json({
      msg: "Borrower details added successfully",
      borrowerId: borrower._id.toString(),
    });
  } catch (error) {
    console.error(`Error adding borrower: ${error}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const getBorrowers = async (req, res) => {
  try {
    // Access the authenticated user's ID from req.userID (set in authMiddleware)
    const userId = req.userID;

    // Find all borrowers associated with this user
    const borrowers = await BorrowerModel.find({ userId });
   
    // If no borrowers found, return a message
    if (!borrowers || borrowers.length === 0) {
      return res.status(404).json({ msg: "No borrowers found" });
    }

    // Return the list of borrowers
    return res.status(200).json({ borrowers });
  } catch (error) {
    console.error(`Error fetching borrowers: ${error}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};



module.exports = { Home, Register, Login, User, ResetPassword };
