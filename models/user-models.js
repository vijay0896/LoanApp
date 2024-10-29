const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      phone: {
        type: Number,
        unique: true,
        required: true,
      },
      password: {
        type: String,
        required: true,
      },
      code: { type: String, required: true },
      verified: { type: Boolean, required: true },
      resettoken: { type: String, required: false },
      resettokenExpiration: { type: Date, required: false }
      
    },
    { timestamps: true }
  );
/// secrue password with bcrypt

userSchema.pre("save", async function (next) {
    // console.log(this)
    const user = this;
    if (!user.isModified("password")) {
      next();
    }
  
    try {
      const saltRound = await bcrypt.genSalt(10);
      const hash_password = await bcrypt.hash(user.password, saltRound);
      user.password = hash_password;
    } catch (error) {
      next(error);
    }
  });
  
  // jwt token
  
  userSchema.methods.generateToken = async function () {
    try {
      return jwt.sign(
        {
          userId: this._id.toString(),
          email: this.email,
          
        },
        "secret",
      
      );
    } catch (error) {
      console.error(error);
    }
  };
  // define the model or the collection name
  const User = mongoose.model("User", userSchema);

  module.exports = User;

//   // Sign-in schema for password reset and email verification
// const signinSchema = new mongoose.Schema({
//   email: { type: String, required: true },
//   password: { type: String, required: true },
//   code: { type: String, required: true },
//   verified: { type: Boolean, required: true },
//   resettoken: { type: String, required: false },
//   resettokenExpiration: { type: Date, required: false }
// });

// const SIGNIN = mongoose.model("SIGNIN", signinSchema);

// const mySchemas = {
//   SIGNIN: SIGNIN,
// };

