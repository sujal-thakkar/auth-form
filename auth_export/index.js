const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const JWT_SECRET = "hoslaaa";
const JWT_USER_SECRET = 'hosla-user';
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const crypto = require('crypto');

app.use(express.json());


const otpStore = new Map();

// 1. Registration with OTP API
app.post("/register", async function (req, res) {
    const { phone, password } = req.body;

    // Input validation
    if (!phone || !password) {
        return res.status(400).json({
            message: "Phone number and password are required"
        });
    }

    try {
        // Check if user already exists
        const existingUser = await UserModel.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this phone number already exists"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP (6-digit)
        const otp = crypto.randomInt(100000, 999999).toString();
        
        // Set OTP expiry (10 minutes from now)
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Store in temporary storage (or save to database)
        otpStore.set(phone, {
            otp: otp,
            otpExpiry: otpExpiry,
            password: hashedPassword
        });

        // Set expiry for OTP store (auto-cleanup)
        setTimeout(() => {
            otpStore.delete(phone);
        }, 10 * 60 * 1000);

        // In real implementation, send OTP via SMS service
        console.log(`OTP for ${phone}: ${otp}`); // Remove this in production

        res.json({
            success: true,
            message: "OTP sent successfully",
            phone: phone,
            note: "OTP is valid for 10 minutes"
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// 2. Verify OTP and Complete Registration
app.post("/verify-otp", async function (req, res) {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({
            message: "Phone number and OTP are required"
        });
    }

    try {
        // Get OTP data from store
        const otpData = otpStore.get(phone);
        
        if (!otpData) {
            return res.status(400).json({
                message: "OTP expired or invalid phone number"
            });
        }

        // Check OTP expiry
        if (new Date() > otpData.otpExpiry) {
            otpStore.delete(phone);
            return res.status(400).json({
                message: "OTP has expired"
            });
        }

        // Verify OTP
        if (otpData.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        // Create user in database
        const newUser = await UserModel.create({
            phone: phone,
            password: otpData.password,
            isVerified: true
        });

        // Generate JWT token
        const token = jwt.sign({
            id: newUser._id,
            phone: newUser.phone,
            isProfileComplete: newUser.isProfileComplete
        }, JWT_SECRET, { expiresIn: '30d' });

        // Clean up OTP store
        otpStore.delete(phone);

        res.json({
            success: true,
            message: "Registration successful",
            token: token,
            userId: newUser._id,
            isProfileComplete: newUser.isProfileComplete
        });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// 3. Create/Update Profile API
app.post("/create-profile", async function (req, res) {
    const { name, gender, profilePic, bio, age } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // Input validation
    if (!name || !gender || !age) {
        return res.status(400).json({
            message: "Name, gender, and age are required"
        });
    }

    if (!token) {
        return res.status(401).json({
            message: "Authentication token is required"
        });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        // Update user profile
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            {
                name: name,
                gender: gender,
                profilePic: profilePic || "",
                bio: bio || "",
                age: age,
                isProfileComplete: true
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Generate new token with updated profile status
        const newToken = jwt.sign({
            id: updatedUser._id,
            phone: updatedUser.phone,
            isProfileComplete: updatedUser.isProfileComplete
        }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: "Profile created successfully",
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                gender: updatedUser.gender,
                profilePic: updatedUser.profilePic,
                bio: updatedUser.bio,
                age: updatedUser.age,
                isProfileComplete: updatedUser.isProfileComplete
            },
            token: newToken
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Invalid token"
            });
        }
        console.error("Profile creation error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Your existing APIs (fixed version)
app.post("/signup", async function (req, res) {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await UserModel.create({
            email: email,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            name: `${firstName} ${lastName}`
        });

        res.json({
            success: true,
            message: "Signup successful",
            userId: newUser._id
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

app.post("/signin", async function (req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign({
            id: user._id,
            email: user.email,
            isProfileComplete: user.isProfileComplete
        }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token: token,
            isProfileComplete: user.isProfileComplete,
            userId: user._id
        });

    } catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});