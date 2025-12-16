import { loadWallet } from "../../services/user/walletService.js"


export const walletLoad = async(req, res) => {
    console.log("Hitt")
    await loadWallet(req, res);
}