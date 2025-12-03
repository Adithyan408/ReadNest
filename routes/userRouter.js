import express from "express";
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
} from "../controllers/user/userController.js";
import {
  forgotEmailValid,
  getForgotPassword,
  getResetPassword,
  postResetPassword,
  forgotVerifyOtp,
  updateName,
  updatePhone,
  setPassword,
  verifyPassword,
  changePassword,
  updateEmail,
  updateVerifyEmail,
  uploadProfileImage,
  deleteProfileImage
} from "../controllers/user/profileController.js";
import {
  getProductsDetails,
  loadHome,
  getComboOffers,
  getRushHourOffers,
  liveSearch,
} from "../controllers/user/productController.js";
import nocache from "nocache";
import upload from "../middlewares/multer.js";
import { addAddress, deleteAddress, getAddress, getSingleAddress, updateAddress } from "../controllers/user/addressController.js";
import { buyNowUpdate, cartUpdate, getCart, postCart, removeCart } from "../controllers/user/cartController.js";
import { addAddressNew, addresChoose, loadBuyNow, loadCheckout, postAddress } from "../controllers/user/checkout.js";
import { applyCoupon, getPayment, loadPlace } from "../controllers/user/payment.js";
import { cancelOrder, invoicedownload, loadOrderDetails, loadOrderList, returnOrder } from "../controllers/user/orderController.js";

export const router = express.Router();

router.get("/notfound", loadNotFound);
router.get("/", nocache(), loadHome);
router.get("/signup", nocache(), loadSigup);
router.get("/login", nocache(), loadLogin);
router.get("/verify-otp", loadVerify);
router.get("/auth/google", googleAuth);
router.get("/auth/google/callback", googleAuthCallback);
router.get("/account", loadProfile);
router.get("/logout", nocache(), logout);
router.get("/account/delete-profile-image", deleteProfileImage);
router.get("/address", getAddress)


router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/account/update-name", updateName);
router.post("/account/update-phone", updatePhone);
router.post("/account/set-password", setPassword);
router.post("/account/verifypassword", verifyPassword);
router.post("/account/change-password", changePassword);
router.post("/account/email-update", updateEmail);
router.post("/account/verify-email-update", updateVerifyEmail);
router.post("/account/profile-image", upload.single("profileImage"), uploadProfileImage);
router.post("/account/add-address", addAddress);
router.get("/account/address/:id", getSingleAddress);
router.put("/account/address/update/:id", updateAddress);
router.get("/account/address/delete/:id", deleteAddress);


router.get("/cart", getCart)
router.post("/addcart", postCart)
router.get("/remove-from-cart", removeCart)
router.post("/update-cart-quantity", cartUpdate);
router.post("/update-buyNow-qty", buyNowUpdate);


router.get("/checkout", loadCheckout)
router.post("/set-address", addresChoose);
router.post("/add-address", addAddressNew);
router.post("/save-address", postAddress);

router.get("/checkout/payment", getPayment)
router.post("/apply-coupon", applyCoupon);
router.get("/place-order", loadPlace)
router.get("/buy-now/:id",loadBuyNow)


router.get("/orders", loadOrderList);
router.get("/orders/:orderId", loadOrderDetails);
router.get("/orders/:orderId/invoice", invoicedownload);


router.post("/orders/:orderId/items/:itemId/cancel", cancelOrder);
router.post("/orders/:orderId/items/:itemId/return",returnOrder);

router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", forgotEmailValid);

router.get("/reset-password", nocache(), getResetPassword);
router.post("/reset-password", postResetPassword);

router.post("/forgot-verify-otp", forgotVerifyOtp);

router.get("/product", getProductsDetails);
router.get("/live-search", liveSearch);

router.get("/combo", getComboOffers);
router.get("/rush-hour", getRushHourOffers);
