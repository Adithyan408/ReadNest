
import { getDashboard, pageError, postLogout, getLogin, postLogin } from "../../services/admin/adminService.js";

export const loadPageError = async(req, res) => {
  await pageError(req, res);
};

export const loadLogin = async(req, res) => {
  await getLogin(req, res);
};

export const login = async (req, res) => {
  await postLogin(req, res);
};

export const loadDashboard = async(req, res) => {
  await getDashboard(req, res);
};

export const logout = async (req, res) => {
  await postLogout(req, res);
};

