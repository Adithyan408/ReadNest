import {
  forgotEmail,
  forgotPassword,
  forgotVerify,
  passwordSet,
  resetPassword,
  resetPasswordPost,
  passwordVerify,
  passwordChange,
  emailUpdate,
  verifyEmailUpdate,
  profileImage,
  profileImageDelete,
  updateProfile
} from "../../services/user/profileSerive.js";

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
};

export const postResetPassword = async (req, res) => {
  await resetPasswordPost(req, res);
};

export const profileUpdate = async(req, res) => {
  await updateProfile(req, res);
}
export const updateEmail = async (req, res) => {
  await emailUpdate(req, res);
};

export const updateVerifyEmail = async (req, res) => {
  await verifyEmailUpdate(req, res);
};

export const setPassword = async (req, res) => {
  await passwordSet(req, res);
};

export const verifyPassword = async (req, res) => {
  await passwordVerify(req, res);
};
export const changePassword = async (req, res) => {
  await passwordChange(req, res);
};
export const uploadProfileImage = async (req, res) => {
  await profileImage(req, res);
};

export const deleteProfileImage = async (req, res) => {
  await profileImageDelete(req, res);
};
