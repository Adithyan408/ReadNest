import User from '../../models/userSchema.js';
import Address from '../../models/addressSchema.js';
import Product from '../../models/productsSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import Order from '../../models/orderSchema.js';
import Coupon from '../../models/couponSchema.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import couponUsage from '../../models/couponUsage.js';
import ReferralReward from '../../models/referalSchema.js';
import Wallet from '../../models/walletSchema.js';
import {
  savePaymentState,
  getPaymentState,
  clearPaymentState,
} from '../../helpers/paymentCache.js';
import { normalizeCoupons } from '../../helpers/couponNormal.js';
import { ERROR_MESSAGES } from '../../helpers/errorMessages.js';
import { HttpStatus } from '../../helpers/statusCodes.js';
import PaymentAttempt from '../../models/failedPayment.js';
import { createPaymentAttempt } from './paymentAttemptService.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZO_API_KEY,
  key_secret: process.env.RAZO_KEY_SECRET,
});

export const loadPayment = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(HttpStatus.NOT_FOUND).redirect('/login');
    }

    const retryType = req.query.retry;
   
    if (!retryType) {
      await clearPaymentState(userId);
    }

    if (retryType === 'redis') {
      const cached = await getPaymentState(userId);
      if (!cached) {
        return res.redirect('/orders?error=retry-expired');
      }

      const userData = await User.findById(userId).lean();
      const addressDoc = await Address.findOne({ userId }).lean();
      const addresses = addressDoc?.addresses || [];

      const selectedAddress =
        addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId,
        ) ||
        addresses.find((a) => a.addressLabel === 'Home') ||
        addresses[0] ||
        null;

      const walletDoc = await Wallet.findOne({ user: userId }).lean();
      const walletBalance = walletDoc?.balance || 0;
      const isWalletUsable = walletBalance >= cached.payableAmount;

      return res.render('payment', {
        user: userData,
        addresses,
        selectedAddress,
        cart: cached.cart,
        subtotal: cached.subtotal,
        discount: cached.discount,
        shippingCharge: cached.shippingCharge,
        payableAmount: cached.payableAmount,
        coupons: cached.coupons,
        totalAmount: cached.subtotal,
        walletBalance,
        isWalletUsable,
        razorpayOrderId: cached.razorpayOrderId,
        appliedCoupon: cached.appliedCoupon,
        selectedPaymentMethod: cached.selectedPaymentMethod,
      });
    }

    if (retryType === 'db') {
      const { orderId } = req.query;

      const order = await Order.findOne({
        orderId,
        user: userId,
        paymentStatus: 'failed',
      }).lean();

      if (!order) {
        return res.redirect('/orders');
      }

      let coupons = [];
        let appliedCoupon = null;
         let discount = order.discount || 0;

if (order.couponCode) {
  const coupon = await Coupon.findOne({
    code: order.couponCode,
  }).lean();

  if (coupon) {
    const alreadyUsed = await couponUsage.findOne({
      userId,
      couponId: coupon._id,
      used: true,
      orderId: { $ne: order._id }, 
    });

    if (!alreadyUsed) {
      
      coupons = [coupon];
      appliedCoupon = coupon.code;
    } else {
      coupons = [];
      appliedCoupon = null;
      discount = 0;
    }
  }
}

      for (const item of order.items) {
        const product = await Product.findById(item.product).lean();
        if (!product || product.stock < item.quantity) {
          return res.redirect(
            `/orders/${order.orderId}?error=item-unavailable`,
          );
        }
      }

      const cart = order.items.map((item) => ({
        _id: item.product,
        name: item.productName,
        image: item.productImage?.[0],
        quantity: item.quantity,
        price: item.unitPrice,
        regularPrice: item.unitPrice,
        offerPrice: null,
      }));

      await savePaymentState(userId, {
        cart,
        subtotal: order.subtotal,
        discount,
        shippingCharge: order.shippingCharge,
        payableAmount:   order.subtotal - discount + order.shippingCharge,
        coupons,
        appliedCoupon,
        selectedPaymentMethod: order.paymentMethod || null,
        razorpayOrderId: null,
        createdAt: Date.now(),
      });

      return res.redirect(303, '/checkout/payment?retry=redis');
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
    const redisFallback = await getPaymentState(userId);

    if (redisFallback) {
      const userData = await User.findById(userId).lean();
      const addressDoc = await Address.findOne({ userId }).lean();
      const addresses = addressDoc?.addresses || [];

      const selectedAddress =
        addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId,
        ) ||
        addresses.find((a) => a.addressLabel === 'Home') ||
        addresses[0] ||
        null;

      const walletDoc = await Wallet.findOne({ user: userId }).lean();
      const walletBalance = walletDoc?.balance || 0;
      const isWalletUsable = walletBalance >= redisFallback.payableAmount;

      return res.render('payment', {
        user: userData,
        addresses,
        selectedAddress,
        cart: redisFallback.cart,
        subtotal: redisFallback.subtotal,
        discount: redisFallback.discount,
        shippingCharge: redisFallback.shippingCharge,
        payableAmount: redisFallback.payableAmount,
        coupons: redisFallback.coupons,
        totalAmount: redisFallback.subtotal,
        walletBalance,
        isWalletUsable,
        razorpayOrderId: redisFallback.razorpayOrderId,
        appliedCoupon: redisFallback.appliedCoupon,
        selectedPaymentMethod: redisFallback.selectedPaymentMethod,
      });
    }

    const fullCart = await Cart.findOne({ userId })
      .populate('items.productId')
      .lean();

    const cart = await Promise.all(
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
      }),
    );

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const shippingCharge = 20;
    const payableAmount = subtotal + shippingCharge;

    const now = new Date();
    const coupons = await Coupon.find({ expiry: { $gte: now } }).lean();

    const normalizedCoupons = normalizeCoupons(coupons);

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    const selectedAddress =
      addresses.find(
        (a) => a._id.toString() === req.session.selectedAddressId,
      ) ||
      addresses.find((a) => a.addressLabel === 'Home') ||
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
      appliedCoupon: null,
      selectedPaymentMethod: null,
      razorpayOrderId: null,
      createdAt: Date.now(),
    });

    const walletDoc = await Wallet.findOne({ user: userId }).lean();
    const walletBalance = walletDoc?.balance || 0;
    const isWalletUsable = walletBalance >= payableAmount;

    res.render('payment', {
      user: userData,
      addresses: [],
      selectedAddress,
      cart,
      subtotal,
      discount: 0,
      totalAmount: subtotal,
      shippingCharge,
      payableAmount,
      coupons: normalizedCoupons,
      walletBalance,
      isWalletUsable,
      selectedPaymentMethod: undefined,
      appliedCoupon: undefined,
    });
  } catch (error) {
    console.log('Load Payment Error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};

export const postCoupon = async (req, res) => {
  try {
    const { coupon } = req.body;
    const code = coupon.trim().toUpperCase();
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
      });
    }

    const cached = await getPaymentState(userId);
    if (!cached) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: 'Payment session expired' });
    }

    const couponDoc = await Coupon.findOne({
      code,
      $or: [{ type: 'general' }, { type: 'referral', userId }],
    }).lean();

    if (!couponDoc) {
      return res.json({ success: false, message: 'Invalid coupon' });
    }

    if (couponDoc.expiry < new Date()) {
      return res.json({ success: false, message: 'Coupon expired' });
    }

    if (cached.subtotal < couponDoc.minPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase ₹${couponDoc.minPurchase} required`,
      });
    }

    if (couponDoc.type === 'referral') {
      const reward = await ReferralReward.findOne({
        referrerId: userId,
        couponCode: couponDoc.code,
        used: false,
      });

      if (!reward) {
        return res.json({
          success: false,
          message: 'Invalid or already used referral coupon',
        });
      }
    }

    const percentageDiscount = Math.round(
      (couponDoc.discount / 100) * cached.subtotal,
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
    console.error('Apply Coupon Error:', error);
    return res.json({
      success: false,
      message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
    });
  }
};

export const orderPlaced = async (req, res) => {
  let reservedProducts = [];
  let payableAmount = 0;
  let paymentMode = null;
  let paymentId = null;
  let userId = null;

  try {
    userId = req.session.user?._id;
    if (!userId) return res.redirect('/login');

    const cached = await getPaymentState(userId);
    if (!cached) {
      return res.redirect('/cart?error=payment-expired');
    }

    const cart = cached.cart;
    const subtotal = cached.subtotal;
    const discount = cached.discount;
    const shippingCharge = cached.shippingCharge;
    const appliedCoupon = cached.appliedCoupon;
    const razorpayOrderId = cached.razorpayOrderId;

    payableAmount = cached.payableAmount;
    paymentMode = req.query.payment || req.body.paymentMode;
    paymentId = req.session.razorpayPaymentId || null;

    if (paymentMode === 'Razorpay' && !req.session.paymentSuccess) {
      return res.redirect('/payment-failed?reason=Payment not completed');
    }

    if (appliedCoupon) {
      const couponDoc = await Coupon.findOne({ code: appliedCoupon });

      if (couponDoc) {
        if (couponDoc.type === 'referral') {
          const reward = await ReferralReward.findOneAndUpdate(
            { referrerId: userId, couponCode: couponDoc.code, used: false },
            { used: true, usedAt: new Date() },
            { new: true },
          );

          if (!reward) throw new Error('INVALID_COUPON');
        } else {
          await couponUsage.findOneAndUpdate(
            { userId, couponId: couponDoc._id },
            { used: true, usedAt: new Date() },
            { upsert: true },
          );
        }
      }
    }

    let cartItems = [];

    for (const item of cart) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );

      if (!updatedProduct) {
        throw new Error('OUT_OF_STOCK');
      }

      reservedProducts.push({
        productId: item._id,
        quantity: item.quantity,
      });

      cartItems.push({
        product: item._id,
        productName: item.name,
        category: updatedProduct.category,
        regularPrice: item.regularPrice,
        unitPrice: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        productImage: [item.image],
        stock: updatedProduct.stock,
      });
    }

    if (discount > 0 && cartItems.length > 0) {
      const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
      let remaining = discount;

      cartItems.forEach((item, idx) => {
        const itemDiscount =
          idx === cartItems.length - 1
            ? remaining
            : Math.round((item.subtotal / total) * discount);

        remaining -= itemDiscount;
        item.couponDiscount = itemDiscount;
        item.finalAmount = item.subtotal - itemDiscount;
      });
    } else {
      cartItems.forEach((item) => {
        item.couponDiscount = 0;
        item.finalAmount = item.subtotal;
      });
    }

    const userData = await User.findById(userId).lean();
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    const selectedAddress =
      cached.selectedAddress ||
      addresses.find((a) => a.addressLabel === 'Home') ||
      addresses[0] ||
      null;

    const newOrder = await Order.create({
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
        paymentMode === 'Razorpay' || paymentMode === 'WALLET'
          ? 'paid'
          : 'pending',
      status: 'processing',
      address: selectedAddress ? { ...selectedAddress } : null,
      finalPayable: payableAmount,
      razorpayOrderId,
    });

    newOrder.orderId = `RN${newOrder._id.toString().slice(-6).toUpperCase()}`;
    await newOrder.save();

    await clearPaymentState(userId);
    await Cart.deleteOne({ userId });

    req.session.paymentSuccess = null;
    req.session.razorpayPaymentId = null;
    req.session.appliedCoupon = null;
    req.session.discountValue = null;

    return res.render('placed', {
      user: userData,
      addresses,
      selectedAddress,
      totalAmount: payableAmount,
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error('Order Error:', error);

    for (const r of reservedProducts) {
      await Product.updateOne(
        { _id: r.productId },
        { $inc: { stock: r.quantity } },
      );
    }

    if (error.message === 'OUT_OF_STOCK') {
      if (paymentMode === 'WALLET') {
        await Wallet.updateOne(
          { userId },
          {
            $inc: { balance: payableAmount },
            $push: {
              transactions: {
                amount: payableAmount,
                type: 'credit',
                reason: 'Order failed - Out of stock',
                createdAt: new Date(),
              },
            },
          },
        );
      }

      if (paymentMode === 'Razorpay' && paymentId) {
        await razorpay.payments.refund(paymentId, {
          amount: payableAmount * 100,
        });
      }

      await clearPaymentState(userId);
      return res.redirect('/cart?error=out-of-stock-refunded');
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};

export const paymentFailed = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).redirect('/login');
    }

    const cached = await getPaymentState(userId);

    if (!cached) {
      return res.render('failedPayment', {
        user: req.session.user,
        reason:
          'Your payment session has expired. Please place the order again.',
        retryUrl: '/cart',
        retryExpired: true,
      });
    }
    const paymentMethod =
      req.query.paymentMethod || cached.selectedPaymentMethod;

    if (paymentMethod) {
      await savePaymentState(userId, {
        ...cached,
        selectedPaymentMethod: paymentMethod,
      });
    }

    const existingAttempt = await PaymentAttempt.findOne({
      user: userId,
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, 
    });

  
    const attemptItems = [];

    for (const item of cached.cart) {
      const productDoc = await Product.findById(item._id)
        .select('category')
        .lean();

      attemptItems.push({
        product: item._id,
        productName: item.name,
        category: productDoc?.category || 'Unknown', 
        regularPrice: item.regularPrice || item.price,
        unitPrice: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        productImage: [item.image],
        stock: item.quantity, 
      });
    }

    if (!existingAttempt) {
      await createPaymentAttempt({
        user: userId,
        items: attemptItems,
        totals: {
          subtotal: cached.subtotal,
          discount: cached.discount,
          shippingCharge: cached.shippingCharge,
          finalPayable: cached.payableAmount,
        },
        couponCode: cached.appliedCoupon || null,
        paymentMethod,
        failureReason:
          req.query.reason || 'Payment failed due to gateway error',
      });
    }
    await Order.create({
      user: userId,
      items: attemptItems.map((i) => ({
        product: i.product,
        productName: i.productName,
        category: i.category, 
        regularPrice: i.regularPrice,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        subtotal: i.subtotal,
        productImage: i.productImage,
        stock: i.stock,
        couponDiscount: 0,
        finalAmount: i.subtotal,
      })),
      subtotal: cached.subtotal,
      discount: cached.discount,
      shippingCharge: cached.shippingCharge,
      finalPayable: cached.payableAmount,
      couponCode: cached.appliedCoupon || null,
      paymentMethod,
      paymentStatus: 'failed', 
      status: 'processing', 
      address: cached.selectedAddress || null,
    });

    
    req.session.paymentSuccess = null;
    req.session.razorpayPaymentId = null;

    
    return res.render('failedPayment', {
      user: req.session.user,
      reason: req.query.reason || 'Your payment could not be completed.',
      retryUrl: '/checkout/payment?retry=true',
      retryExpired: false,
      payableAmount: cached.payableAmount,
    });
  } catch (error) {
    console.error('Payment Failed Controller Error:', error);
    return res.render('notFound');
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
      });
    }

    const cached = await getPaymentState(userId);

    if (!cached) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Payment session expired. Please try again.',
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: cached.payableAmount * 100,
      currency: 'INR',
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
    console.error('Razorpay Order Fetch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch payment order',
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
      return res.redirect('/payment-failed?reason=Payment session expired');
    }

    if (cached.razorpayOrderId !== razorpay_order_id) {
      return res.redirect('/payment-failed?reason=Invalid payment order');
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZO_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      req.session.paymentSuccess = null;
      req.session.razorpayPaymentId = null;

      return res.redirect('/payment-failed?reason=Payment verification failed');
    }

    req.session.paymentSuccess = true;
    req.session.razorpayPaymentId = razorpay_payment_id;

    return res.json({ success: true });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false });
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
