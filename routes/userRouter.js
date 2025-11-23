import express from 'express'
import { loadNotFound, loadSigup, loadLogin, signup, verifyOtp, loadVerify, resendOtp, googleAuth, googleAuthCallback,
     login, loadProfile, logout} from '../controllers/user/userController.js'
import { forgotEmailValid, getForgotPassword, getResetPassword, postResetPassword, forgotVerifyOtp, updateName, updatePhone, setPassword, verifyPassword, changePassword, updateEmail, updateVerifyEmail } from '../controllers/user/profileController.js';
import { getProductsDetails, loadHome, getComboOffers, getRushHourOffers, liveSearch } from '../controllers/user/productController.js';
import nocache from 'nocache';

export const router = express.Router();

router.get("/notfound", loadNotFound)
router.get("/", nocache(), loadHome)
router.get("/signup", nocache(),loadSigup)
router.get("/login", nocache(), loadLogin)
router.get("/verify-otp",loadVerify);
router.get("/auth/google", googleAuth)
router.get("/auth/google/callback", googleAuthCallback)
router.get("/account", loadProfile); 
router.get("/logout", nocache(), logout)



router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login)
router.post("/account/update-name", updateName);
router.post("/account/update-phone", updatePhone);
router.post("/account/set-password", setPassword);
router.post("/account/verifypassword", verifyPassword);
router.post("/account/change-password", changePassword);
router.post("/account/email-update", updateEmail);
router.post("/account/verify-email-update", updateVerifyEmail);



router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", forgotEmailValid )

router.get("/reset-password", nocache(), getResetPassword)
router.post("/reset-password", postResetPassword)

router.post("/forgot-verify-otp", forgotVerifyOtp);

router.get("/product",getProductsDetails)
router.get("/live-search", liveSearch)

router.get("/combo", getComboOffers);
router.get("/rush-hour", getRushHourOffers);

 