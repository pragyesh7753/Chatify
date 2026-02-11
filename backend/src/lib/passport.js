import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserService } from "../services/user.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Strategy executing:", {
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName
        });

        // Check if user already exists
        let user = await UserService.findOne({ googleId: profile.id });

        if (user) {
          console.log("Existing Google user found:", user._id);
          // User exists, return the user
          return done(null, user);
        }

        // Check if user with this email exists (from regular signup)
        user = await UserService.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("Linking Google account to existing user:", user._id);
          // Link Google account to existing user
          await UserService.findByIdAndUpdate(user._id, {
            googleId: profile.id,
            isVerified: true,
            profilePic: (!user.profilePic && profile.photos?.[0]?.value) ? profile.photos[0].value.replace(/=s\d+-c$/, '') : user.profilePic,
          });
          const updatedUser = await UserService.findById(user._id);
          return done(null, updatedUser);
        }

        console.log("Creating new user from Google account");
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
        while (await UserService.findOne({ username })) {
          username = baseUsername + counter;
          counter++;
          if (username.length > 20) {
            username = baseUsername.substring(0, 15) + counter;
          }
        }

        const newUser = await UserService.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          fullName: fullName,
          username: username,
          profilePic: (profile.photos?.[0]?.value || `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100) + 1}.png`).replace(/=s\d+-c$/, ''),
          isVerified: true,
          isOnboarded: false,
          bio: "",
          nativeLanguage: "",
          location: "",
          password: null,
          verificationToken: null,
          verificationTokenExpires: null,
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeTokenExpires: null,
          passwordResetToken: null,
          passwordResetTokenExpires: null,
          friends: [],
        });

        // No external chat provider user creation required after migration to Socket.io
        return done(null, newUser);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error, null);
      }
    }
  )
);

export default passport;
