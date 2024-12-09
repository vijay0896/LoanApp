const userModel = require("../models/user-models");
const BorrowerModel = require("../models/borrowerSchema");

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const cloudinary = require("../utils/cloudinary.config");
const { Readable } = require("stream");
// Configure multer to process the file but not store it locally
const storage = multer.memoryStorage(); // Use memory storage with multer
const upload = multer({ storage });

const streamifier = require("streamifier");
const twilio = require("twilio");

// twillio
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const addBorrow = async (req, res) => {
  try {
    const {
      borrowerName,
      borrowerMobile,
      borrowerAddress,
      loans,
      imagePublicId,
      imageUrl,
    } = req.body;
    const userId = req.userID;

    // console.log("Received data:", req.body); // Log the received data to verify imagePublicId and imageUrl

    // Parse loans
    let parsedLoans;
    try {
      parsedLoans = typeof loans === "string" ? JSON.parse(loans) : loans;
    } catch (error) {
      return res.status(400).json({ msg: "Invalid loans format" });
    }

    if (!Array.isArray(parsedLoans) || parsedLoans.length === 0) {
      return res.status(400).json({ msg: "Loans must be a non-empty array" });
    }

    const { loanAmount, interestRate, loanDate } = parsedLoans[0];
    const parsedLoanAmount = parseFloat(loanAmount.trim());
    const parsedInterestRate = parseFloat(interestRate.trim());

    // console.log("Parsed loan details:", { loanAmount: parsedLoanAmount, interestRate: parsedInterestRate, loanDate });

    // Ensure imageUrl is populated
    let imageData = null;
    if (imagePublicId && imageUrl) {
      imageData = { public_id: imagePublicId, url: imageUrl };
      // console.log("Image data to save:", imageData); // Log image data for debugging
    } else {
      // console.log("No image publicId or imageUrl provided"); // Log if image data is missing
    }

    let borrower = await BorrowerModel.findOne({
      borrowerName,
      borrowerMobile,
      userId,
    });

    if (borrower) {
      // console.log("Borrower found:", borrower); // Log if borrower exists
      borrower.loans.push({
        loanAmount: parsedLoanAmount,
        loanDate,
        interestRate: parsedInterestRate,
      });

      if (imageData) {
        borrower.imageUrl = imageData; // Save the image data correctly
        // console.log("Updated borrower with new imageUrl:", borrower.imageUrl); // Log updated imageUrl
      }
    } else {
      borrower = new BorrowerModel({
        borrowerName,
        borrowerMobile,
        borrowerAddress,
        loans: [
          {
            loanAmount: parsedLoanAmount,
            loanDate,
            interestRate: parsedInterestRate,
          },
        ],
        userId,
        imageUrl: imageData, // Save the image data correctly
      });
      // console.log("New borrower created:", borrower); // Log new borrower creation
    }

    await borrower.save();
    // Send SMS to the borrower
    const formattedMobile = borrowerMobile.startsWith("+")
      ? borrowerMobile
      : `+91${borrowerMobile}`;
    const formattedLoanAmount = parsedLoanAmount.toLocaleString("en-IN");
    try {
      const message = await client.messages.create({
        body: `Hi ${borrowerName}, your loan of ${formattedLoanAmount} with an interest rate of ${parsedInterestRate}% per month has been added successfully on ${loanDate}. Thank you for using our service!`,
        from: "+12564884387",
        to: formattedMobile,
      });

      console.log("SMS sent successfully:", message.sid);
    } catch (smsError) {
      console.error("Error sending SMS:", smsError.message);
    }

    // console.log("Borrower saved with image URL:", borrower.imageUrl); // Log borrower save confirmation

    res.status(201).json({
      msg: "Borrower details added successfully",
      borrowerId: borrower._id.toString(),
    });
  } catch (error) {
    // console.error(`Error adding borrower: ${error.message}`); // Log detailed error message
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
    // console.error(`Error deleting borrower: ${error.message}`);
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

    // const baseUrl = `${req.protocol}://${req.get("host")}/public/images/Borrowers_Img/`;

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

      // // Ensure imageUrl is a file name, not a full URL
      // if (borrower.imageUrl) {
      //   const filename = borrower.imageUrl.split('/').pop();
      //   borrower.imageUrl = baseUrl + filename;
      // } else {
      //   borrower.imageUrl = null; // Or set a default image path if needed
      // }
      // Use the Cloudinary URL if available
      borrower.imageUrl = borrower.imageUrl ? borrower.imageUrl.url : null;

      return borrower;
    });

    return res.status(200).json({ borrowers });
  } catch (error) {
    // console.error(`Error fetching borrowers: ${error}`);
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
    // console.error(`Error updating borrower: ${error.message}`);
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

    // console.log("Update result:", result);

    if (result.modifiedCount === 0) {
      return res.status(404).json({ msg: "Loan not found or no changes made" });
    }

    res
      .status(200)
      .json({ msg: "Borrower's loan details updated successfully" });
  } catch (error) {
    // console.error(`Error updating borrower's loan: ${error.message}`);
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
