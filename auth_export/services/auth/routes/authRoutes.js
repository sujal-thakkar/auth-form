import { Router } from "express";
import { registerUser, loginUser, forgotPassword, resetPassword, verifyEmail,Logout ,verifyOtp } from "../controller/authController.js";
import { verifyJWT } from "../../../middileware/isAuthenticated.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema ,otpVerifySchema } from "../validation/authValidation.js";
import emailVerify from '../../../utils/services/emailVerify.js';
import { isAuthenticated } from "../../../middileware/isAuthenticated.js";
const router = Router();
router.route("/register").post(validate(registerSchema),registerUser);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password/:token").post(validate(resetPasswordSchema),resetPassword);
router.route("/verify-OTP").post(validate(otpVerifySchema), verifyOtp)
router.route("/verify-email").get(isAuthenticated,emailVerify)
router.route("/verify-email/:token").get(verifyEmail);
router.route("/logout").post(Logout);
// Protected route example
router.route("/protected").get(verifyJWT, (req, res) => {
  res.status(200).json(req.user.email);
});

export default router;
