import User from "../../models/userSchema.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";




export const loadPageError = (req, res) => {
  res.render("admin-error");
}


export const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.render("admin-login", { message: null });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin exists
    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      return res.json({ success: false, message: "Admin not found" });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    // Success → set session
    req.session.admin = true;
    req.session.adminData = admin; // optional: to use admin info later

    return res.json({ success: true, message: "Login successful" });

  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Try again later." });
  }
};

export const loadDashboard = async(req, res) => {
    try {
        res.render("dashboard");
    } catch (error) {
        res.redirect("/pageerror");
    }
}


export const logout = async( req, res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log("Session Destruction error: ", err.message);
                return res.redirect("/notfound");
            }
            return res.redirect("/admin/login");
        })
    } catch (error) {
        console.log("Log out error", error);
        res.redirect("/notfound");
    }
}