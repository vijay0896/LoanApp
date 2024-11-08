const mongoose = require("mongoose");

const loanSchema = mongoose.Schema({
  loanAmount: {
    type: Number,
    required: true,
  },
  loanDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  }
});

const borrowerSchema = mongoose.Schema(
  {
    borrowerName: {
      type: String,
      required: true,
    },
    borrowerMobile: {
      type: Number,
      required: true,
    },
    borrowerAddress: {
      type: String,
      required: true,
    },
    loans: {
      type: [loanSchema], // Array of loanSchema objects
      required: true,
      default: [], // Default to an empty array
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl:{
      type: String,
    },
  },
  { timestamps: true }
);

const BorrowerModel = mongoose.model("Borrower", borrowerSchema);

module.exports = BorrowerModel;
