import { loadWallet, razorpayOrderCreate, walletPayment, walletVerify } from '../../services/user/walletService.js';

export const walletLoad = async(req, res) => {
    await loadWallet(req, res);
};

export const createWalletRazorpayOrder = async(req, res) => {
    await razorpayOrderCreate(req, res);
};

export const verifyWalletRazorpayPayment = async(req, res) => {
    await walletVerify(req, res);
};

export const payWithWallet = async(req, res) => {
    await walletPayment(req, res);
};
