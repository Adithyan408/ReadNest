import { router } from "../../routes/userRouter.js";
import { addcart, cartRemove, loadCart } from "../../services/user/cartService.js"



export const getCart = async(req, res) => {
 await loadCart(req,res);
}

export const postCart = async(req, res) => {
  await addcart(req, res);
}

export const removeCart = async(req, res) => {
    await cartRemove(req, res);
}