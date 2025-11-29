import Product from "../../models/productsSchema.js";
import User from "../../models/userSchema.js";
import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";

export const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId).lean();

    const cartData = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

    const cart =
      cartData?.items.map((i) => ({
        _id: i.productId._id,
        name: i.productId.productName,
        price: i.productId.salePrice || i.productId.regularPrice,
        image: i.productId.productImage[0],
        quantity: i.quantity,
      })) || [];



    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    let selectedAddress = null;

    if (addresses.length > 0) {
      if (req.session.selectedAddressId) {
        selectedAddress = addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId
        );
      }

      if (!selectedAddress) {
        selectedAddress =
          addresses.find((a) => a.addressLabel === "Home") || addresses[0];
      }
    }

    return res.render("checkout", {
      user: userData,
      cart,
      addresses,
      selectedAddress: selectedAddress || null,
    });
  } catch (error) {
    console.log("Checkout Load Error:", error);
    return res.redirect("/notfound");
  }
};

export const setSelectedAddress = (req, res) => {
  try {
    const { addressId } = req.body;

    req.session.selectedAddressId = addressId;

    return res.json({
      success: true,
      message: "Address selected",
    });
  } catch (error) {
    console.log("Set address error:", error);
    return res.json({ success: false });
  }
};
