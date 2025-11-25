import { Router } from "express";
import { registerUser, loginUser, forgotPasswordEmail, resetPasswordEmail, verifyEmail, Logout, verifyOtp, forgotPasswordOTP, resetPasswordOTP, handleSocialLogin } from "../controller/authController.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, otpVerifySchema } from "../validation/authValidation.js";
import emailVerify from '../../../utils/services/emailVerify.js';
import { isAuthenticated } from "../../../middileware/isAuthenticated.js";
import passport from "passport";

const router = Router();

router.route("/register").post(validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPasswordEmail);
router.route("/reset-password/:token").post(validate(resetPasswordSchema), resetPasswordEmail);
router.route("/verify-OTP").post(validate(otpVerifySchema), verifyOtp)
router.route("/verify-email").get(isAuthenticated, emailVerify)
router.route("/verify-email/:token").get(verifyEmail);
router.post("/forgot-passwordOTP", forgotPasswordOTP);
router.post("/reset-passwordOTP", resetPasswordOTP);

router.route("/logout").post(Logout);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  handleSocialLogin
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', session: false }),
  handleSocialLogin
);

// Protected route example
router.route("/protected").get(isAuthenticated, (req, res) => {
  res.status(200).json(req.user.email);
});

export default router;
