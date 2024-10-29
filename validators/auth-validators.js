const { z } = require("zod");
// creating an object  schema
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email format" }),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(50, { message: "Password must not exceed 50 characters" }),
});
// Creating an object schema with refined validation
const signupSchema = loginSchema.extend({
  username: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(30, { message: "Name must not exceed 30 characters" }),

 
  phone: z
    .string({ required_error: "Phone number is required" })
    .regex(/^\d{10}$/, { message: "Phone number must be 10 digits long" }),

  
});

module.exports ={ signupSchema, loginSchema};
