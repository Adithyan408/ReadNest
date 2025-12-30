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
import Wallet from "../../models/walletSchema.js";
import {
  savePaymentState,
  getPaymentState,
  clearPaymentState,
} from "../../helpers/paymentCache.js";
import { normalizeCoupons } from "../../helpers/couponNormal.js";
import { generateOrderId } from "../../middlewares/orderId.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZO_API_KEY,
  key_secret: process.env.RAZO_KEY_SECRET,
});

export const loadPayment = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const isRetry = req.query.retry === "true";

    if (isRetry) {
      const cached = await getPaymentState(userId);

      if (!cached) {
        return res.redirect("/cart?error=retry-expired");
      }

      const userData = await User.findById(userId).lean();
      const addressDoc = await Address.findOne({ userId }).lean();
      const addresses = addressDoc?.addresses || [];

      const selectedAddress =
        addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId
        ) ||
        addresses.find((a) => a.addressLabel === "Home") ||
        addresses[0] ||
        null;

      const walletDoc = await Wallet.findOne({ user: userId }).lean();
      const walletBalance = walletDoc?.balance || 0;
      const isWalletUsable = walletBalance >= cached.payableAmount;

      return res.render("payment", {
        user: userData,
        addresses,
        selectedAddress,

        cart: cached.cart,
        subtotal: cached.subtotal,
        discount: cached.discount,
        shippingCharge: cached.shippingCharge,
        payableAmount: cached.payableAmount,

        isBuyNow: cached.isBuyNow,
        coupons: cached.coupons,
        totalAmount: cached.subtotal,
        walletBalance,
        isWalletUsable,
        razorpayOrderId: cached.razorpayOrderId,

        appliedCoupon: cached.appliedCoupon,
        selectedPaymentMethod: cached.selectedPaymentMethod,
      });
    }

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
        finalPrice: offerPrice || regularPrice,
        offerPrice,
        regularPrice,
      };
    };

    const userData = await User.findById(userId).lean();
    const cartDoc = await Cart.findOne({ userId }).lean();

    const isBuyNow = req.query.buyNow || req.session.buyNowProductId;
    if (!cartDoc?.items?.length && !isBuyNow) {
      return res.redirect("/cart");
    }

    let cart = [];

    if (req.query.buyNow) {
      const product = await Product.findById(req.query.buyNow).lean();
      if (!product) return res.redirect("/notfound");

      const qty = req.session.buyNowQuantity || 1;
      const offer = await calculateOffer(product);

      cart.push({
        _id: product._id,
        name: product.productName,
        image: product.productImage[0],
        quantity: qty,
        price: offer.finalPrice,
        regularPrice: offer.regularPrice,
        offerPrice: offer.offerPrice,
      });
    } else {
      const fullCart = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart = await Promise.all(
        fullCart.items.map(async (i) => {
          const offer = await calculateOffer(i.productId);
          return {
            _id: i.productId._id,
            name: i.productId.productName,
            image: i.productId.productImage[0],
            quantity: i.quantity,
            price: offer.finalPrice,
            regularPrice: offer.regularPrice,
            offerPrice: offer.offerPrice,
          };
        })
      );
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const shippingCharge = 20;
    const payableAmount = subtotal + shippingCharge;

    const now = new Date();
    const coupons = await Coupon.find({
      expiry: { $gte: now },
    }).lean();

    const referralRewards = await ReferralReward.find({
      referrerId: userId,
      used: false,
    }).select("couponCode");

    const availableReferralCodes = referralRewards.map((r) => r.couponCode);

    const usedCoupons = await couponUsage
      .find({ userId, used: true })
      .select("couponId")
      .lean();

    const usedCouponIds = usedCoupons.map((c) => c.couponId.toString());

    const isBuyNowMode = Boolean(
      req.query.buyNow || req.session.buyNowProductId
    );

    const applicableCoupons = coupons.filter((coupon) => {
      const couponId = coupon._id.toString();
      const minPurchase = coupon.minPurchase || 0;

      if (usedCouponIds.includes(couponId)) {
        return false;
      }

      if (subtotal < minPurchase) {
        return false;
      }

      if (coupon.buyNowOnly && !isBuyNowMode) return false;
      if (coupon.cartOnly && isBuyNowMode) return false;

      if (coupon.type === "referral") {
        if (!availableReferralCodes.includes(coupon.code)) {
          return false;
        }

        if (coupon.userId?.toString() !== userId.toString()) {
          return false;
        }
      }

      return true;
    });

    const normalizedCoupons = normalizeCoupons(applicableCoupons);

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    const selectedAddress =
      addresses.find(
        (a) => a._id.toString() === req.session.selectedAddressId
      ) ||
      addresses.find((a) => a.addressLabel === "Home") ||
      addresses[0] ||
      null;

    await savePaymentState(userId, {
      cart,
      subtotal,
      discount: 0,
      shippingCharge,
      payableAmount,
      coupons: normalizedCoupons,
      selectedAddress,
      isBuyNow: Boolean(req.query.buyNow),
      appliedCoupon: null,
      selectedPaymentMethod: null,
      createdAt: Date.now(),
    });

    const walletDoc = await Wallet.findOne({ user: userId }).lean();
    const walletBalance = walletDoc?.balance || 0;
    const isWalletUsable = walletBalance >= payableAmount;

    res.render("payment", {
      user: userData,
      addresses: [],
      selectedAddress,
      cart,
      subtotal,
      discount: 0,
      totalAmount: subtotal,
      shippingCharge,
      payableAmount,
      isBuyNow: Boolean(req.query.buyNow),
      coupons: normalizedCoupons,
      walletBalance,
      isWalletUsable,
      selectedPaymentMethod: undefined,
      appliedCoupon: undefined,
    });
  } catch (error) {
    console.log("Load Payment Error:", error);
    res.render("notFound");
  }
};

