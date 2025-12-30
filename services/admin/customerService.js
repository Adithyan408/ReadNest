import User from "../../models/userSchema.js";

export const loadCustomer = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const matchStage = {
      isAdmin: false,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const userData = await User.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },

      {
        $lookup: {
          from: "wallets",        
          localField: "_id",      
          foreignField: "user",   
          as: "wallet",
        },
      },

      {
        $addFields: {
          walletBalance: {
            $ifNull: [{ $arrayElemAt: ["$wallet.balance", 0] }, 0],
          },
        },
      },

      {
        $project: {
          wallet: 0,
        },
      },
    ]);

    const count = await User.countDocuments(matchStage);
    const totalPages = Math.ceil(count / limit);

    res.render("customer", {
      data: userData,
      totalPages,
      currentPage: page,
      search,
    });
  } catch (error) {
    console.error(error);
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
