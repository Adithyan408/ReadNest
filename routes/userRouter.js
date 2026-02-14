import express from 'express';
import {
  loadNotFound,
  loadSigup,
  loadLogin,
  signup,
  verifyOtp,
  loadVerify,
  resendOtp,
  googleAuth,
  googleAuthCallback,
  login,
  loadProfile,
  logout,
} from '../controllers/user/userController.js';
import {
  forgotEmailValid,
  getForgotPassword,
  getResetPassword,
  postResetPassword,
  forgotVerifyOtp,
  setPassword,
  verifyPassword,
  changePassword,
  updateEmail,
  updateVerifyEmail,
  uploadProfileImage,
  deleteProfileImage,
  profileUpdate,
} from '../controllers/user/profileController.js';
import {
  getProductsDetails,
  loadHome,
  liveSearch,
} from '../controllers/user/productController.js';
import nocache from 'nocache';
import upload from '../middlewares/multer.js';
import { addAddress, deleteAddress, getAddress, getSingleAddress, selectedAddressSave, updateAddress } from '../controllers/user/addressController.js';
import {  cartUpdate, getCart, postCart, removeCart, validateCart } from '../controllers/user/cartController.js';
import { addAddressNew, addresChoose, checkoutUpdate, loadCheckout, postAddress } from '../controllers/user/checkout.js';

import { applyCoupon, getPayment, loadFailed, loadPlace, razorpay_order, razorpay_verify, removeCoupon } from '../controllers/user/payment.js';

import { cancelOrder, fullOrderCancel, invoicedownload, listOrders, loadOrderDetails,  returnOrder } from '../controllers/user/orderController.js';
import { getWishlist, moveAllCart, moveToCart, removeAll, removeItem, toggleWishlist } from '../controllers/user/wishlistController.js';
import { createWalletRazorpayOrder, payWithWallet, verifyWalletRazorpayPayment, walletLoad } from '../controllers/user/walletController.js';
import { blogComment, blogInsights, blogLike, blogList, blogSearch, deleteBlog, deleteComment, editBlog, editComment, getEditBlog, getSingleBlog, loadAddBlog, notificationGet, postCreateBlog, postEditBlog, readNotification, savedBlog, saveToggleBlog, stories, unReadNotification } from '../controllers/user/blogController.js';
import { userAuth } from '../middlewares/auth.js';
import { getProductStatus } from '../services/user/productService.js';

export const router = express.Router();

router.get('/notfound', loadNotFound);
router.get('/', nocache(), loadHome);
router.get('/signup', nocache(), loadSigup);
router.get('/login', nocache(), loadLogin);
router.get('/verify-otp', nocache(), loadVerify);
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallback);
router.get('/account', userAuth , loadProfile);
router.get('/logout', nocache(), logout);
router.get('/account/delete-profile-image', deleteProfileImage);
router.get('/address', getAddress);

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/account/update-profile', userAuth, profileUpdate);
router.post('/account/set-password', setPassword);
router.post('/account/verifypassword', userAuth, verifyPassword);
router.post('/account/change-password', changePassword);
router.post('/account/email-update', updateEmail);
router.post('/account/verify-email-update', updateVerifyEmail);
router.post('/account/profile-image', upload.single('profileImage'), uploadProfileImage);
router.post('/account/add-address', addAddress);
router.get('/account/address/:id', userAuth, getSingleAddress);
router.put('/account/address/update/:id', userAuth, updateAddress);
router.get('/account/address/delete/:id', userAuth, deleteAddress);
router.get('/wishlist', userAuth, getWishlist);
router.post('/wishlist/toggle', userAuth, toggleWishlist);
router.post('/wishlist/move-to-cart',  userAuth, moveToCart);
router.post('/wishlist/move-all-to-cart', userAuth, moveAllCart);
router.post('/wishlist/remove', userAuth, removeItem);
router.post('/wishlist/remove-all',userAuth, removeAll);

router.get('/cart', userAuth, getCart);
router.post('/addcart', userAuth, postCart);
router.get('/remove-from-cart', userAuth, removeCart);
router.post('/update-cart-quantity', userAuth, cartUpdate);
router.get('/cart/validate', userAuth, validateCart);

router.get('/checkout', userAuth, loadCheckout);
router.post('/set-address', userAuth, addresChoose);
router.post('/add-address', userAuth, addAddressNew);
router.post('/save-address', userAuth, postAddress);

router.get('/checkout/payment',userAuth, getPayment);
router.post('/checkout/update-quantity',userAuth, checkoutUpdate);
router.post('/apply-coupon',userAuth, applyCoupon);
router.get('/place-order',userAuth, loadPlace);
router.post('/remove-coupon',userAuth, removeCoupon);
router.get('/payment-failed',userAuth, loadFailed);
router.post('/create-razorpay-order',userAuth, razorpay_order);
router.post('/verify-razorpay-payment',userAuth, razorpay_verify);

router.get('/orders/:orderId',userAuth,  loadOrderDetails);
router.get('/orders/:orderId/invoice',userAuth, invoicedownload);
router.get('/orders',userAuth,  listOrders);

router.post('/orders/:orderId/items/:itemId/cancel', nocache(), cancelOrder);
router.post('/orders/:orderId/items/:itemId/return', returnOrder);
router.post('/orders/:orderId/cancel', fullOrderCancel);

router.get('/forgot-password', getForgotPassword);
router.post('/forgot-password', forgotEmailValid);

router.get('/reset-password', nocache(), getResetPassword);
router.post('/reset-password', postResetPassword);

router.get('/wallet',userAuth, walletLoad);
router.post('/wallet/create-razorpay-order',userAuth, createWalletRazorpayOrder);
router.post('/wallet/verify-razorpay-payment',userAuth, verifyWalletRazorpayPayment);
router.post('/pay-with-wallet',userAuth, payWithWallet);

router.post('/forgot-verify-otp', forgotVerifyOtp);

router.get('/product',userAuth, getProductsDetails);
router.get('/status/:productId',userAuth, getProductStatus);
router.get('/live-search',userAuth, liveSearch);

router.get('/blog', userAuth, blogList);
router.get('/blog/addBlog', userAuth, loadAddBlog);
router.post('/blog/addBlog', userAuth, postCreateBlog);
router.get('/blogs/:id', userAuth, getSingleBlog);
router.post('/blog/like', userAuth, blogLike);
router.post('/blog/comment', userAuth, blogComment);
router.get('/blog/library', userAuth, savedBlog);
router.post('/blogs/save', userAuth, saveToggleBlog);
router.get('/blog/stories', userAuth, stories);
router.delete('/blog/delete/:id', userAuth, deleteBlog);
router.get('/blog/edit/:id', userAuth, getEditBlog);
router.post('/blog/edit/:id', userAuth, postEditBlog);
router.delete('/blog/comment/:id', userAuth, deleteComment);
router.put('/blog/edit/:id', userAuth, editBlog);
router.put('/blog/comment/:id', userAuth, editComment);
router.get('/blog/search', userAuth, blogSearch);
router.get('/notifications', userAuth, notificationGet);
router.get('/notifications/unread-count', userAuth, unReadNotification);
router.post('/notifications/mark-all-read', userAuth, readNotification);
router.get('/insights', userAuth, blogInsights);
