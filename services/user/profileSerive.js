import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";
import session from "express-session";
import {
  generateOtp,
  securePassword,
  sendVerificationEmail,
} from "../../helpers/verify.js";

export const forgotPassword = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.render("notFound");
  }
};

export const forgotEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.json({ message: "This user NOt exist" });
    }
    const name = findUser.name;

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json("Email-error");
    }
    req.session.userOtp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    req.session.userData = { email };

    res.redirect(`/verify-otp?forgot=true&email=${encodeURIComponent(email)}`);
    console.log("otp sent", otp);
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const forgotVerify = async (req, res) => {
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

export const resetPassword = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.redirect("/forgot-password");
    res.render("reset-password", { email });
  } catch (error) {
    res.render("notFound");
  }
};

export const resetPasswordPost = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

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
    const result = await User.updateOne(
      { email },
      { password: hashedPassword }
    );

    if (result.modifiedCount === 0) {
      return res.render("reset-password", { message: "User not found." });
    }

    req.session.userEmail = null;
    req.session.userOtp = null;
    req.session.userData = null;

    return res.redirect("/login");
  } catch (error) {
    res.render("reset-password", { message: "Something went wrong." });
  }
};

export const nameUpdate = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const fullName = `${firstName} ${lastName}`;
    console.log(req.session.user._id);
    console.log(req.body);
    await User.findByIdAndUpdate(
      req.session.user._id,
      { name: fullName },
      { new: true }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false });
  }
};

export const phoneUpdate = async (req, res) => {
  try {
    const { phone } = req.body;

    await User.findByIdAndUpdate(
      req.session.user._id,
      { phone },
      { new: true }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: "Server error" });
  }
};

export const emailUpdate = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already in use" });
    }

    const otp = generateOtp();
    const name = req.session.user.name;

    const emailSent = await sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json({
        success: false,
        message: "Cannot send email right now",
      });
    }

    console.log("OTP sent:", otp);

    req.session.emailOtp = otp;
    req.session.newEmail = email;

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Server error" });
  }
};

export const verifyEmailUpdate = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp !== req.session.emailOtp) {
      return res.json({ success: false, message: "Incorrect OTP" });
    }

    const newEmail = req.session.newEmail;

    await User.findByIdAndUpdate(req.session.user._id, { email: newEmail });

    req.session.emailOtp = null;
    req.session.newEmail = null;

    return res.json({ success: true, message: "Email updated successfully" });
  } catch (error) {
    return res.json({ success: false, message: "Server error" });
  }
};


export const passwordSet = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.find({ email });
    if (!findUser) {
      return res.json({ success: false, message: "Invalid Email ID" });
    }
    const name = findUser.name;
    const password = findUser.password;
    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json({ success: false, message: "Can't sent Email Now" });
    }
    console.log("otp send :", otp);
    req.session.userOtp = otp;
    req.session.userData = { name, email, password };
    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: "Server Error" });
  }
};

export const passwordVerify = async (req, res) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    if (otp !== req.session.userOtp) {
      return res.json({ success: false, message: "Incorrect OTP" });
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const hashedPassword = await securePassword(password);

    user.password = hashedPassword;
    await user.save();

    req.session.userOtp = null;

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Server error" });
  }
};

export const passwordChange = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.session.user._id);

    if (!user.password) {
      return res.json({
        success: false,
        message: "No password set for this account",
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.json({
        success: false,
        message: "Incorrect current password",
      });
    }

    const hashed = await securePassword(newPassword);

    await User.findByIdAndUpdate(user._id, { password: hashed });

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: "Server Error" });
  }
};
