import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

export function configurePassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return passport;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("google account email missing"), null);
          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              email,
              name: profile.displayName || email.split("@")[0],
              username: `${email.split("@")[0]}_${Date.now().toString().slice(-5)}`.toLowerCase(),
              isEmailVerified: true
            });
          }
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  return passport;
}

export default passport;
