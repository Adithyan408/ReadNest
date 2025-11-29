import { router } from "../../routes/userRouter.js";
import { addcart, cartRemove, loadCart, updateCartQuantity } from "../../services/user/cartService.js"



export const getCart = async(req, res) => {
 await loadCart(req,res);
}

export const postCart = async(req, res) => {
  await addcart(req, res);
}

export const removeCart = async(req, res) => {
    await cartRemove(req, res);
}

export const cartUpdate = async(req, res) => {
    await updateCartQuantity(req, res);
}