import express from "express";
import {
  loadLogin,
  login,
  logout,
  loadPageError,
  loadDashboard,
  downloadSalesReport,
  downloadExcel,
} from "../controllers/admin/adminController.js";
import {
  customerInfo,
  blockCustomers,
  unblockCustomers,
} from "../controllers/admin/customerController.js";
import {
  categoryInfo,
  addCategory,
  categoryAdd,
  listCategory,
  unlistCategory,
  geteditCategory,
  editCategory,
  deleteCategory,
} from "../controllers/admin/categoryController.js";
import { userAuth, adminAuth } from "../middlewares/auth.js";
import {
  editProduct,
  geteditProduct,
  getProductsAdd,
  productsAdd,
  listProduct,
  unlistProduct,
  deleteProduct,
  getFilteredProducts,
  imageUpload,
} from "../controllers/admin/productController.js";
import upload from "../middlewares/multer.js";
import nocache from "nocache";
import {
  getBanner,
  getBannerAdd,
  bannerAdd,
  geteditBanner,
  editBanner,
  deleteBanner,
} from "../controllers/admin/bannerController.js";
import {
  getOrderList,
  loadOrderDetails,
  postOrderUpdate,
  returnApprove,
  returnReject,
  updateSingleItemStatus,
} from "../controllers/admin/orderController.js";
import {
  couponDelete,
  couponUpdate,
  getAddCoupon,
  getCoupon,
  postCouponAdd,
} from "../controllers/admin/couponController.js";

export const adminRouter = express.Router();

//Log-in Management
adminRouter.get("/login", loadLogin);
adminRouter.get("/", nocache(), adminAuth, loadDashboard);
adminRouter.get("/logout", nocache(), logout);
adminRouter.get("/pageerror", loadPageError);
adminRouter.post("/login", login);

//User Management
adminRouter.get("/users", nocache(), adminAuth, customerInfo);
adminRouter.get("/blockUsers", adminAuth, blockCustomers);
adminRouter.get("/unblockUsers", adminAuth, unblockCustomers);

//Category Management
adminRouter.get("/category", nocache(), adminAuth, categoryInfo);
adminRouter.get("/category/addCategory", nocache(), adminAuth, categoryAdd);
adminRouter.post("/addCategory", nocache(), adminAuth, addCategory);
adminRouter.get("/listCategory", nocache(), adminAuth, listCategory);
adminRouter.get("/unlistCategory", nocache(), adminAuth, unlistCategory);
adminRouter.get("/editCategory", nocache(), adminAuth, geteditCategory);
adminRouter.post("/editCategory", adminAuth, editCategory);
adminRouter.get("/deleteCategory", nocache(), adminAuth, deleteCategory);

//Products Management
adminRouter.get("/products/addProducts", nocache(), adminAuth, getProductsAdd);
adminRouter.post(
  "/addProducts",
  nocache(),
  adminAuth,
  upload.array("productImage", 5),
  productsAdd
);
adminRouter.get("/updateProduct", nocache(), adminAuth, geteditProduct);
adminRouter.post(
  "/updateProduct",
  adminAuth,
  upload.array("productImage", 5),
  editProduct
);
adminRouter.get("/listProduct", nocache(), adminAuth, listProduct);
adminRouter.get("/unlistProduct", nocache(), adminAuth, unlistProduct);
adminRouter.get("/deleteProduct", nocache(), adminAuth, deleteProduct);
adminRouter.get("/products", nocache(), adminAuth, getFilteredProducts);
adminRouter.post(
  "/upload-cropped",
  nocache(),
  adminAuth,
  upload.array("croppedImages", 5),
  imageUpload
);

//Banner Management
adminRouter.get("/banner", adminAuth, getBanner);
adminRouter.get("/banner/addBanner", nocache(), adminAuth, getBannerAdd);
adminRouter.post(
  "/banner/addBanner",
  nocache(),
  adminAuth,
  upload.single("bannerImage"),
  bannerAdd
);
adminRouter.get("/banner/updateBanner", nocache(), adminAuth, geteditBanner);
adminRouter.post(
  "/banner/updateBanner",
  nocache(),
  adminAuth,
  upload.single("bannerImage"),
  editBanner
);
adminRouter.get("/deleteBanner", nocache(), adminAuth, deleteBanner);

//Order Managment
adminRouter.get("/orders", adminAuth, getOrderList);
adminRouter.post("/orders/:orderId/status", adminAuth, postOrderUpdate);
adminRouter.get("/orders/:orderId", adminAuth, loadOrderDetails);
adminRouter.post("/orders/:orderId/items/:itemId/approve-return", adminAuth , returnApprove);
adminRouter.post("/orders/:orderId/items/:itemId/reject-return", adminAuth , returnReject);

adminRouter.post(
  "/orders/:ordersId/items/:itemId/status",
  adminAuth,
  updateSingleItemStatus
);
adminRouter.get("/coupon", adminAuth, getCoupon);
adminRouter.get("/coupon/addCoupon", adminAuth, getAddCoupon);
adminRouter.post("/coupon/addCoupon", adminAuth, postCouponAdd);
adminRouter.post("/coupon/updateCoupon", adminAuth, couponUpdate);
adminRouter.get("/coupon/delete", adminAuth, couponDelete);

adminRouter.get(
  "/sales-report/download",
  adminAuth,
  downloadSalesReport
);
adminRouter.get("/sales-report/excel",adminAuth, downloadExcel);

