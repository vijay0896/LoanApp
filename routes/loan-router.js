const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-Middleware");
const loanControllers = require("../Controllers/loan.controllers");
router.route("/addEntry").post(authMiddleware, loanControllers.addBorrow );
router.route("/getBorrowers").get(authMiddleware, loanControllers.getBorrowers );
module.exports = router;
