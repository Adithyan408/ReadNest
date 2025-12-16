import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import couponUsage from "../../models/couponUsage.js";
import ReferralReward from "../../models/referalSchema.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZO_API_KEY,
  key_secret: process.env.RAZO_KEY_SECRET,
});

export const loadPayment = async (req, res) => {
  try {
    const calculateOffer = async (product) => {
      const now = new Date();
      const regularPrice = product.regularPrice;

      let productDiscount = 0;
      if (product.offer?.isOffer) {
        const valid =
          (!product.offer.startDate ||
            now >= new Date(product.offer.startDate)) &&
          (!product.offer.endDate || now <= new Date(product.offer.endDate));

        if (valid) productDiscount = product.offer.discountValue;
      }

      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const valid =
          (!categoryDoc.offer.startDate ||
            now >= new Date(categoryDoc.offer.startDate)) &&
          (!categoryDoc.offer.endDate ||
            now <= new Date(categoryDoc.offer.endDate));

        if (valid) categoryDiscount = categoryDoc.offer.discountValue;
      }

      const bestDiscount = Math.max(productDiscount, categoryDiscount);

      const offerPrice =
        bestDiscount > 0
          ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
          : null;

      return {
        regularPrice,
        offerPrice,
        finalPrice: offerPrice || regularPrice,
        bestDiscount,
      };
    };

    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();
    const cartDoc = await Cart.findOne({ userId }).lean();

    const hasCartItems = cartDoc?.items?.length > 0;
    const isBuyNow = req.query.buyNow || req.session.buyNowProductId;

    if (!hasCartItems && !isBuyNow) return res.redirect("/cart");

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    let selectedAddress = null;

    if (addresses.length > 0) {
      selectedAddress =
        addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId
        ) ||
        addresses.find((a) => a.addressLabel === "Home") ||
        addresses[0];
    }

    let cart = [];

    if (req.query.buyNow) {
      const product = await Product.findById(req.query.buyNow).lean();
      if (!product) return res.redirect("/notfound");

      const qty = req.session.buyNowQuantity || 1;
      const offer = await calculateOffer(product);

      req.session.buyNowUnitPrice = offer.finalPrice;

      cart = [
        {
          _id: product._id,
          name: product.productName,
          image: product.productImage[0],
          quantity: qty,
          price: offer.finalPrice,
          regularPrice: product.regularPrice,
          offerPrice: offer.offerPrice,
          stock: product.stock,
        },
      ];
    } else {
      const fullCart = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart = await Promise.all(
        fullCart.items.map(async (i) => {
          const p = i.productId;
          const offer = await calculateOffer(p);

          return {
            _id: p._id,
            name: p.productName,
            image: p.productImage[0],
            quantity: i.quantity,
            price: offer.finalPrice,
            offerPrice: offer.offerPrice,
            regularPrice: p.regularPrice,
            stock: p.stock,
          };
        })
      );
    }

    let subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const now = new Date();

    const generalCoupons = await Coupon.find({
      type: "general",
      expiry: { $gte: now },
    }).lean();

    const referralRewards = await ReferralReward.find({
      userId,
      used: false,
    }).lean();

    const referralCodes = referralRewards.map((r) => r.couponCode);

    const referralCoupons = await Coupon.find({
      code: { $in: referralCodes },
      expiry: { $gte: now },
    }).lean();

    const usedGeneral = await couponUsage.find({ userId, used: true }).lean();
    const usedSet = new Set(usedGeneral.map((u) => u.couponId.toString()));

    const filteredGeneral = generalCoupons.filter(
      (c) => !usedSet.has(c._id.toString())
    );

    const coupons = [...filteredGeneral, ...referralCoupons];

    const shippingCharge = 20;
    const payableAmount = subtotal + shippingCharge;

    req.session.subtotal = subtotal;
    req.session.discountValue = 0;
    req.session.shippingCharge = shippingCharge;
    req.session.payableAmount = payableAmount;

    res.render("payment", {
      user: userData,
      addresses,
      selectedAddress,
      cart,
      subtotal,
      discount: 0,
      totalAmount: subtotal,
      shippingCharge,
      payableAmount,
      isBuyNow: Boolean(req.query.buyNow),
      coupons,
    });
  } catch (error) {
    console.log("Load Payment Error:", error);
    res.render("notFound");
  }
};

