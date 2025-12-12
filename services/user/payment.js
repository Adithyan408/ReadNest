import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import Razorpay from "razorpay";
import crypto from "crypto";

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
        const start = product.offer.startDate;
        const end = product.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) productDiscount = product.offer.discountValue;
      }

      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const start = categoryDoc.offer.startDate;
        const end = categoryDoc.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

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

    const cartData = await Cart.findOne({ userId }).lean();
    const hasCartItems = cartData?.items?.length > 0;
    const hasBuyNow = req.query.buyNow || req.session.buyNowProductId;

    if (!hasCartItems && !hasBuyNow) {
      return res.redirect("/cart");
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

    let cart = [];
    const buyNowId = req.query.buyNow;

    if (buyNowId) {
      const product = await Product.findById(buyNowId).lean();
      if (!product) return res.redirect("/notfound");

      const qty = req.session.buyNowQuantity || 1;

      const offer = await calculateOffer(product);

      req.session.buyNowProductId = buyNowId;
      req.session.buyNowUnitPrice = offer.finalPrice;

      cart = [
        {
          _id: product._id,
          name: product.productName,
          image: product.productImage[0],
          quantity: qty,
          price: offer.finalPrice,
          offerPrice: offer.offerPrice,
          regularPrice: product.regularPrice,
          stock: product.stock,
        },
      ];
    } else {
      const cartData = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart = cartData
        ? await Promise.all(
            cartData.items.map(async (i) => {
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
          )
        : [];
    }

    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const now = new Date();
    const coupons = await Coupon.find({
      isUsed: false,
      expiry: { $gte: now },
    }).lean();

    const discount = 0;
    const totalAmount = subtotal - discount;

    req.session.total = totalAmount;
    const shippingCharge = 20;
    const payableAmount = totalAmount + shippingCharge;

    res.render("payment", {
      user: userData,
      addresses,
      selectedAddress,
      cart,
      subtotal,
      discount,
      totalAmount,
      shippingCharge,
      payableAmount,
      isBuyNow: Boolean(buyNowId),
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
    if (!coupon || totalAmount == null) {
      return res.json({ success: false, message: "Invalid data" });
    }

    const code = coupon.trim().toUpperCase();
    const cartTotal = Number(totalAmount);

    if (Number.isNaN(cartTotal) || cartTotal <= 0) {
      return res.json({ success: false, message: "Invalid cart total" });
    }

    if (req.session.appliedCoupon === code) {
      return res.json({
        success: false,
        message: "Coupon already applied!",
      });
    }

    const couponDoc = await Coupon.findOne({ code });

    const usage = await couponUsage.findOne({
      userId: req.session.user._id,
      couponId: couponDoc._id,
      used: true,
    });

    if (usage) {
      return res.json({
        success: false,
        message: "You have already used this coupon!",
      });
    }

    if (!couponDoc) {
      return res.json({
        success: false,
        message: "Invalid coupon code!",
      });
    }

    const now = new Date();

    if (couponDoc.expiry && couponDoc.expiry < now) {
      return res.json({
        success: false,
        message: "Coupon has expired!",
      });
    }

    if (couponDoc.isUsed) {
      return res.json({
        success: false,
        message: "Coupon already used!",
      });
    }

    const minPurchase = couponDoc.minPurchase || 0;
    if (cartTotal < minPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase required: ₹${minPurchase}`,
      });
    }

    const discountValue = Math.round((cartTotal * couponDoc.discount) / 100);
    const finalAmount = cartTotal - discountValue;

    req.session.appliedCoupon = code;
    req.session.discountValue = discountValue;
    req.session.total = finalAmount;

    return res.json({
      success: true,
      message: "Coupon applied successfully!",
      discount: discountValue,
      finalAmount,
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

    const paymentMode = req.query.payment || req.body.paymentMode;
    const paymentId = req.session.razorpayPaymentId || null;

    if (paymentMode === "ONLINE" && !req.session.paymentSuccess) {
      return res.redirect("/payment");
    }

    let totalAmount = req.session.total || 0;

    let appliedCode = req.session.appliedCoupon;
    let discountValue = req.session.discountValue || 0;

    if (!totalAmount) {
      return res.redirect("/cart");
    }

    if (appliedCode) {
      const couponDoc = await Coupon.findOne({ code: appliedCode });

      if (couponDoc) {
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
        const start = product.offer.startDate;
        const end = product.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) productDiscount = product.offer.discountValue;
      }

      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const start = categoryDoc.offer.startDate;
        const end = categoryDoc.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) categoryDiscount = categoryDoc.offer.discountValue;
      }

      const bestDiscount = Math.max(productDiscount, categoryDiscount);

      const offerPrice =
        bestDiscount > 0
          ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
          : null;

      const finalPrice = offerPrice || regularPrice;

      return {
        regularPrice,
        offerPrice,
        finalPrice,
        bestDiscount,
      };
    };

    let cartItems = [];

    if (req.session.buyNowProductId) {
      const product = await Product.findById(req.session.buyNowProductId);
      const qty = req.session.buyNowQuantity || 1;

      const offer = await calculateOffer(product);

      cartItems = [
        {
          product: product._id,
          productName: product.productName,
          regularPrice: offer.regularPrice,
          offerPrice: offer.offerPrice,
          finalPrice: offer.finalPrice,
          bestDiscount: offer.bestDiscount,
          quantity: qty,
          subtotal: offer.finalPrice * qty,
          productImage: product.productImage,
          stock: product.stock,
        },
      ];
    } else {
      const cartData = await Cart.findOne({ userId }).populate(
        "items.productId"
      );

      cartItems = await Promise.all(
        cartData.items.map(async (i) => {
          const p = i.productId;
          const offer = await calculateOffer(p);

          return {
            product: p._id,
            productName: p.productName,
            regularPrice: offer.regularPrice,
            offerPrice: offer.offerPrice,
            finalPrice: offer.finalPrice,
            bestDiscount: offer.bestDiscount,
            quantity: i.quantity,
            subtotal: offer.finalPrice * i.quantity,
            productImage: p.productImage,
            stock: p.stock,
          };
        })
      );
    }
    const shippingCharge = 20;
    const payableAmount = totalAmount + shippingCharge;

    const newOrder = new Order({
      user: userId,
      items: cartItems,
      total: totalAmount,
      discount: discountValue,
      couponCode: appliedCode || null,
      shippingCharge,
      payableAmount,
      paymentId: paymentId,
      paymentMethod: paymentMode,
      paymentStatus: paymentMode === "ONLINE" ? "paid" : "pending",
      status: "processing",
      address: selectedAddress ? { ...selectedAddress } : null,
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
      totalAmount,
      orderId: newOrder._id,
    });
  } catch (error) {
    res.render("notFound");
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const amount = req.session.total;
    if (!amount)
      return res
        .status(400)
        .json({ success: false, message: "No total amount found." });

    const options = {
      amount: amount * 100, // Razorpay works in paise
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

    // Payment Verified → Now create order in DB
    req.session.paymentSuccess = true;
    req.session.razorpayPaymentId = razorpay_payment_id;

    return res.json({ success: true });
  } catch (error) {
    console.log("Payment Verification Error:", error);
    return res.status(500).json({ success: false });
  }
};