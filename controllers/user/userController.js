
import passport from "../../config/passport.js";
import { authGoogle, getLogin, getSignup, logoutLoad, notfound, otpResend, otpVerify, postLogin, postSignup, profileLoad, verifyLoad } from "../../services/user/userService.js";




export const loadNotFound = async (req, res) => {
  await notfound(req, res);
};

export const loadSigup = async (req, res) => {
  await getSignup(req, res);
};

export const loadLogin = async (req, res) => {
  await getLogin(req, res);
};

export const login = async (req, res) => {
  await postLogin(req, res);
};

export const signup = async (req, res) => {
  await postSignup(req, res);
};


export const verifyOtp = async (req, res) => {
  await otpVerify(req, res);
};

export const loadVerify = async (req, res) => {
  await verifyLoad(req, res);
};

export const resendOtp = async (req, res) => {
  await otpResend(req, res);
};

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleAuthCallback = async (req, res) => {
  await authGoogle(req, res);
};

export const loadProfile = async (req, res) => {
  await profileLoad(req, res);
};

export const logout = async (req, res) => {
  await logoutLoad(req, res);
};
