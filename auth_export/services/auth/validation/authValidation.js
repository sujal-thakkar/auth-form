import { z } from 'zod';
import { ApiError } from '../../../utils/ApiError.js';
import asyncHandler from '../../../utils/AsyncHandler.js';

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").regex(/^\+?\d{10,15}$/,
    "Phone number must include country code and contain 10-15 digits"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
const otpVerifySchema = z.object({
  otp: z.string().min(1, "OTP is required")  // ensures otp is a non-empty string
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const validate = (schema) => asyncHandler(async (req, res, next) => {
  try {
    const body = { ...req.body }; // <-- convert to normal object
    console.log(body)
    await schema.parseAsync(body);
    next();
  } catch (error) {
    if (error.name === "ZodError") {
      const errors = error.issues.map((issue) => issue.message);
      return next(new ApiError(400, "Validation failed", errors));
    }
    return next(error);
  }
});


export {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpVerifySchema
};
