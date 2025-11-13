import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";
import session from "express-session";
import { generateOtp, sendVerificationEmail } from "../../helpers/verify.js";

export const getForgotPassword = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {}
};

export const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body); //Logger

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.json({ message: "This user NOt exist" });
    }
    const name = findUser.name;
    console.log(findUser); //logger
    console.log(findUser.name); //logger

    const otp = generateOtp();
    console.log(otp); //logger

    const emailSent = await sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json("Email-error");
    }
    req.session.userOtp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    req.session.userData = { email };

    res.redirect(`/verify-otp?forgot=true&email=${encodeURIComponent(email)}`);
    console.log("otp sent", otp);
  } catch (error) {
    console.log("Reset Password Error", error);
  }
};

export const forgotVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const storedOtp = req.session.userOtp;

    if (!storedOtp || Date.now() > storedOtp.expiresAt) {
      req.session.userOtp = null; // clear expired OTP
      return res.render("verify-otp", {
        message: "OTP expired. Please request a new one.",
      });
    }

    console.log(req.body); //logger

    if (otp === storedOtp.code) {
      const email = req.session.userData.email;
      req.session.userOtp = null;
      req.session.userData = null;

      return res.json({
        success: true,
        message: "OTP verified successfully!",
        redirect: `/reset-password?email=${encodeURIComponent(email)}`,
      });
    } else {
      return res.render("verify-otp", {
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    res.render("verify-otp", { message: "Something went wrong." });
  }
};

export const getResetPassword = async (req, res) => {
  try {
    const {email} = req.query;
    if (!email) return res.redirect("/forgot-password");
    res.render("reset-password", { email });
  } catch (error) {}
};


export const postResetPassword = async (req, res) => {
  try {
    const { email , newPassword, confirmPassword } = req.body;
    console.log(req.body); //logger
 

    if (newPassword !== confirmPassword) {
      return res.render("reset-password", {
        message: "Passwords do not match.",
        email,
      });
    }

    if (newPassword.length < 6) {
      return res.render("reset-password", {
        message: "Password must be at least 6 characters long.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne( {email}, { password: hashedPassword });
    console.log(result); //loggger

    if (result.modifiedCount === 0) {
      return res.render("reset-password", { message: "User not found." });
    }

    req.session.userEmail = null;
    req.session.userOtp = null;
    req.session.userData = null;

    return res.redirect("/login");
  } catch (error) {
    console.log("Reset password error:", error);
    res.render("reset-password", { message: "Something went wrong."});
  }
};
