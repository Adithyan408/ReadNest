import express from "express";
import {loadLogin, login, loadDashboard, logout, loadPageError} from '../controllers/admin/adminController.js'
import { customerInfo, blockCustomers, unblockCustomers} from "../controllers/admin/customerController.js"
import {categoryInfo, addCategory, categoryAdd, listCategory, unlistCategory, geteditCategory, editCategory, deleteCategory} from "../controllers/admin/categoryController.js"
import { userAuth, adminAuth } from "../middlewares/auth.js";
import { editProduct, geteditProduct, getProducts, getProductsAdd, productsAdd, listProduct, unlistProduct, deleteProduct } from "../controllers/admin/productController.js";
import upload from "../middlewares/multer.js";



export const adminRouter = express.Router();

//Log-in Management
adminRouter.get("/login", loadLogin);
adminRouter.get("/",adminAuth, loadDashboard);
adminRouter.get("/logout", logout);
adminRouter.get("/pageerror", loadPageError);
adminRouter.post("/login", login)

//User Management
adminRouter.get("/users", adminAuth, customerInfo);
adminRouter.get("/blockUsers", adminAuth, blockCustomers);
adminRouter.get("/unblockUsers", adminAuth, unblockCustomers);

//Category Management
adminRouter.get("/category", adminAuth, categoryInfo);
adminRouter.get("/addCategory", adminAuth, categoryAdd);
adminRouter.post("/addCategory", adminAuth, addCategory);
adminRouter.get("/listCategory", adminAuth, listCategory)
adminRouter.get("/unlistCategory", adminAuth, unlistCategory)
adminRouter.get("/editCategory", adminAuth, geteditCategory)
adminRouter.post("/editCategory", adminAuth, editCategory)
adminRouter.get("/deleteCategory", adminAuth , deleteCategory);

//Products MAnagement
adminRouter.get("/products", adminAuth, getProducts)
adminRouter.get("/addProducts", adminAuth, getProductsAdd)
adminRouter.post("/addProducts", adminAuth, upload.single("productImage"), productsAdd);
adminRouter.get("/updateProduct", adminAuth, geteditProduct);
adminRouter.post("/updateProduct", adminAuth, upload.array("productImage", 5), editProduct);
adminRouter.get("/listProduct", adminAuth, listProduct)
adminRouter.get("/unlistProduct", adminAuth, unlistProduct)
adminRouter.get("/deleteProduct", adminAuth , deleteProduct);