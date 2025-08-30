import PendingUser from "../../services/auth/models/pendingUser";
import { apiResponce } from "../ApiResponseHandler";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import asyncHandler from "../AsyncHandler";
const emailVerify= asyncHandler (async (req,res)=>{
  if(!req.user.email){
    return res.status(403).json(new apiResponce(403,"enter the email"))
  }
  const {email}=req.user;
  const pending = await PendingUser.create({email});
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
    new apiResponce(201,"User registered successfully. Please check your email for verification.")
  );
});
export default emailVerify;