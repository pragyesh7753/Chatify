import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import { upsertStreamUser } from "./stream.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, return the user
          return done(null, user);
        }

        // Check if user with this email exists (from regular signup)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.isVerified = true; // Google accounts are pre-verified
          if (!user.profilePic && profile.photos?.[0]?.value) {
            user.profilePic = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        
        // Generate a unique username based on the full name
        let baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseUsername.length < 3) {
          baseUsername = 'user' + Math.floor(Math.random() * 10000);
        }
        if (baseUsername.length > 15) {
          baseUsername = baseUsername.substring(0, 15);
        }

        let username = baseUsername;
        let counter = 1;
        
        // Ensure username is unique
        while (await User.findOne({ username })) {
          username = baseUsername + counter;
          counter++;
          if (username.length > 20) {
            username = baseUsername.substring(0, 15) + counter;
          }
        }

        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          fullName: fullName,
          username: username,
          profilePic: profile.photos?.[0]?.value || `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100) + 1}.png`,
          isVerified: true, // Google accounts are pre-verified
          isOnboarded: false, // They still need to complete onboarding
        });

        // Create Stream user for OAuth users
        try {
          await upsertStreamUser({
            id: newUser._id.toString(),
            name: newUser.fullName,
            image: newUser.profilePic,
          });
        } catch (streamError) {
          console.error("Failed to create Stream user for OAuth user:", streamError);
          // Continue anyway - they can use regular chat features
        }

        return done(null, newUser);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
