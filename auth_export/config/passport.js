import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../services/auth/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                return done(null, user);
            }

            // Check if user exists with same email
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                // Link google account
                user.googleId = profile.id;
                if (!user.profilePic) user.profilePic = profile.photos[0].value;
                await user.save();
                return done(null, user);
            }

            // Create new user
            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                profilePic: profile.photos[0].value,
                isVerified: true // Social login is verified by default
            });

            done(null, user);
        } catch (err) {
            done(err, null);
        }
    }
));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'email']
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ facebookId: profile.id });

            if (user) {
                return done(null, user);
            }

            // Facebook might not return email
            const email = profile.emails ? profile.emails[0].value : null;

            if (email) {
                user = await User.findOne({ email: email });
                if (user) {
                    user.facebookId = profile.id;
                    if (!user.profilePic) user.profilePic = profile.photos[0].value;
                    await user.save();
                    return done(null, user);
                }
            }

            user = await User.create({
                name: profile.displayName,
                email: email || `facebook_${profile.id}@example.com`, // Fallback if no email
                facebookId: profile.id,
                profilePic: profile.photos[0].value,
                isVerified: true
            });

            done(null, user);
        } catch (err) {
            done(err, null);
        }
    }
));

export default passport;
