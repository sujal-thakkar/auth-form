import { Router } from "express";

import { upload } from "../../../config/multerConfig.js";
import { registerUser, loginUser, forgotPasswordEmail, resetPasswordEmail, verifyEmail,Logout} from "../controller/authController.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validation/authValidation.js";
import {  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getPostsByUser,
  handleSocialLogin} from '../controller/authController.js'
import { isAuthenticated } from "../../../middileware/isAuthenticated.js";
import passport from "passport";

const router = Router();


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

router.post(
  "/register",
  upload.single("profilePic"),
  validate(registerSchema),
  registerUser
);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPasswordEmail);
router.route("/reset-password/:token").post(validate(resetPasswordSchema),resetPasswordEmail);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/logout").post(Logout);
router.route("/post/:id").get(isAuthenticated,getPostById)
router.route('/create-post').post(isAuthenticated,createPost)
router.route('/update-post').post(isAuthenticated,updatePost)
router.route('/delete-post/:id').delete(isAuthenticated,deletePost)
router.route('/toggle-like/:id').post(isAuthenticated,toggleLike)
router.route('/toggle-save/:id').post(isAuthenticated,toggleSave)
router.route('/posts-by-user/:userId').get(isAuthenticated,getPostsByUser)
router.route('/posts').get(isAuthenticated,getAllPosts)
// Protected route example
router.route("/protected").get(isAuthenticated, (req, res) => {
  res.status(200).json(req.user.email);
});

export default router;
