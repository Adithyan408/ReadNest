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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    await User.updateOne(
      { _id: userId },
      { $set: { isBlocked: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ success: false });
  }
};

export const customerUnblock = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    await User.updateOne(
      { _id: userId },
      { $set: { isBlocked: false } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ success: false });
  }
};
