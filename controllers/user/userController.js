import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "../../config/passport.js";

dotenv.config();

export const loadHome = async (req, res) => {
  try {
    const user = req.session.user;
    if(user){
        const userData = await User.findOne({_id:req.session.user._id});
        res.render("home", {user:userData});
    } else {
        return res.render("home", {user:null});
    }
  } catch (error) {
    console.log("Home page not Found");
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
      req.session.user ={ _id: findUser._id};
      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
    req.session.message = "Please try again";
    res.redirect("/login");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(name,email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your Account",
      text: `Your otp is ${otp}`,
      html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 40px 0; text-align: center;">
                    <div style="background-color: #ffffff; width: 90%; max-width: 500px; margin: auto; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
                        <!-- Header -->
                        <div style="background-color: #b9c3d3ff; padding: 20px;">
                            <img src="cid:logo" alt="Read Nest Logo" style="width: 100px; height: auto;">
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; text-align: center;">
                    <h2 style="color: #1e293b; margin-bottom: 10px;">Email Verification</h2>
                    <p style="color: #475569; font-size: 15px;">Dear ${name},</p>
                    <p style="color: #475569; font-size: 15px;">
                        Thank you for registering with <strong>Read Nest</strong>.<br>
                        Please use the OTP below to verify your account.
                    </p>

                    <!-- OTP Box -->
                    <div style="display: inline-block; background-color: #e2e8f0; color: #000; padding: 12px 25px; border-radius: 8px; font-size: 22px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                    ${otp}
                    </div>

                    <p style="color: #475569; font-size: 14px;">This OTP is valid for <strong>2 minutes</strong>.</p>
                    <p style="color: #94a3b8; font-size: 13px;">If you didn’t request this, please ignore this email.</p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; color: #64748b; text-align: center; padding: 15px; font-size: 13px;"> 
                    &copy; 2025 Read Nest. All rights reserved.
                </div>

            </div>
        </div>`,
      attachments: [
        {
          filename: "logo2.png",
          path: "public/images/logo2.png",
          cid: "logo",
        },
      ], 
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending Mail", error);
    return false;
  }
}

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

    const emailSent = await sendVerificationEmail(name,email, otp);
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

export const loadVerify = (req, res) => {
  const email = req.query.email;
  res.render("verify-otp", { email });
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
    res.json({ success: true , message: "OTP resent successfully" });
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


export const logout = async( req, res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log("Session Destruction error: ", err.message);
                return res.redirect("/notfound");
            }
            return res.redirect("/");
        })
    } catch (error) {
        console.log("Log out error", error);
        res.redirect("/notfound");
    }
}