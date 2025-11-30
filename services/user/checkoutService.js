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

    let cart = [];

    const buyNowId = req.query.buyNow;

    if (buyNowId) {
      const product = await Product.findById(buyNowId).lean();

      if (!product) return res.redirect("/notfound");

      cart = [
        {
          _id: product._id,
          name: product.productName,
          price: product.salePrice || product.regularPrice,
          image: product.productImage[0],
          quantity: 1,
          stock: product.stock
        },
      ];
    } else {

      const cartData = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart =
        cartData?.items.map((i) => ({
          _id: i.productId._id,
          name: i.productId.productName,
          price: i.productId.salePrice || i.productId.regularPrice,
          image: i.productId.productImage[0],
          quantity: i.quantity,
          stock: i.productId.stock
        })) || [];
    }


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
      isBuyNow: Boolean(buyNowId),
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

export const addNewAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.json({ success: false });

    const addressData = req.body;

    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      addressDoc = new Address({
        userId,
        addresses: [addressData],
      });
    } else {
      addressDoc.addresses.push(addressData);
    }

    await addressDoc.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Add address error:", error);
    return res.json({ success: false });
  }
};

export const saveAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const {
      addressId,
      addressLabel,
      houseName,
      houseNumber,
      street,
      post,
      district,
      state,
      pincode,
      phone,
      altPhone
    } = req.body;

    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      addressDoc = new Address({
        userId,
        addresses: [{
          addressLabel, houseName, houseNumber,
          street, post, district, state, pincode, phone, altPhone
        }],
      });
    } else {
      if (addressId) {
        const addr = addressDoc.addresses.id(addressId);
        addr.addressLabel = addressLabel;
        addr.houseName = houseName;
        addr.houseNumber = houseNumber;
        addr.street = street;
        addr.post = post;
        addr.district = district;
        addr.state = state;
        addr.pincode = pincode;
        addr.phone = phone;
        addr.altPhone = altPhone;

      } else {
        addressDoc.addresses.push({
          addressLabel, houseName, houseNumber,
          street, post, district, state, pincode, phone, altPhone
        });
      }
    }

    await addressDoc.save();
    return res.json({ success: true });

  } catch (err) {
    console.log("Save address error:", err);
    return res.json({ success: false });
  }
};
