import User from "../../models/userSchema.js";
import bcrypt from "bcrypt";

export const pageError = async (req, res) => {
  res.render("admin-error");
};

export const getLogin = async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.render("admin-login", { message: null });
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("admin-login", { message: "Admin not found" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.render("admin-login", { message: "Invalid password" });
    }

    req.session.admin = true;
    req.session.adminData = admin;

    return res.json({ success: true });
  } catch (error) {
    return res.redirect("/pageerror");
  }
};

export const getDashboard = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    res.render("dashboard");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const postLogout = async (req, res) => {
  try {
    delete req.session.admin;
    delete req.session.adminData;

    return res.redirect("/admin/login");
  } catch (error) {
    console.log("Admin Logout error", error);
    res.redirect("/pageerror");
  }
};
