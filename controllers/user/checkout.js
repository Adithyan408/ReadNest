import { addNewAddress,  getCheckout, saveAddress, setSelectedAddress, updateCheckoutQuantity } from '../../services/user/checkoutService.js';

export const loadCheckout = async(req, res) => {
    await getCheckout(req, res);
};

export const addresChoose = async(req, res) => {
    await setSelectedAddress(req, res);
};

export const addAddressNew = async(req, res) => {
    await addNewAddress(req, res);
};

export const postAddress = async(req, res) => {
    await saveAddress(req, res);
};

export const checkoutUpdate = async(req, res) => {
    await updateCheckoutQuantity(req, res);
};
