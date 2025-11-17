import express from "express";
import {loadLogin, login, logout, loadPageError, loadDashboard} from '../controllers/admin/adminController.js'
import { customerInfo, blockCustomers, unblockCustomers} from "../controllers/admin/customerController.js"
import {categoryInfo, addCategory, categoryAdd, listCategory, unlistCategory, geteditCategory, editCategory, deleteCategory} from "../controllers/admin/categoryController.js"
import { userAuth, adminAuth } from "../middlewares/auth.js";
import { editProduct, geteditProduct, getProducts, getProductsAdd, productsAdd, listProduct, unlistProduct, deleteProduct } from "../controllers/admin/productController.js";
import upload from "../middlewares/multer.js";
import nocache from "nocache";



export const adminRouter = express.Router();

//Log-in Management
adminRouter.get("/login", loadLogin);
adminRouter.get("/", nocache(), adminAuth, loadDashboard );
adminRouter.get("/logout", nocache(), logout);
adminRouter.get("/pageerror", loadPageError);
adminRouter.post("/login", login)

//User Management
adminRouter.get("/users", nocache(), adminAuth, customerInfo);
adminRouter.get("/blockUsers", adminAuth, blockCustomers);
adminRouter.get("/unblockUsers", adminAuth, unblockCustomers);

//Category Management
adminRouter.get("/category", nocache(), adminAuth, categoryInfo);
adminRouter.get("/addCategory", nocache(), adminAuth, categoryAdd);
adminRouter.post("/addCategory", adminAuth, addCategory);
adminRouter.get("/listCategory", nocache(), adminAuth, listCategory)
adminRouter.get("/unlistCategory", nocache(), adminAuth, unlistCategory)
adminRouter.get("/editCategory", nocache(), adminAuth, geteditCategory)
adminRouter.post("/editCategory", adminAuth, editCategory)
adminRouter.get("/deleteCategory", nocache(), adminAuth , deleteCategory);

//Products MAnagement
adminRouter.get("/products", nocache(), adminAuth, getProducts)
adminRouter.get("/addProducts", nocache(), adminAuth, getProductsAdd)
adminRouter.post("/addProducts", adminAuth, upload.array("productImage", 5), productsAdd);
adminRouter.get("/updateProduct", nocache(), adminAuth, geteditProduct);
adminRouter.post("/updateProduct", adminAuth, upload.array("productImage", 5), editProduct);
adminRouter.get("/listProduct", nocache(), adminAuth, listProduct)
adminRouter.get("/unlistProduct", nocache(), adminAuth, unlistProduct)
adminRouter.get("/deleteProduct", nocache(), adminAuth , deleteProduct);