export const postCoupon = async (req, res) => {
  try {
    const { coupon, totalAmount } = req.body;
    const code = coupon.trim().toUpperCase();
    const userId = req.session.user._id;

    const couponDoc = await Coupon.findOne({ code });
    if (!couponDoc)
      return res.json({ success: false, message: "Invalid coupon!" });

    const now = new Date();
    if (couponDoc.expiry < now)
      return res.json({ success: false, message: "Coupon expired!" });

    let sub = req.session.subtotal;
    let cartTotal = Number(sub);

    if (couponDoc.type === "referral") {
      const reward = await ReferralReward.findOne({
        userId,
        couponCode: code,
        used: false,
      });

      if (!reward)
        return res.json({
          success: false,
          message: "No referral reward available!",
        });
    } else {
      const used = await couponUsage.findOne({
        userId,
        couponId: couponDoc._id,
        used: true,
      });

      if (used)
        return res.json({
          success: false,
          message: "You already used this coupon!",
        });
    }

    if (cartTotal < couponDoc.minPurchase)
      return res.json({
        success: false,
        message: `Minimum purchase ₹${couponDoc.minPurchase} required`,
      });

    const discountValue = Math.round((couponDoc.discount / 100) * cartTotal);

    req.session.appliedCoupon = code;
    req.session.discountValue = discountValue;
    req.session.payableAmount =
      req.session.subtotal + req.session.shippingCharge - discountValue;

    return res.json({
      success: true,
      message: "Coupon applied!",
      discount: discountValue,
      finalAmount: req.session.payableAmount,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Server error" });
  }
};

export const orderPlaced = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const paymentMode = req.query.payment || req.body.paymentMode;
    const paymentId = req.session.razorpayPaymentId || null;

    if (paymentMode === "ONLINE" && !req.session.paymentSuccess) {
      return res.redirect("/payment");
    }

    const payableAmount = req.session.payableAmount;
    let appliedCode = req.session.appliedCoupon;
    let discountValue = req.session.discountValue || 0;

    if (!payableAmount) return res.redirect("/cart");

    let couponDoc = null;

    if (appliedCode) {
      const couponDoc = await Coupon.findOne({ code: appliedCode });

      if (couponDoc.type === "referral") {
        await ReferralReward.findOneAndUpdate(
          { userId, couponCode: appliedCode, used: false },
          { used: true, usedAt: new Date() }
        );
      } else {
        await couponUsage.findOneAndUpdate(
          { userId, couponId: couponDoc._id },
          { used: true, usedAt: new Date() },
          { upsert: true }
        );
      }
    }

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

    const calculateOffer = async (product) => {
      const now = new Date();
      const regularPrice = product.regularPrice;

      let productDiscount = 0;
      if (product.offer?.isOffer) {
        const valid =
          (!product.offer.startDate ||
            now >= new Date(product.offer.startDate)) &&
          (!product.offer.endDate || now <= new Date(product.offer.endDate));

        if (valid) productDiscount = product.offer.discountValue;
      }

      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const valid =
          (!categoryDoc.offer.startDate ||
            now >= new Date(categoryDoc.offer.startDate)) &&
          (!categoryDoc.offer.endDate ||
            now <= new Date(categoryDoc.offer.endDate));

        if (valid) categoryDiscount = categoryDoc.offer.discountValue;
      }

      const bestDiscount = Math.max(productDiscount, categoryDiscount);
      const offerPrice =
        bestDiscount > 0
          ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
          : null;

      return {
        regularPrice,
        offerPrice,
        finalPrice: offerPrice || regularPrice,
        bestDiscount,
      };
    };

    let cartItems = [];

    if (req.session.buyNowProductId) {
      const product = await Product.findById(req.session.buyNowProductId);
      const qty = req.session.buyNowQuantity || 1;

      const offer = await calculateOffer(product);

      const unitPrice = offer.finalPrice;
      const itemTotal = unitPrice * qty;

      cartItems = [
        {
          product: product._id,
          productName: product.productName,

          // display-only
          regularPrice: offer.regularPrice,

          // 🔥 PRICE FREEZE (IMPORTANT)
          unitPrice, // ₹300
          quantity: qty,
          subtotal: itemTotal, // ₹300

          productImage: product.productImage,
          stock: product.stock,
        },
      ];
    } else {
      const cartData = await Cart.findOne({ userId }).populate(
        "items.productId"
      );

      const shippingPerItem = Math.round(
        req.session.shippingCharge / cartData.items.length
      );

      cartItems = await Promise.all(
        cartData.items.map(async (i) => {
          const p = i.productId;
          const offer = await calculateOffer(p);

          const unitPrice = offer.finalPrice;
          const itemTotal = unitPrice * i.quantity;

          return {
            product: p._id,
            productName: p.productName,

            // display-only
            regularPrice: offer.regularPrice,

            // 🔥 PRICE FREEZE (THIS IS WHAT REFUNDS USE)
            unitPrice,
            quantity: i.quantity,
            subtotal: itemTotal,

            productImage: p.productImage,
            stock: p.stock,
          };
        })
      );
    }

    const newOrder = new Order({
      user: userId,
      items: cartItems,
      total: req.session.payableAmount,
      discount: req.session.discountValue,
      couponCode: appliedCode || null,
      shippingCharge: req.session.shippingCharge,
      payableAmount,
      paymentId,
      paymentMethod: paymentMode,
      paymentStatus: paymentMode === "ONLINE" ? "paid" : "pending",
      status: "processing",
      address: selectedAddress ? { ...selectedAddress } : null,
      finalPayable: payableAmount
    });

    await newOrder.save();

    for (let item of cartItems) {
      await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    if (!req.session.buyNowProductId) {
      await Cart.updateOne({ userId }, { items: [] });
    }

    req.session.appliedCoupon = null;
    req.session.buyNowQuantity = null;
    req.session.buyNowProductId = null;
    req.session.discountValue = null;
    req.session.total = null;
    req.session.paymentSuccess = null;
    req.session.razorpayPaymentId = null;

    res.render("placed", {
      user: userData,
      addresses,
      selectedAddress,
      totalAmount: req.session.payableAmount,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.log("Order Error:", error);
    res.render("notFound");
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const amount = req.session.payableAmount;
    if (!amount)
      return res
        .status(400)
        .json({ success: false, message: "No total amount found." });

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    req.session.razorOrderId = order.id;

    res.json({ success: true, order });
  } catch (error) {
    console.log("Razorpay Order Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create Razorpay order." });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZO_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    req.session.paymentSuccess = true;
    req.session.razorpayPaymentId = razorpay_payment_id;

    return res.json({ success: true });
  } catch (error) {
    console.log("Payment Verification Error:", error);
    return res.status(500).json({ success: false });
  }
};

export const postRemoveCoupon = async (req, res) => {
  try {
    req.session.appliedCoupon = null;
    req.session.discountValue = 0;
    req.session.payableAmount =
      req.session.subtotal + req.session.shippingCharge;
    res.json({ success: true });
  } catch (error) {}
};
