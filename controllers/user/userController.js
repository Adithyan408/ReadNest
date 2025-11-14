import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";
import { generateOtp, sendVerificationEmail } from "../../helpers/verify.js";
import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";
dotenv.config();

export const loadHome = async (req, res) => {
  try {
    const user = req.session.user;

    // ----------------------------
    // GET FILTERS
    // ----------------------------
    const category = req.query.category || null;
    const min = req.query.min || null;
    const max = req.query.max || null;

    let selectedLanguages = [];

    if (req.query.languages) {
      if (Array.isArray(req.query.languages)) {
        selectedLanguages = req.query.languages; // languages=English&languages=Tamil
      } else {
        selectedLanguages = req.query.languages.split(","); // languages=English,Tamil
      }
    }

    let filter = { isListed: true };

    if (category) filter.category = category;

    if (min || max) {
      filter.regularPrice = {};
      if (min) filter.regularPrice.$gte = parseInt(min);
      if (max) filter.regularPrice.$lte = parseInt(max);
    }

    if (selectedLanguages.length > 0) {
      filter.language = { $in: selectedLanguages };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);


    let userData = null;
    if (user) {
      userData = await User.findById(user._id);
    }

    const categories = await Category.find({ isListed: true });
    const languages = await Product.distinct("language", { isListed: true });

    const queryParams = new URLSearchParams();

    if (category) queryParams.set("category", category);
    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);

    selectedLanguages.forEach((lang) => queryParams.append("languages", lang));

    const baseQuery = queryParams.toString(); 
   -
    res.render("home", {
      user: userData,
      products,
      totalPages,
      currentPage: page,

      categories,
      selectedCategory: category,

      selectedLanguages,
      languages,

      min,
      max,
      baseQuery
    });
  } catch (error) {
    console.log("Home page not Found", error);
    res.status(500).send("Server Error");
  }
};


export const loadNotFound = async (req, res) => {
  try {
    res.render("notFound");
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const loadSigup = async (req, res) => {
  try {
    const message = req.session.message || null;
    req.session.message = null;
    return res.render("signup", { message });
  } catch (error) {
    console.log("Signup page not loading");
    res.status(500).send("Server Error");
  }
};

export const loadLogin = async (req, res) => {
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
    res.status(500).send("Server Error");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: false, email: email });
    console.log("Find User: ", findUser); //logger

    if (!findUser) {
      req.session.message = "User not found";
      return res.redirect("/login");
    }
    if (findUser.isBlocked) {
      req.session.message = "User is Blocked by Admin";
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    console.log("Bcrypt: ", passwordMatch); //logger
    if (!passwordMatch) {
      req.session.message = "Invalide Credentials";
      return res.redirect("/login");
    }
    if (passwordMatch) {
      req.session.user = { _id: findUser._id };
      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
    req.session.message = "Please try again";
    res.redirect("/login");
  }
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      req.session.message = "Passwords do not Match";
      return res.redirect("/signup");
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      req.session.message = "User with this email already exits";
      return res.redirect("/signup");
    }

    const otp = generateOtp();
    console.log("Generated Otp:", otp);

    const emailSent = await sendVerificationEmail(name, email, otp);
    if (!emailSent) {
      return res.json("Email-error");
    }

    (req.session.userOtp = otp),
      (req.session.userData = { name, email, password });

    res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
    console.log("otp sent", otp);
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/notfound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const newUser = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
      });
      await newUser.save();
      req.session.user = { _id: newUser._id };

      // Clear OTP and temp data
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
    console.error("OTP verification error:", error);
    res.json({ success: false, message: "Internal server error" });
  }
};

export const loadVerify = async (req, res) => {
  const { forgot, email } = req.query;
  res.render("verify-otp", {
    email,
    fromForgotPassword: forgot === "true",
  });
};

export const resendOtp = async (req, res) => {
  try {
    const { name, email } = req.session.userData || req.body;

    console.log("Resend OTP request received for:", email);

    const otp = generateOtp();
    console.log("Resent otp: ", otp);
    const emailSent = await sendVerificationEmail(name, email, otp);

    if (!emailSent) {
      return res.json({ success: false, message: "Failed to send email" });
    }

    req.session.userOtp = otp;
    res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.json({ success: false, message: "Server error" });
  }
};

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleAuthCallback = (req, res) => {
  passport.authenticate("google", { failureRedirect: "/signup" })(
    req,
    res,
    () => {
      req.session.user = { _id: req.user._id };
      res.redirect("/");
    }
  );
};

export const loadProfile = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId).lean();
    res.render("profile", { user: userData });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Server Error");
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session Destruction error: ", err.message);
        return res.redirect("/notfound");
      }
      return res.redirect("/");
    });
  } catch (error) {
    console.log("Log out error", error);
    res.redirect("/notfound");
  }
};
