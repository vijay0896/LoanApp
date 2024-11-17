const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-Middleware");
const loanControllers = require("../Controllers/loan.controllers");
const { upload } = require("../Controllers/loan.controllers");
router
  .route("/addEntry")
  .post(authMiddleware, upload.single("image"), loanControllers.addBorrow);

router.route("/getBorrowers").get(authMiddleware, loanControllers.getBorrowers);

router
  .route("/deleteBorrower/:borrowerId")
  .delete(authMiddleware, loanControllers.deleteBorrower);
router
  .route("/deleteBorrowerLoan/:borrowerId/loans/:loanId")
  .delete(authMiddleware, loanControllers.deleteBorrowerLoan);

router
  .route("/UpdateBorrower/:borrowerId")
  .patch(authMiddleware, loanControllers.updateBorrower);

router
  .route("/UpdateBorrowerLoan/:borrowerId/loans/:loanId")
  .patch(authMiddleware, loanControllers.updateBorrowerLoan);

module.exports = router;
