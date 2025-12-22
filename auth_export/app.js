import express from "express";

import cors from "cors";
import dotenv from "dotenv";
import logger from "./utils/logger.js";
import mongodbConnect from "./config/Database-Connection.js";
import authRoutes from './services/auth/routes/authRoutes.js';
import errorHandler from "./middileware/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import passport from "passport";
import "./config/passport.js";
dotenv.config();
const app = express();
// Only connect to MongoDB if a URI is provided
if (process.env.mongodbURI) {
  mongodbConnect();
} else {
  logger.warn("No MongoDB URI found in .env. Skipping database connection.");
}

// const allowedOrigin = process.env.CORS_ORIGIN || "http://127.0.0.1:5500" || 'http://localhost';

app.use(

  cors(
  //   {
  //   // origin: allowedOrigin,
  //   // credentials: true,
  //   // optionsSuccessStatus: 200, 
  // }
)
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(passport.initialize());
logger.info("App initializing...");
app.use('/api/auth', authRoutes);

// Basic Error Handling Middleware
app.use(errorHandler);

export { app };