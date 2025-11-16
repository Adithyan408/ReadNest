import User from "../../models/userSchema.js";
import bcrypt from "bcrypt";

// ----------------------
// Page Error
// ----------------------
export const loadPageError = (req, res) => {
  res.render("admin-error");
};

// ----------------------
// Load Login Page
// ----------------------
export const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.render("admin-login", { message: null });
};

// ----------------------
// Admin Login
// ----------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await User.findOne({ email, isAdmin: true });
  
    if (!admin) {
      return res.render("admin-login", { message: "Admin not found" });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.render("admin-login", { message: "Invalid password" });
    }

    // Success
    req.session.admin = true;
    req.session.adminData = admin;

     return res.json({ success: true });
     
  } catch (error) {
    console.log("Login Error:", error.message);
    return res.redirect("/pageerror");
  }
};

// ----------------------
// Dashboard
// ----------------------
export const loadDashboard = (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    res.render("dashboard");

  } catch (error) {
    console.log("error in dashboard", error);
    res.redirect("/pageerror");
  }
};

// ----------------------
// Logout
// ----------------------
export const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error:", err.message);
        return res.redirect("/pageerror");
      }
      return res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("Log out error", error);
    res.redirect("/pageerror");
  }
};
