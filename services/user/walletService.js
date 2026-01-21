import Wallet from '../../models/walletSchema.js';
import crypto from 'crypto';
import { creditWallet, debitWallet } from '../../middlewares/walletHandler.js';
import { getPaymentState } from '../../helpers/paymentCache.js';

export const loadWallet = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 4;
    const skip = (page - 1) * limit;
    if (!req.session.user || !req.session.user._id) {
      return res.redirect('/login');
    }

    const userId = req.session.user._id;

    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    let totalRefunds = 0;
    let totalSpent = 0;
    let totalAdded = 0;

    wallet.transactions.forEach((tx) => {
      if (tx.type === 'credit') {
        totalAdded += tx.amount;

        if (tx.note?.toLowerCase().includes('refund')) {
          totalRefunds += tx.amount;
        }
      }

      if (tx.type === 'debit') {
        totalSpent += tx.amount;
      }
    });
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    const paginatedTransactions = wallet.transactions
      .slice()
      .reverse()
      .slice(skip, skip + limit);

    wallet.transactions = paginatedTransactions;

    res.render('wallet', {
      wallet,
      totalRefunds,
      totalSpent,
      totalAdded,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error('Wallet Load Error:', err);
    res.redirect('/500');
  }
};

import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZO_API_KEY,
  key_secret: process.env.RAZO_KEY_SECRET,
});

export const razorpayOrderCreate = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `wallet_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
};

export const walletVerify = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZO_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      return res.json({ success: false });
    }

    // ✅ Credit wallet
    await creditWallet({
      userId: req.session.user._id,
      amount: Number(amount),
      note: 'Wallet top-up',
      paymentId: razorpay_payment_id,
      source: 'topup',
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
};

export const walletPayment = async (req, res) => {
  try {

    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    const cached = await getPaymentState(userId);
    if (!cached) {
      return res.json({
        success: false,
        message: 'Payment session expired',
      });
    }
    
    const payableAmount = Number(cached.payableAmount);

    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      return res.json({
        success: false,
        message: 'Invalid payable amount',
      });
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < payableAmount) {
      return res.json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    await debitWallet({
      userId,
      amount: payableAmount,
      note: 'Order payment via wallet',
      paymentId: `WALLET-${Date.now()}`,
    });

    req.session.paymentSuccess = true;
    req.session.razorpayPaymentId = null;

    return res.json({ success: true });
  } catch (error) {
    console.error('Wallet Payment Error:', error);
    return res.json({
      success: false,
      message: 'Wallet payment failed',
    });
  }
};
