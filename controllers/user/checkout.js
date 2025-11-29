import { getCheckout, setSelectedAddress } from "../../services/user/checkoutService.js"


export const loadCheckout = async(req, res) => {
    await getCheckout(req, res);
}

export const addresChoose = async(req, res) => {
    await setSelectedAddress(req, res);
}