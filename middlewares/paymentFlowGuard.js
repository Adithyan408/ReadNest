import { clearPaymentState } from '../helpers/paymentCache.js';

const PAYMENT_SAFE_ROUTES = [
  '/checkout/payment',
  '/apply-coupon',
  '/remove-coupon',
  '/save-payment-method',
  '/create-razorpay-order',
  '/verify-razorpay-payment',
  '/pay-with-wallet',
  '/place-order',
  '/payment-failed',
];

export const paymentFlowGuard = async (req, res, next) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return next();

    // Only act if user is inside payment flow
    if (!req.session.inPaymentFlow) {
      return next();
    }

    const isRetry = req.query.retry === 'true';

    const isSafeRoute = PAYMENT_SAFE_ROUTES.some((route) =>
      req.path.startsWith(route),
    );

    /**
     * User navigated away from payment flow
     * → Clear payment state
     */
    if (!isSafeRoute && !isRetry) {
      await clearPaymentState(userId);
      req.session.inPaymentFlow = false;
    }

    next();
  } catch (err) {
    console.error('Payment Flow Guard Error:', err);
    next();
  }
};
