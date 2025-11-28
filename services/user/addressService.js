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
    // console.log(addresses);
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


export const geteditAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const addressId = req.params.id;

    if (!userId) {
      return res.json({ success: false, message: "Not logged in" });
    }

    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.json({ success: false, message: "No addresses found" });
    }

    const singleAddress = addressDoc.addresses.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!singleAddress) {
      return res.json({ success: false, message: "Address not found" });
    }

    return res.json({
      success: true,
      address: singleAddress,
    });
  } catch (err) {
    console.error("Get single address error:", err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
};


export const updateEditAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const addressId = req.params.id;

    if (!userId) {
      return res.json({ success: false, message: "Not logged in" });
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

    // Find address document
    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.json({ success: false, message: "No address found" });
    }

    // Find the address inside the array
    const index = addressDoc.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (index === -1) {
      return res.json({ success: false, message: "Address not found" });
    }

    // Update the address fields
    addressDoc.addresses[index] = {
      ...addressDoc.addresses[index],
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
    };

    // Save document
    await addressDoc.save();

    return res.json({
      success: true,
      message: "Address updated successfully",
    });

  } catch (err) {
    console.error("Update address error:", err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
};

