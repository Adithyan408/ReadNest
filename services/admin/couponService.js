import Coupon from "../../models/couponSchema.js";
import User from "../../models/userSchema.js";

export const loadCoupon = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [coupons, count] = await Promise.all([
      Coupon.find().skip(skip).limit(limit).lean(),
      Coupon.countDocuments(),
    ]);

    const totalPages = Math.ceil(count / limit);

    const status = req.session.status;
    req.session.status = null; 

    res.render("coupon", {
      data: coupons,
      totalPages,
      currentPage: page,
      status
    });
  } catch (error) {
    console.log(error)
    res.redirect("/admin/error");
  }
};

export const loadAddCoupon = async (req, res) => {
  try {
    const users = await User.find({}, "name email").lean();

    res.render("addCoupon", {
      users,
    });
  } catch (error) {
    console.log("Error loading add coupon page:", error);
    res.redirect("/admin/error");
  }
};

export const postAddCoupon = async (req, res) => {
  try {
    const { code, discount, expiry, minPurchase } = req.body;

    if (!code || !discount || !expiry) {
      req.session.status = "All fields are required";
      return res.redirect("/admin/coupon/addCoupon");
    }

    const existingCoupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
    });

    if (existingCoupon) {
      req.session.status = "Coupon code already exists!";
      return res.redirect("/admin/coupon/addCoupon");
    }

    await Coupon.create({
      code: code.trim().toUpperCase(),
      discount: Number(discount),
      expiry: new Date(expiry),
      isUsed: false,
      userId: null,
      minPurchase
    });

    req.session.status = "Coupon created successfully!";
    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error adding coupon:", error);
    req.session.status = "Error creating coupon!";
    res.redirect("/admin/coupon/addCoupon");
  }
};



export const updateCoupon = async (req, res) => {
  try {
    const { id, code, discount, minPurchase, expiry } = req.body;
    if (!id) {
      req.session.status = "Invalid coupon ID";
      return res.redirect("/admin/coupon");
    }

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      req.session.status = "Coupon not found!";
      return res.redirect("/admin/coupon");
    }

  
    coupon.code = code.trim().toUpperCase();
    coupon.discount = Number(discount);
    coupon.minPurchase = Number(minPurchase) || 0;
    coupon.expiry = new Date(expiry);

    await coupon.save();

    req.session.status = "Coupon updated successfully!";
    return res.redirect("/admin/coupon");

  } catch (error) {
    console.log("Error updating coupon:", error);
    req.session.status = "Error updating coupon!";
    res.redirect("/admin/coupon");
  }
};


export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      req.session.message = "Invalid coupon ID";
      return res.redirect("/admin/coupon");
    }

    const deleted = await Coupon.findByIdAndDelete(id);

    if (!deleted) {
      req.session.status = "Coupon not found!";
      return res.redirect("/admin/coupon");
    }

    req.session.status = "Coupon deleted successfully!";
    return res.redirect("/admin/coupon");

  } catch (error) {
    console.log("Error deleting coupon:", error);
    req.session.status = "Error deleting coupon!";
    res.redirect("/admin/coupon");
  }
};
