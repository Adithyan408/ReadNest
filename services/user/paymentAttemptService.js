import Razorpay from 'razorpay';
import paymentAttempt from '../../models/failedPayment.js';
import Order from '../../models/orderSchema.js';
import crypto from 'crypto';
import Product from '../../models/productsSchema.js';
import mongoose from 'mongoose';


const razorpay = new Razorpay({
  key_id: process.env.RAZO_API_KEY,
  key_secret: process.env.RAZO_KEY_SECRET,
});


export const createPaymentAttempt = async ({
    user, 
    items, 
    totals, 
    couponCode, 
    paymentMethod, 
    failureReason, 
}) => {
    return await paymentAttempt.create({
    user, 
    items, 
    ...totals, 
    couponCode, 
    paymentMethod, 
    failureReason, 
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
};

export const retryPayment = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false });
    }

    const attempt = await paymentAttempt.findOne({
        _id: attemptId,
        user: userId,
        status: 'failed',
      })
      .populate('items.product');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Retry session expired',
      });
    }

    /* ---------- 7 DAY RETRY LIMIT ---------- */
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - attempt.createdAt.getTime() > SEVEN_DAYS) {
      return res.status(400).json({
        success: false,
        message: 'Retry period expired',
      });
    }

    /* ---------- MAX RETRY LIMIT ---------- */
    if (attempt.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry attempts reached',
      });
    }

    /* ---------- STOCK REVALIDATION ---------- */
    for (const item of attempt.items) {
      if (!item.product || item.product.stock < item.quantity) {
        return res.json({
          success: false,
          message: `${item.productName} is out of stock`,
        });
      }
    }

    /* ---------- CREATE NEW RAZORPAY ORDER ---------- */
    const razorpayOrder = await razorpay.orders.create({
      amount: attempt.totals.finalPayable * 100,
      currency: 'INR',
      receipt: `retry_${attempt._id}_${Date.now()}`,
    });

    attempt.razorpayOrderId = razorpayOrder.id;
    attempt.retryCount += 1;
    await attempt.save();

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });

  } catch (error) {
    console.error('Retry Payment Error:', error);
    res.status(500).json({ success: false });
  }
};

export const verifyRetryPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      attemptId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const attempt = await paymentAttempt
      .findById(attemptId)
      .populate('items.product')
      .session(session);

    /* ---------- BASIC VALIDATION ---------- */
    if (!attempt || attempt.status !== 'failed') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid attempt' });
    }

    /* ---------- EXPIRY CHECK ---------- */
    if (attempt.expiresAt < new Date()) {
      attempt.status = 'expired';
      await attempt.save({ session });
      await session.commitTransaction();

      return res.status(400).json({
        success: false,
        message: 'Payment retry window expired',
      });
    }

    /* ---------- VERIFY RAZORPAY SIGNATURE ---------- */
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZO_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Verification failed' });
    }

    /* ---------- STOCK REVALIDATION ---------- */
    for (const item of attempt.items) {
      if (!item.product || item.product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${item.productName} is out of stock`,
        });
      }
    }

    /* ---------- BUILD ORDER ITEMS ---------- */
    const orderItems = attempt.items.map((item) => ({
      product: item.product._id,
      category: item.product.category,
      productName: item.product.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.unitPrice * item.quantity,
      productImage: item.productImage,
      stock: item.product.stock - item.quantity,
    }));

    /* ---------- CREATE ORDER ---------- */
    const order = await Order.create(
      [
        {
          user: attempt.user,
          items: orderItems,
          subtotal: attempt.subtotal,
          discount: attempt.discount,
          shippingCharge: attempt.shippingCharge,
          finalPayable: attempt.finalPayable,
          couponCode: attempt.couponCode,
          paymentMethod: attempt.paymentMethod,
          paymentStatus: 'paid',
          status: 'processing',
        },
      ],
      { session },
    );

    /* ---------- UPDATE STOCK ---------- */
    for (const item of attempt.items) {
      await Product.updateOne(
        { _id: item.product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session },
      );
    }

    /* ---------- MARK ATTEMPT CONVERTED ---------- */
    attempt.status = 'converted';
    attempt.convertedOrder = order[0]._id;
    await attempt.save({ session });

    /* ---------- CLEANUP OTHER FAILED ATTEMPTS ---------- */
    await paymentAttempt.deleteMany(
      {
        user: attempt.user,
        status: 'failed',
        _id: { $ne: attempt._id },
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      orderId: order[0]._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Retry Payment Verify Error:', error);
    return res.status(500).json({ success: false });
  }
};