export const postCoupon = async (req, res) => {
  try {
    const { coupon } = req.body;
    const code = coupon.trim().toUpperCase();
    const userId = req.session.user?._id;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const cached = await getPaymentState(userId);
    if (!cached) {
      return res.json({ success: false, message: "Payment session expired" });
    }

    const couponDoc = await Coupon.findOne({
      code,
      $or: [{ type: "general" }, { type: "referral", userId }],
    }).lean();

    if (!couponDoc) {
      return res.json({ success: false, message: "Invalid coupon" });
    }

    if (couponDoc.expiry < new Date()) {
      return res.json({ success: false, message: "Coupon expired" });
    }

    if (cached.subtotal < couponDoc.minPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase ₹${couponDoc.minPurchase} required`,
      });
    }

    if (couponDoc.type === "referral") {
      const reward = await ReferralReward.findOne({
        referrerId: userId,
        couponCode: couponDoc.code,
        used: false,
      });

      if (!reward) {
        return res.json({
          success: false,
          message: "Invalid or already used referral coupon",
        });
      }
    }

    const percentageDiscount = Math.round(
      (couponDoc.discount / 100) * cached.subtotal
    );

    const maxAllowedDiscount =
      Number.isFinite(couponDoc.maxDiscount) && couponDoc.maxDiscount > 0
        ? couponDoc.maxDiscount
        : percentageDiscount;

    const discountValue = Math.min(percentageDiscount, maxAllowedDiscount);

    const payableAmount =
      cached.subtotal + cached.shippingCharge - discountValue;

    await savePaymentState(userId, {
      ...cached,
      discount: discountValue,
      payableAmount,
      appliedCoupon: code,
      couponType: couponDoc.type,
    });

    req.session.discountValue = discountValue;
    req.session.payableAmount = payableAmount;
    req.session.appliedCoupon = code;

    return res.json({
      success: true,
      discount: discountValue,
      finalAmount: payableAmount,
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return res.json({ success: false, message: "Server error" });
  }
};

export const orderPlaced = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const cached = await getPaymentState(userId);
    if (!cached) {
      return res.redirect("/cart?error=payment-expired");
    }

    const {
      cart,
      subtotal,
      discount,
      shippingCharge,
      payableAmount,
      appliedCoupon,
      isBuyNow,
      razorpayOrderId,
    } = cached;

    const paymentMode = req.query.payment || req.body.paymentMode;
    const paymentId = req.session.razorpayPaymentId || null;

    if (paymentMode === "Razorpay" && !req.session.paymentSuccess) {
      return res.redirect("/payment-failed?reason=Payment not completed");
    }

    if (appliedCoupon) {
      const couponDoc = await Coupon.findOne({ code: appliedCoupon });

      if (couponDoc) {
        if (couponDoc.type === "referral") {
          const reward = await ReferralReward.findOneAndUpdate(
            {
              referrerId: userId,
              couponCode: couponDoc.code,
              used: false,
            },
            {
              used: true,
              usedAt: new Date(),
            },
            { new: true }
          );

          if (!reward) {
            return res.redirect(
              "/payment-failed?reason=Referral coupon invalid"
            );
          }
        } else {
          await couponUsage.findOneAndUpdate(
            {
              userId,
              couponId: couponDoc._id,
            },
            {
              used: true,
              usedAt: new Date(),
            },
            { upsert: true }
          );
        }
      }
    }

    const userData = await User.findById(userId).lean();
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    const selectedAddress =
      cached.selectedAddress ||
      addresses.find((a) => a.addressLabel === "Home") ||
      addresses[0] ||
      null;

    let cartItems = [];

    for (const item of cart) {
      const productDoc = await Product.findById(item._id).lean();

      if (!productDoc) {
        return res.redirect("/cart?error=product-not-found");
      }

      if (productDoc.stock < item.quantity) {
        return res.redirect("/cart?error=out-of-stock");
      }

      cartItems.push({
        product: item._id,
        productName: item.name,
        category: productDoc.category,

        regularPrice: item.regularPrice,
        unitPrice: item.price,
        quantity: item.quantity,

        subtotal: item.price * item.quantity,
        productImage: [item.image],

        stock: productDoc.stock,
      });
    }

    if (discount > 0 && cartItems.length > 0) {
      const totalItemsAmount = cartItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      let remainingDiscount = discount;

      cartItems.forEach((item, index) => {
        let itemDiscount;

        if (index === cartItems.length - 1) {
          itemDiscount = remainingDiscount;
        } else {
          itemDiscount = Math.round(
            (item.subtotal / totalItemsAmount) * discount
          );
          remainingDiscount -= itemDiscount;
        }

        item.couponDiscount = itemDiscount;
        item.finalAmount = item.subtotal - itemDiscount;
      });
    } else {
      cartItems.forEach((item) => {
        item.couponDiscount = 0;
        item.finalAmount = item.subtotal;
      });
    }

    const newOrder = new Order({
      user: userId,
      items: cartItems,
      total: subtotal,
      discount,
      couponCode: appliedCoupon || null,
      shippingCharge,
      payableAmount,
      paymentId,
      paymentMethod: paymentMode,
      paymentStatus:
        paymentMode === "Razorpay" || paymentMode === "WALLET"
          ? "paid"
          : "pending",

      status: "processing",
      address: selectedAddress ? { ...selectedAddress } : null,
      finalPayable: payableAmount,
      razorpayOrderId,
    });

    await newOrder.save();
    newOrder.orderId = `RN${newOrder._id.toString().slice(-6).toUpperCase()}`;
    await newOrder.save();

    for (const item of cartItems) {
      await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    if (!isBuyNow) {
      await Cart.updateOne({ userId }, { items: [] });
    }

    await clearPaymentState(userId);

    req.session.paymentSuccess = null;
    req.session.razorpayPaymentId = null;
    req.session.appliedCoupon = null;
    req.session.discountValue = null;
    req.session.buyNowProductId = null;
    req.session.buyNowQuantity = null;

    res.render("placed", {
      user: userData,
      addresses,
      selectedAddress,
      totalAmount: payableAmount,
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Order Error:", error);
    res.render("notFound");
  }
};

export const paymentFailed = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const cached = await getPaymentState(userId);

    if (req.query.paymentMethod && cached) {
      await savePaymentState(userId, {
        ...cached,
        selectedPaymentMethod: req.query.paymentMethod,
      });
    }

    if (!cached) {
      return res.render("failedPayment", {
        user: req.session.user,
        reason:
          "Your payment session has expired. Please place the order again.",
        retryUrl: "/cart",
        retryExpired: true,
      });
    }

    if (cached && req.query.paymentMethod) {
      await savePaymentState(userId, {
        ...cached,
        selectedPaymentMethod: req.query.paymentMethod,
      });
    }

    req.session.paymentSuccess = null;
    req.session.razorpayPaymentId = null;

    const failureReason =
      req.query.reason || "Your payment could not be completed.";

    res.render("failedPayment", {
      user: req.session.user,
      reason: failureReason,
      retryUrl: "/checkout/payment?retry=true",
      retryExpired: false,
      payableAmount: cached.payableAmount,
    });
  } catch (error) {
    console.error("Payment Failed Controller Error:", error);
    res.render("notFound");
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cached = await getPaymentState(userId);

    if (!cached) {
      return res.status(400).json({
        success: false,
        message: "Payment session expired. Please try again.",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: cached.payableAmount * 100,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    await savePaymentState(userId, {
      ...cached,
      razorpayOrderId: razorpayOrder.id,
    });

    return res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    console.error("Razorpay Order Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment order",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const cached = await getPaymentState(userId);

    if (!cached) {
      return res.redirect("/payment-failed?reason=Payment session expired");
    }

    if (cached.razorpayOrderId !== razorpay_order_id) {
      return res.redirect("/payment-failed?reason=Invalid payment order");
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZO_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      req.session.paymentSuccess = null;
      req.session.razorpayPaymentId = null;

      return res.redirect("/payment-failed?reason=Payment verification failed");
    }

    req.session.paymentSuccess = true;
    req.session.razorpayPaymentId = razorpay_payment_id;

    return res.json({ success: true });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return res.status(500).json({ success: false });
  }
};

export const postRemoveCoupon = async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.json({ success: false });

  const cached = await getPaymentState(userId);
  if (!cached) return res.json({ success: false });

  const payableAmount = cached.subtotal + cached.shippingCharge;

  await savePaymentState(userId, {
    ...cached,
    appliedCoupon: null,
    discount: 0,
    payableAmount,
  });

  return res.json({
    success: true,
    payableAmount,
    discount: 0,
  });
};

export const savePaymentMethod = async (req, res) => {
  const userId = req.session.user?._id;
  const { method } = req.body;

  if (!userId || !method) return res.json({ success: false });

  const cached = await getPaymentState(userId);
  if (!cached) return res.json({ success: false });

  await savePaymentState(userId, {
    ...cached,
    selectedPaymentMethod: method,
  });

  res.json({ success: true });
};
