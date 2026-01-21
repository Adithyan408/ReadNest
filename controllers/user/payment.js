
import { createRazorpayOrder, loadPayment, orderPlaced, postCoupon, verifyRazorpayPayment, postRemoveCoupon, paymentFailed } from '../../services/user/payment.js';

export const getPayment = async(req, res) => {
    await loadPayment(req, res);
};

export const applyCoupon = async(req, res) => {
    await postCoupon(req, res);
};

export const loadPlace = async(req, res) => {
    await orderPlaced(req, res);
};

export const loadFailed = async(req, res) => {
    await paymentFailed(req, res);
};

export const removeCoupon = async(req, res) => {
    await postRemoveCoupon(req, res);
};
export const razorpay_order = async(req, res) => {
    await createRazorpayOrder(req, res);
};

export const razorpay_verify = async(req, res) => {
    await verifyRazorpayPayment(req, res);
};
