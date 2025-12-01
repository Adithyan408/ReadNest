import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";

export const loadPayment = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();

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
          stock: product.stock,
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
          stock: i.productId.stock,
        })) || [];
    }

    let subtotal = 0;

    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const discount = Math.floor(subtotal * 0.05);
    let totalAmount = subtotal - discount;

    res.render("payment", {
      user: userData,
      addresses,
      selectedAddress,
      cart,
      subtotal,
      discount,
      totalAmount,
      isBuyNow: Boolean(buyNowId),
    });
  } catch (error) {
    console.log("Load Payment Error:", error);
    res.render("notFound");
  }
};

export const postCoupon = async (req, res) => {
  try {
    const { coupon, totalAmount } = req.body;

    if (!coupon || !totalAmount) {
      return res.json({ success: false, message: "Invalid data" });
    }

    const code = coupon.toUpperCase();

    if (req.session.appliedCoupon === code) {
      return res.json({
        success: false,
        message: "Coupon already applied!",
      });
    }

    let discountValue = 0;

    if (code === "RUSH25") {
      const randomRate = Math.random() * 0.25;
      discountValue = Math.floor(totalAmount * randomRate);

      req.session.appliedCoupon = code;

      return res.json({
        success: true,
        discount: discountValue,
        finalAmount: totalAmount - discountValue,
        message: "25% discount applied!",
      });
    }

    if (code === "FLAT20") {
      discountValue = 20;

      req.session.appliedCoupon = code;

      return res.json({
        success: true,
        discount: discountValue,
        finalAmount: totalAmount - discountValue,
        message: "₹20 discount applied!",
      });
    }

    return res.json({
      success: false,
      message: "Invalid coupon code!",
    });
  } catch (err) {
    console.log("Coupon Error:", err);
    return res.json({ success: false, message: "Server Error" });
  }
};

export const orderPlaced = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();

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
          stock: product.stock,
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
          stock: i.productId.stock,
        })) || [];
    }

    let subtotal = 0;

    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const discount = Math.floor(subtotal * 0.05);
    let totalAmount = subtotal - discount;

    res.render("placed", {
      user: userData,
      addresses,
      selectedAddress,
      cart,
      subtotal,
      discount,
      totalAmount,
      isBuyNow: Boolean(buyNowId),
    });
  } catch (error) {}
};
