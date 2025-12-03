import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";
import Order from "../../models/orderSchema.js";

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

      const qty = req.session.buyNowQuantity || 1;
      req.session.buyNowProductId = buyNowId;
      req.session.buyNowUnitPrice = product.salePrice || product.regularPrice;

      cart = [
        {
          _id: product._id,
          name: product.productName,
          quantity: qty,
          price: req.session.buyNowUnitPrice,
          image: product.productImage[0],
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
    req.session.total = totalAmount;


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
    const totalAmount = req.session.total;

    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    let selectedAddress =
      addresses.find(
        (a) => a._id.toString() === req.session.selectedAddressId
      ) ||
      addresses.find((a) => a.addressLabel === "Home") ||
      addresses[0] ||
      null;

    let cartItems = [];

    if (req.query.buyNow) {
      const product = await Product.findById(req.query.buyNow);
      const qty = req.session.buyNowQuantity || 1;
      if (!product) return res.redirect("/notfound");

      cartItems = [
        {
          product: product._id,
          productName: product.productName,
          regularPrice: product.salePrice || product.regularPrice,
          stock: product.stock,
          quantity: qty,
          subtotal: req.session.buyNowUnitPrice * qty,
          productImage : product.productImage
        },
      ];
    } else {
      const cartData = await Cart.findOne({ userId }).populate(
        "items.productId"
      );

      cartItems =
        cartData?.items.map((i) => ({
          product: i.productId._id,
          productName: i.productId.productName,
          regularPrice: i.productId.salePrice || i.productId.regularPrice,
          stock: i.productId.stock,
          productImage : i.productId.productImage,
          subtotal:
            (i.productId.salePrice || i.productId.regularPrice) * i.quantity,
          quantity: i.quantity,
        })) || [];
    }


    const newOrder = new Order({
      user: userId,
      items: cartItems,
      total: totalAmount,
      paymentId: null,
      status: "processing",
    });

    await newOrder.save();

    for (let item of cartItems) {
      await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    if (!req.query.buyNow) {
      await Cart.updateOne({ userId }, { items: [] });
    }

    req.session.appliedCoupon = null;
    req.session.buyNowQuantity = null;
    req.session.buyNowProductId = null;

    res.render("placed", {
      user: userData,
      addresses,
      selectedAddress,
      totalAmount,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.log("Order placing error:", error);
    res.render("notFound");
  }
};
