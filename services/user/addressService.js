import Address from "../../models/addressSchema.js";
import User from "../../models/userSchema.js";

export const loadAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      req.session.status = "error";
      req.session.message = "No user logged in";
      return res.redirect("/login");
    }
    const userData = await User.findById(userId).lean();
     const addressDoc = await Address.findOne({ userId }).lean();
     const addresses = addressDoc ? addressDoc.addresses : []; 
    console.log(addresses);
    return res.render("address", {
      addresses,
      user: userData,
      editAddress: null,
    });
  } catch (error) {
    console.error("Load address error:", error);

    req.session.status = "error";
    req.session.message = "Server error while loading addresses";

    return res.redirect("/account");
  }
};

export const postAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      return res.json({
        success: false,
        message: "No user logged in",
      });
    }

    const {
      addressLabel,
      houseName,
      houseNumber,
      street,
      post,
      district,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    // Check if user already has an address document
    let existing = await Address.findOne({ userId });

    if (!existing) {
      // Create new document
      existing = new Address({
        userId,
        addresses: [],
      });
    }

    // Push new address object
    existing.addresses.push({
      addressLabel,
      addressType,
      houseName,
      houseNumber,
      city,
      landMark,
      street,
      post,
      district,
      state,
      pincode,
      phone,
      altPhone,
    });

    await existing.save();

    return res.json({
      success: true,
      message: "Address added successfully!",
      data: existing,
    });
  } catch (error) {
    console.error("Add address error:", error);
    return res.json({
      success: false,
      message: "Server error while saving address",
    });
  }
};
