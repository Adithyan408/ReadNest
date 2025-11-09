import express from 'express'
import {loadHome, loadNotFound, loadSigup, loadLogin, signup, verifyOtp, loadVerify, resendOtp, googleAuth, googleAuthCallback,
     login, loadProfile, logout} from '../controllers/user/userController.js'

export const router = express.Router();

router.get("/notfound", loadNotFound)
router.get("/", loadHome)
router.get("/signup",loadSigup)
router.get("/login", loadLogin)
router.get("/verify-otp",loadVerify);
router.get("/auth/google", googleAuth)
router.get("/auth/google/callback", googleAuthCallback)
router.get("/profile", loadProfile); 
router.get("/logout", logout)


router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login)


 