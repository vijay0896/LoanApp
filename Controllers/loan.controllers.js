const userModel = require("../models/user-models");
const BorrowerModel = require("../models/borrowerSchema");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/Images/Borrowers_Img"); // Directory for storing uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueFilename = uuidv4();
    cb(null, uniqueFilename + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const addBorrow = async (req, res) => {
  try {
    const { borrowerName, borrowerMobile, borrowerAddress, loans } = req.body;

    // Log the received request body for debugging
    console.log("Received Request Body:", req.body);

    // Access the authenticated user's ID from req.userID (set in authMiddleware)
    const userId = req.userID;

    // Parse loans if it's a string
    let parsedLoans;
    try {
      parsedLoans = typeof loans === "string" ? JSON.parse(loans) : loans;
    } catch (error) {
      return res.status(400).json({ msg: "Invalid loans format" });
    }

    // Check that parsedLoans is an array with at least one element
    if (!Array.isArray(parsedLoans) || parsedLoans.length === 0) {
      return res.status(400).json({ msg: "Loans must be a non-empty array" });
    }

    // Extract the first loan details from the loans array
    const { loanAmount, interestRate, loanDate } = parsedLoans[0];

    // Check if an image file was uploaded
    const imageUrl = req.file ? req.file.path : null;

    // Convert string inputs to numbers if necessary
    const parsedLoanAmount = parseFloat(loanAmount.trim()); // Trim any spaces
    const parsedInterestRate = parseFloat(interestRate.trim()); // Trim any spaces

    // Convert borrower details to trimmed and lowercase (for case-insensitive matching)
    const trimmedBorrowerName = borrowerName.trim().toLowerCase();
    const trimmedBorrowerMobile = borrowerMobile.trim(); // You might not want to change the case for mobile numbers, just trim spaces.

    console.log("Image URL:", imageUrl);

    // Validate if loanAmount and interestRate are valid numbers
    if (isNaN(parsedLoanAmount) || isNaN(parsedInterestRate)) {
      return res
        .status(400)
        .json({ msg: "Loan amount and interest rate must be valid numbers." });
    }

    // Find if the borrower already exists by checking trimmed and lowercased borrowerName and borrowerMobile for the current user
    let borrower = await BorrowerModel.findOne({
      borrowerName: trimmedBorrowerName,
      borrowerMobile: trimmedBorrowerMobile,
      userId,
    });

    // If borrower exists, update the loans array
    if (borrower) {
      borrower.loans.push({
        loanAmount: parsedLoanAmount,
        loanDate,
        interestRate: parsedInterestRate,
      });
      // Optionally update the image URL if provided
      if (imageUrl) {
        borrower.imageUrl = imageUrl; // Store the image path in the borrower record
      }
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
        imageUrl,
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

const deleteBorrower = async (req, res) => {
  try {
    const userId = req.userID;
    const { borrowerId } = req.params; // Get the borrower ID from the request parameters

    // Attempt to delete the specific borrower by userId and borrowerId
    const result = await BorrowerModel.deleteOne({ _id: borrowerId, userId });

    // Check if a borrower was deleted (deleteOne returns an object with a `deletedCount`)
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ msg: "Borrower not found or already deleted" });
    }

    return res.status(200).json({ msg: "Borrower deleted successfully" });
  } catch (error) {
    console.error(`Error deleting borrower: ${error.message}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const deleteBorrowerLoan = async (req, res) => {
  try {
    const userId = req.userID;
    const { borrowerId, loanId } = req.params;

    // Use $pull to remove only the specific loan from the borrower's loans array
    const result = await BorrowerModel.updateOne(
      { _id: borrowerId, userId },
      { $pull: { loans: { _id: loanId } } }
    );

    // Check if a loan was deleted
    if (result.modifiedCount === 0) {
      return res.status(404).json({ msg: "Loan not found or already deleted" });
    }

    return res
      .status(200)
      .json({ msg: "Borrower's loan deleted successfully" });
  } catch (error) {
    console.error(`Error deleting borrower's loan: ${error.message}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const getBorrowers = async (req, res) => {
  try {
    const userId = req.userID;
    let borrowers = await BorrowerModel.find({ userId });

    if (!borrowers || borrowers.length === 0) {
      return res.status(404).json({ msg: "No borrowers found" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/public/images/Borrowers_Img/`;

    borrowers = borrowers.map((borrower) => {
      // Capitalize names and addresses
      borrower.borrowerName = borrower.borrowerName
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      borrower.borrowerAddress = borrower.borrowerAddress
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      // Ensure imageUrl is a file name, not a full URL
      if (borrower.imageUrl) {
        const filename = borrower.imageUrl.split('/').pop();
        borrower.imageUrl = baseUrl + filename;
      } else {
        borrower.imageUrl = null; // Or set a default image path if needed
      }

      return borrower;
    });

    return res.status(200).json({ borrowers });
  } catch (error) {
    console.error(`Error fetching borrowers: ${error}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};


const updateBorrower = async (req, res) => {
  try {
    const userId = req.userID;
    const { borrowerId } = req.params; // Get the borrower ID from the request parameters
    const { borrowerName, borrowerMobile, borrowerAddress, loans } = req.body;

    // Convert borrower details to trimmed and formatted for case-insensitive matching
    const trimmedBorrowerName = borrowerName.trim().toLowerCase();
    const trimmedBorrowerMobile = String(borrowerMobile).trim(); // Ensure borrowerMobile is a string
    const trimmedBorrowerAddress = borrowerAddress.trim();

    // Update the borrower's information
    const result = await BorrowerModel.updateOne(
      { _id: borrowerId, userId }, // Ensure the borrower belongs to the authenticated user
      {
        $set: {
          borrowerName: trimmedBorrowerName,
          borrowerMobile: trimmedBorrowerMobile,
          borrowerAddress: trimmedBorrowerAddress,
        },
      }
    );

    // Check if the borrower was updated (modifiedCount indicates changes)
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ msg: "Borrower not found or no changes made" });
    }

    res.status(200).json({ msg: "Borrower details updated successfully" });
  } catch (error) {
    console.error(`Error updating borrower: ${error.message}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const updateBorrowerLoan = async (req, res) => {
  try {
    const userId = req.userID;
    const { borrowerId, loanId } = req.params;
    const { loanAmount, interestRate, loanDate } = req.body;

    // Parse loanAmount and interestRate as before
    const parsedLoanAmount =
      typeof loanAmount === "string"
        ? parseFloat(loanAmount.trim())
        : loanAmount;
    const parsedInterestRate =
      typeof interestRate === "string"
        ? parseFloat(interestRate.trim())
        : interestRate;

    if (isNaN(parsedLoanAmount) || isNaN(parsedInterestRate)) {
      return res
        .status(400)
        .json({ msg: "Loan amount and interest rate must be valid numbers." });
    }

    // Perform the update
    const result = await BorrowerModel.updateOne(
      { _id: borrowerId, userId, "loans._id": loanId },
      {
        $set: {
          "loans.$.loanAmount": parsedLoanAmount,
          "loans.$.interestRate": parsedInterestRate,
          "loans.$.loanDate": loanDate,
        },
      }
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 0) {
      return res.status(404).json({ msg: "Loan not found or no changes made" });
    }

    res
      .status(200)
      .json({ msg: "Borrower's loan details updated successfully" });
  } catch (error) {
    console.error(`Error updating borrower's loan: ${error.message}`);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

module.exports = {
  addBorrow,
  getBorrowers,
  deleteBorrower,
  deleteBorrowerLoan,
  updateBorrower,
  updateBorrowerLoan,
  upload,
};
