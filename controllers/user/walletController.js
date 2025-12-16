import { loadWallet, razorpayOrderCreate, walletVerify } from "../../services/user/walletService.js"


export const walletLoad = async(req, res) => {
    console.log("Hitt")
    await loadWallet(req, res);
}

export const createWalletRazorpayOrder = async(req, res) => {
    await razorpayOrderCreate(req, res);
}

export const verifyWalletRazorpayPayment = async(req, res) => {
    await walletVerify(req, res);
}