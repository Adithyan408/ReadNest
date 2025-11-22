
import { forgotEmail, forgotPassword, forgotVerify, resetPassword, resetPasswordPost } from "../../services/user/profileSerive.js";

export const getForgotPassword = async (req, res) => {
  await forgotPassword(req, res);
};

export const forgotEmailValid = async (req, res) => {
  await forgotEmail(req, res);
};

export const forgotVerifyOtp = async (req, res) => {
  await forgotVerify(req, res);
};

export const getResetPassword = async (req, res) => {
  await resetPassword(req, res);
}

export const postResetPassword = async (req, res) => {
  await resetPasswordPost(req, res);
};
