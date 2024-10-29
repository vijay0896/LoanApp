const express = require("express");
const router = express.Router();
const { signupSchema, loginSchema } = require("../validators/auth-validators");
const validate = require("../middlewares/validate-middleware");
const authMiddleware = require("../middlewares/auth-Middleware");
const authControllers = require("../Controllers/auth.controllers");
router.route("/").get(authControllers.Home);
router
  .route("/register")
  .post(validate(signupSchema), authControllers.Register);

router.route("/login").post(validate(loginSchema), authControllers.Login);
router.route("/user").get(authMiddleware, authControllers.User);
router.route("/resetPassword").post(authMiddleware, authControllers.ResetPassword);

module.exports = router;
