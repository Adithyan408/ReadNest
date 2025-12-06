import { addressDelete, geteditAddress, loadAddress, postAddress, saveSelectedAddress, updateEditAddress } from "../../services/user/addressService.js"


export const getAddress = async(req, res) => {
    await loadAddress(req, res);
}

export const addAddress = async(req,res) => {
    await postAddress(req, res);
}

export const getSingleAddress = async(req, res) => {
   
    await geteditAddress(req, res);
}

export const updateAddress = async(req, res) => {
     console.log("Update Address");
    await updateEditAddress(req, res);
}

export const deleteAddress  = async(req, res) => {
    await addressDelete(req, res);
}

export const selectedAddressSave = async(req, res) => {
    await saveSelectedAddress(req, res);
}