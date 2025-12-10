import User from "../../models/userSchema.js";
import { securePassword } from "../../helpers/verify.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";
import { generateOtp, sendVerificationEmail } from "../../helpers/verify.js";

dotenv.config();

export const notfound = async (req, res) => {
  try {
    res.render("notFound");
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const getSignup = async (req, res) => {
  try {
    const message = req.session.message || null;
    req.session.message = null;
    return res.render("signup", { message });
  } catch (error) {
    res.status(500).render("notFound");
  }
};

export const getLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      const message = req.session.message || null;
      req.session.message = null;
      res.render("login", { message });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/notfound");
    res.status(500);
  }
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: false, email: email });

    if (!findUser) {
      req.session.message = "User not found";
      return res.redirect("/login");
    }
    if (findUser.isBlocked) {
      req.session.message = "User is Blocked by Admin";
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      req.session.message = "Invalide Credentials";
      return res.redirect("/login");
    }
    if (passwordMatch) {
      req.session.user = { _id: findUser._id };
      res.redirect("/");
    }
  } catch (error) {
    req.session.message = "Please try again";
    res.redirect("/login");
  }
};

export const postSignup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, referralCode } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.session.message = "All fields are required";
      return res.redirect("/signup");
    }
    if (password !== confirmPassword) {
      req.session.message = "Passwords do not Match";
      return res.redirect("/signup");
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      req.session.message = "User with this email already exits";
      return res.redirect("/signup");
    }
    let referredUser = null;
    if (referralCode && referralCode.trim() !== "") {
      referredUser = await User.findOne({ referralCode: referralCode.trim() });

      if (!referredUser) {
        req.session.message = "Invalid referral code";
        return res.redirect("/signup");
      }

      if (referredUser.email === email) {
        req.session.message = "You cannot use your own referral code";
        return res.redirect("/signup");
      }
    }

    const otp = generateOtp();

    const emailSent = sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json("Email-error");
    }

    (req.session.userOtp = otp),
      (req.session.userData = {
        name,
        email,
        password,
        referredBy: referredUser ? referredUser.referralCode : null,
      });

    res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
    console.log("otp sent", otp);
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const otpVerify = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const newUser = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
        referredBy: user.referredBy || null,
      });
      await newUser.save();

      if (user.referredBy) {
        const inviter = await User.findOne({ referralCode: user.referredBy });

        if (inviter) {
          const couponCode =
            "CPN" + Math.random().toString(36).substring(2, 10).toUpperCase();

         
          await Coupon.create({
            code: couponCode,
            discount: 10,
            userId: inviter._id,
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
          });

          inviter.referralRewards.push({ couponCode });
          await inviter.save();
        }
      }

      req.session.user = { _id: newUser._id };

      req.session.userOtp = null;
      req.session.userData = null;

      return res.json({
        success: true,
        message: "OTP verified successfully",
        redirect: "/",
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    res.json({ success: false, message: "Internal server error" });
  }
};

export const verifyLoad = async (req, res) => {
  const { forgot, email } = req.query;
  res.render("verify-otp", {
    email,
    fromForgotPassword: forgot === "true",
  });
};
export const otpResend = async (req, res) => {
  try {
    const { name, email } = req.session.userData || req.body;

    const otp = generateOtp();
    console.log("Resent OTP:", otp);

    req.session.userOtp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    sendVerificationEmail(name, email, otp)
      .then(() => console.log("OTP email sent"))
      .catch((err) => console.error("OTP email error:", err));

    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
};

export const authGoogle = async (req, res) => {
  passport.authenticate("google", { failureRedirect: "/signup" })(
    req,
    res,
    () => {
      req.session.user = { _id: req.user._id };
      res.redirect("/");
    }
  );
};

export const profileLoad = async (req, res) => {
  try {
    const message = req.session.message;
    const status = req.session.status;
    const userId = req.session?.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }
    const userData = await User.findById(userId).lean();
    req.session.message = null;
    req.session.status = null;
    res.render("profile", { user: userData, message, status });
  } catch (error) {
    res.render("notFound");
  }
};

export const logoutLoad = async (req, res) => {
  try {
    delete req.session.user;
    return res.redirect("/");
  } catch (error) {
    res.redirect("/notfound");
  }
};
