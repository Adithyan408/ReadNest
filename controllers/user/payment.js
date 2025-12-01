import { loadPayment, orderPlaced, postCoupon } from "../../services/user/payment.js"


export const getPayment = async(req, res) => {
    await loadPayment(req, res);
}

export const applyCoupon = async(req, res) => {
    console.log("Router Hit")
    await postCoupon(req, res);
}

export const loadPlace = async(req, res) => {
    await orderPlaced(req, res);
}