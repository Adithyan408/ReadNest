import { addNewAddress, getBuyNow, getCheckout, saveAddress, setSelectedAddress, validateBuyNow } from "../../services/user/checkoutService.js"


export const loadCheckout = async(req, res) => {
    await getCheckout(req, res);
}

export const addresChoose = async(req, res) => {
    await setSelectedAddress(req, res);
}

export const addAddressNew = async(req, res) => {
    await addNewAddress(req, res);
}

export const postAddress = async(req, res) => {
    await saveAddress(req, res);
}

export const loadBuyNow = async(req, res) => {
    await getBuyNow(req, res) ;
}

export const buyNowValidation = async(req, res) => {
    await validateBuyNow(req, res);
}