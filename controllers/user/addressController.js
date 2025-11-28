import { loadAddress, postAddress } from "../../services/user/addressService.js"


export const getAddress = async(req, res) => {
    await loadAddress(req, res);
}

export const addAddress = async(req,res) => {
    console.log("Route Hit");
    await postAddress(req, res);
}