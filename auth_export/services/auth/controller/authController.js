import { ApiError } from "../../../utils/ApiError.js";
import { apiResponce } from "../../../utils/ApiResponseHandler.js";
import asyncHandler from "../../../utils/AsyncHandler.js";
import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PendingUser from '../models/pendingUser.js';
import fs from 'fs'

import { uploadToCloudinary } from "../../../utils/services/upload.service.js";

const registerUser = asyncHandler(async (req, res) => {

  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }


  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }
  const originalUser= await User.findOne({email})
if (originalUser) {
  throw new ApiError(400, "User already exists with this email");
}  const existingUser = await PendingUser.findOne({ email });
  if (existingUser) await PendingUser.deleteOne({ _id: existingUser._id });

  const pending = new PendingUser({ name, email, password, confirmPassword,});

  if (req.file) {
    pending.profilePic = req.file.path; // <-- store temporary file path
  }

let verificationToken;
  let exists = true;
  while (exists) {
    verificationToken = crypto.randomBytes(20).toString("hex");
    exists = await PendingUser.exists({ verificationToken: verificationToken });
  }
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  pending.verificationToken = hashedToken;
  pending.verificationTokenExpires = new Date(Date.now() + 3600000);

  await pending.save({ validateBeforeSave: false });

  const verificationURL = `${process.env.URL}/api/auth/verify-email/${verificationToken}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: pending.email,
    subject: 'Email Verification',
    html: `
      <p>Please click on the following link to verify your email address:</p>
      <p><a href="${verificationURL}">${verificationURL}</a></p>
      <p>If you did not create this account, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  return res.status(201).json(
    new apiResponce(200,"User registered successfully. Please check your email for verification.")
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, "Invalid email or password");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email address to log in.");
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = user.generateAuthToken();
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 6 * 30 * 24 * 60 * 60 * 1000
  });
  return res.status(200).json(

    new apiResponce(200,user,"User logged in successfully")
  );
});

const forgotPasswordEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }

  let resetToken;
  let exists = true;

  while (exists) {
    resetToken = crypto.randomBytes(20).toString("hex");
    exists = await PendingUser.exists({ verificationToken: resetToken });
  }
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const pending = await PendingUser.create({
    email: user.email,
    verificationToken: hashedResetToken,
    verificationTokenExpires: new Date(Date.now() + 3600000)
  })


  // Create reset URL
  const resetURL = `${process.env.frontURL}/reset-password/${resetToken}`; //`https://luxe-carry.vercel.app/reset-password/${resetToken}`

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
      <p><a href="${resetURL}">${resetURL}</a></p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `,
  };

  await transporter.sendMail(mailOptions);

  return res.status(200).json(
    new apiResponce(200, {}, "Password reset link sent to your email")
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const pending = await PendingUser.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!pending) {
    throw new ApiError(400, "Email verification token is invalid or has expired");
  }
  let profilePicUrl = "";
  if (pending.profilePic) {
    profilePicUrl = await uploadToCloudinary(pending.profilePic);
  }
    fs.unlink(pending.profilePic, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });
  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    isVerified: true,
    profilePic: profilePicUrl
  });
  await PendingUser.deleteOne({ _id: pending._id });
  const userData = user.toObject();
  delete userData.password;

  return res
  .status(200)
  .json(new apiResponce(200, "Email verified successfully"));

});

const resetPasswordEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) {
    throw new ApiError(400, "password is required");
  }
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const pending = await PendingUser.findOne({

    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  })

  if (!pending) {
    throw new ApiError(400, "Password reset token is invalid or has expired");
  }

  const user = await User.findOne({ email: pending.email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = password;
  user.tokenVersion += 1;
  await user.save({ validateBeforeSave: false });
  await PendingUser.deleteOne({ _id: pending._id });
  if (req.cookies?.authToken) {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    });
  }
  return res.status(200).json(
    new apiResponce(200, {}, "password reset successful")
  );

});

const forgotPasswordOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user) throw new ApiError(404, "User not found");
  const pending = await PendingUser.findOne({ phone: phone });
  if (pending) {
    await PendingUser.deleteOne({ _id: pending._id });
  }
  const otp = generateOTP();
  const newPending = await PendingUser.create({
    phone: phone,
    verificationToken: otp,
    verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000)
  });
  user.resetOTP = otp;
  user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await user.save();
  await sendOTP(phone, otp);
  return res.status(200).json(new apiResponce(200, phone, "OTP sent to your phone"));
});
const resetPasswordOTP = asyncHandler(async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const user = await User.findOne({ phone });
  const pending = await PendingUser.findOne({ phone });
  if (!user) throw new ApiError(404, "User not found");
  if (!pending) throw new ApiError(404, "User not found or otp expired");
  if (
    pending.verificationToken !== otp ||
    pending.verificationTokenExpires < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  user.password = newPassword;
  user.tokenVersion += 1;
  await user.save({ validateBeforeSave: false });
  await PendingUser.deleteOne({ _id: pending._id });
  if (req.cookies?.authToken) {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    });
  }
  return res.status(200).json(
    new apiResponce(200, {}, "Password reset successful")
  );
});
const Logout = asyncHandler((req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'lax',
  });
  res.status(200).json({ message: "Logged out successfully" });
});

const handleSocialLogin = asyncHandler(async (req, res) => {
  const user = req.user;
  const token = user.generateAuthToken();

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 6 * 30 * 24 * 60 * 60 * 1000
  });

  // Redirect to frontend home page
  res.redirect(`${process.env.CORS_ORIGIN}/home`);
});
// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// Get single post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

// Create new post
const createPost = async (req, res) => {
  try {
    const { userId, userName, userAvatarUrl, content, imageUrl, tags } = req.body;
    
    const newPost = new Post({
      userId,
      userName,
      userAvatarUrl: userAvatarUrl || null,
      content,
      imageUrl: imageUrl || null,
      tags: tags || [],
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLiked: false,
      isSaved: false
    });
    
    const savedPost = await newPost.save();
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: savedPost
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { content, imageUrl, tags } = req.body;
    
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        content,
        imageUrl,
        tags
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    
    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    post.isLiked = !post.isLiked;
    post.likeCount = post.isLiked ? post.likeCount + 1 : post.likeCount - 1;
    
    await post.save();
    
    res.json({
      success: true,
      message: post.isLiked ? 'Post liked' : 'Post unliked',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling like',
      error: error.message
    });
  }
};

// Save/Unsave post
const toggleSave = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    post.isSaved = !post.isSaved;
    await post.save();
    
    res.json({
      success: true,
      message: post.isSaved ? 'Post saved' : 'Post unsaved',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling save',
      error: error.message
    });
  }
};

// Get posts by user
const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user posts',
      error: error.message
    });
  }
};

export {
  registerUser,
  loginUser,
  forgotPasswordEmail,
  verifyEmail,
  resetPasswordEmail,
  Logout,
  handleSocialLogin,
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getPostsByUser
};