import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";
import session from "express-session";
import { generateOtp, sendVerificationEmail } from "../../helpers/verify.js";

export const forgotPassword = async(req, res) => {
     try {
      const { error } = req.query;
    res.render("forgot-password", {
      error 
    });
  } catch (error) {
    res.render("notFound");
  }
}

export const forgotEmail = async(req, res) => {
    try {
        const { email } = req.body;
    
        const findUser = await User.findOne({ email });
        if (!findUser) {
          return res.redirect(`/forgot-password?error=User does not exist`);
        }
        const name = findUser.name;
    
        const otp = generateOtp();
    
        const emailSent =  sendVerificationEmail(name, email, otp);
        if (!emailSent) {
         return res.render("forgot-password", { message: "Can't send Email , Try after some time" });
        }
        req.session.userOtp = {
          code: otp,
          expiresAt: Date.now() + 5 * 60 * 1000, 
        };
        req.session.userData = { email };
    
        res.redirect(`/verify-otp?forgot=true&email=${encodeURIComponent(email)}`);
        // return res.redirect(`/verify-otp?forgot=true&email=${email}`);
        console.log("otp sent", otp);
      } catch (error) {
        res.redirect("/notfound")
      }
}

export const forgotVerify = async(req, res) => {
    try {
    const { otp } = req.body;
    const storedOtp = req.session.userOtp;

    if (!storedOtp || Date.now() > storedOtp.expiresAt) {
      req.session.userOtp = null; 
      return res.render("verify-otp", {
        message: "OTP expired. Please request a new one.",
      });
    }


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
    res.render("verify-otp", { message: "Something went wrong." });
  }
};

export const resetPassword = async(req, res) => {
    try {
        const {email} = req.query;
        if (!email) return res.redirect("/forgot-password");
        res.render("reset-password", { email });
      } catch (error) {
        res.render("notFound");
      }
}

export const resetPasswordPost = async(req, res) => {
    try {
    const { email , newPassword, confirmPassword } = req.body;
    
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

    if (result.modifiedCount === 0) {
      return res.render("reset-password", { message: "User not found." });
    }

    req.session.userEmail = null;
    req.session.userOtp = null;
    req.session.userData = null;

    return res.redirect("/login");
  } catch (error) {
    res.render("reset-password", { message: "Something went wrong."});
  }
}