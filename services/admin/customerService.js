import User from "../../models/userSchema.js";

export const loadCustomer = async (req, res) => {
  try {
    let search = req.query.search || "";
    if (req.query.search) {
      search = req.query.search;
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);
    const currentPage = page;

    res.render("customer", { data: userData, totalPages, currentPage });
  } catch (error) {
    res.render("admin-error");
  }
};

export const customerBlock = async (req, res) => {
  try {
    let id = req.query.id;
    const page = req.query.page || 1;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect(`/admin/users?page=${page}`);
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

export const cutomerUnblock = async (req, res) => {
  try {
    let id = req.query.id;
    const page = req.query.page || 1;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect(`/admin/users?page=${page}`);
  } catch (error) {
    res.redirect("/pageerror");
  }
};
