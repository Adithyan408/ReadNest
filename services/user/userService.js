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
    res.status(500).send("Server Error");
  }
};

export const postLogin = async(req, res) => {
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
} 

export const postSignup = async(req, res) => {
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
    
        const emailSent = await sendVerificationEmail(name, email, otp);
        if (!emailSent) {
          return res.json("Email-error");
        }
    
        (req.session.userOtp = otp),
          (req.session.userData = { name, email, password });
    
        res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
        console.log("otp sent", otp);
      } catch (error) {
        res.redirect("/notfound");
      }
}



export const otpVerify = async(req, res) => {
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
}

export const verifyLoad = async(req, res) => {
    const { forgot, email } = req.query;
      res.render("verify-otp", {
        email,
        fromForgotPassword: forgot === "true",
      });
}

export const otpResend = async(req, res) => {
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
        res.json({ success: false, message: "Server error" });
      }
}

export const authGoogle = async(req, res) => {
    passport.authenticate("google", { failureRedirect: "/signup" })(
        req,
        res,
        () => {
          req.session.user = { _id: req.user._id };
          res.redirect("/");
        }
      );
}

export const profileLoad = async(req, res) => {
    try {
        const userId = req.session?.user?._id;
        if (!userId) {
          return res.redirect("/login");
        }
        const userData = await User.findById(userId).lean();
        res.render("profile", { user: userData });
      } catch (error) {
        res.render("notFound");
      }
}

export const logoutLoad = async(req, res) => {
     try {
    delete req.session.user;   
    return res.redirect("/");
  } catch (error) {
    res.redirect("/notfound");
  }
}