
import { bannerDelete, loadBanner, loadBannerAdd, loadEditBanner, postBannerAdd, postEditBanner } from "../../services/admin/bannerService.js";

export const getBanner = async (req, res) => {
  await loadBanner(req, res);
};

export const getBannerAdd = async (req, res) => {
  await loadBannerAdd(req, res);
};

export const bannerAdd = async (req, res) => {
  await postBannerAdd(req, res);
};

export const geteditBanner = async (req, res) => {
  await loadEditBanner(req, res);
};

export const editBanner = async (req, res) => {
  await postEditBanner(req, res);
};

export const deleteBanner = async (req, res) => {
  await bannerDelete(req, res);
};
