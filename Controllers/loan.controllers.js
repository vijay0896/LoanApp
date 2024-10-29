const userModel = require("../models/user-models");
const BorrowerModel = require("../models/borrowerSchema");

const addBorrow = async (req, res) => {
  try {
    const { borrowerName, borrowerMobile, borrowerAddress, loans } = req.body;

    // Log the received request body for debugging
    console.log("Received Request Body:", req.body);

    // Access the authenticated user's ID from req.userID (set in authMiddleware)
    const userId = req.userID;

    // Extract the first loan details from the loans array
    const { loanAmount, interestRate, loanDate } = loans[0];

    // Convert string inputs to numbers if necessary
    const parsedLoanAmount = parseFloat(loanAmount.trim()); // Trim any spaces
    const parsedInterestRate = parseFloat(interestRate.trim()); // Trim any spaces

    // Convert borrower details to trimmed and lowercase (for case-insensitive matching)
    const trimmedBorrowerName = borrowerName.trim().toLowerCase();
    const trimmedBorrowerMobile = borrowerMobile.trim(); // You might not want to change the case for mobile numbers, just trim spaces.

    // Log parsed values for debugging
    console.log("Parsed Loan Amount:", parsedLoanAmount);
    console.log("Parsed Interest Rate:", parsedInterestRate);
    console.log("Trimmed Borrower Name:", trimmedBorrowerName);
    console.log("Trimmed Borrower Mobile:", trimmedBorrowerMobile);

    // Validate if loanAmount and interestRate are valid numbers
    if (isNaN(parsedLoanAmount) || isNaN(parsedInterestRate)) {
      return res.status(400).json({ msg: "Loan amount and interest rate must be valid numbers." });
    }

    // Find if the borrower already exists by checking trimmed and lowercased borrowerName and borrowerMobile for the current user
    let borrower = await BorrowerModel.findOne({ borrowerName: trimmedBorrowerName, borrowerMobile: trimmedBorrowerMobile, userId });

    // If borrower exists, update the loans array
    if (borrower) {
      borrower.loans.push({
        loanAmount: parsedLoanAmount,
        loanDate,
        interestRate: parsedInterestRate,
      });
    } else {
      // If borrower does not exist, create a new borrower record
      borrower = new BorrowerModel({
        borrowerName: trimmedBorrowerName,
        borrowerMobile: trimmedBorrowerMobile,
        borrowerAddress: borrowerAddress.trim(), // Trim spaces in address as well
        loans: [
          {
            loanAmount: parsedLoanAmount,
            loanDate,
            interestRate: parsedInterestRate,
          },
        ], // Submit loan details as an array
        userId, // Link the borrower to the authenticated user
      });
    }

    // Save the borrower details (new or updated)
    await borrower.save();

    res.status(201).json({
      msg: "Borrower details added successfully",
      borrowerId: borrower._id.toString(),
    });
  } catch (error) {
    console.error(`Error adding borrower: ${error.message}`);

    // Enhanced error logging for debugging
    if (error.name === "ValidationError") {
      console.error("Validation Error:", error.errors);
      return res.status(400).json({
        msg: "Validation failed",
        errorDetails: error.errors,
      });
    }

    return res.status(500).json({ msg: "Internal server error" });
  }
};

  

const getBorrowers = async (req, res) => {
  try {
    // Access the authenticated user's ID from req.userID (set in authMiddleware)
    const userId = req.userID;

    // Find all borrowers associated with this user
    let borrowers = await BorrowerModel.find({ userId });

    // If no borrowers found, return a message
    if (!borrowers || borrowers.length === 0) {
      return res.status(404).json({ msg: "No borrowers found" });
    }

    // Sanitize borrower data (remove leading/trailing spaces and fix case)
    borrowers = borrowers.map((borrower) => {
      borrower.borrowerName = borrower.borrowerName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
      borrower.borrowerAddress = borrower.borrowerAddress.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
      return borrower;
    });

    // Return the list of borrowers
    return res.status(200).json({ borrowers });
  } catch (error) {
    console.error(`Error fetching borrowers: ${error}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};


module.exports = { addBorrow, getBorrowers };
