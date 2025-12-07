import { loadWishlist, moveAllToCart, moveSingleToCart, removeAllWishlistItems, removeSingleWishlistItem, WishlistToggle } from "../../services/user/wishlistService.js"

export const toggleWishlist = async(req, res) => {
    await WishlistToggle(req, res);
}
export const getWishlist = async(req, res) => {
    await loadWishlist(req, res);
}

export const moveToCart = async(req, res) => {
    await moveSingleToCart(req, res);
}

export const moveAllCart = async(req, res) => {
    await moveAllToCart(req, res);
}

export const removeItem = async(req, res) => {
    await removeSingleWishlistItem(req, res);
}

export const removeAll = async(req, res) => {
    await removeAllWishlistItems(req, res);
}