import { ApiError } from "../../../utils/ApiError.js";
import { apiResponce } from "../../../utils/ApiResponseHandler.js";
import asyncHandler from "../../../utils/AsyncHandler.js";
import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PendingUser from '../models/pendingUser.js';
import {sendOTP, generateOTP} from '../../../utils/services/phoneOtp.js';
import { uploadToCloudinary } from "../../../utils/services/upload.service.js";
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password,phone } = req.body;

  if (!name || !email || !password || !phone) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ phone});
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }
  const pendingUser = await PendingUser.findOne({ phone });
  if (pendingUser) {
    await PendingUser.deleteOne({ _id: pendingUser._id });
  }
  const pending = await PendingUser.create({ name, email, password,phone });
  const otp=generateOTP();
  pending.verificationToken = otp;
  pending.verificationTokenExpires = new Date(Date.now()+10*60*1000);
if (req.file) {
  pending.profilePic = req.file.path;
}
await pending.save();
  await pending.save();
  sendOTP(phone ,otp);
  return apiResponce(200,"please verify your phone number");
});

const loginUser = asyncHandler(async (req, res) => {
  const {phone, password } = req.body;

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
    new apiResponce(200,"User logged in successfully")
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
  const pending= await PendingUser.create({
    email: user.email,
    verificationToken:hashedResetToken,
    verificationTokenExpires:new Date(Date.now() + 3600000)
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
    verificationTokenExpires: { $gt: new Date() },  });

  if (!pending) {
    throw new ApiError(400, "Email verification token is invalid or has expired");
  }
  await PendingUser.deleteOne({ _id: pending._id });
  return apiResponce(200,"email verified successfully");

});

const verifyOtp = asyncHandler(async(req,res)=>{
  const otp=req.body.otp;
  if(!otp){
    throw new ApiError(400,"otp required");
  }
  const pending = await PendingUser.findOne({
    verificationToken: otp,
    verificationTokenExpires: { $gt: new Date() },  });

  if (!pending) {
    throw new ApiError(400, "OTP verification token is invalid or has expired");
  }
  let profilePicUrl = "";
  if (pending.profilePic) {
    profilePicUrl = await uploadToCloudinary(pending.profilePic);
  }
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
  return apiResponce(200,userData,"Email verified successfully");
   
})

const resetPasswordEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const {password}= req.body;
  if(!password){
    throw new ApiError(400,"password is required");
  }
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const pending=await PendingUser.findOne({
    
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
  user.tokenVersion +=1;
  await user.save({ validateBeforeSave: false });
  await PendingUser.deleteOne({ _id: pending._id });
  if (req.cookies?.authToken) {
    res.clearCookie('authToken', {
     httpOnly: true,
     secure: true,
     path:'/',
     sameSite: 'lax',
   });
  }
  return res.status(200).json(
    new apiResponce(200,"password reset successfull")
  )

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
  return apiResponce(200, phone, "OTP sent to your phone");
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
    new apiResponce(200, "password reset successfull")
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


export {
  registerUser,
  loginUser,
  forgotPasswordEmail,
  verifyEmail,
  resetPasswordEmail,
  Logout,
  verifyOtp,
  forgotPasswordOTP,
  resetPasswordOTP
};