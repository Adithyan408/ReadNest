import { deleteCoupon, loadAddCoupon, loadCoupon, postAddCoupon, updateCoupon } from "../../services/admin/couponService.js"

export const getCoupon = async(req, res) => {
    await loadCoupon(req, res);
}

export const getAddCoupon = async(req, res) => {
    await loadAddCoupon(req, res);
}

export const postCouponAdd = async(req, res) => {
    await postAddCoupon(req, res);
}

export const couponUpdate = async(req, res) => {
    await updateCoupon(req, res);
}

export const couponDelete = async(req, res) => {
    await deleteCoupon(req, res);
}