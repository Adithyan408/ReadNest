import express from "express";
import {loadLogin, login, loadDashboard, logout, loadPageError} from '../controllers/admin/adminController.js'
import { userAuth, adminAuth } from "../middlewares/auth.js";



export const adminRouter = express.Router();

//Log-in Management
adminRouter.get("/login", loadLogin);
adminRouter.get("/",adminAuth, loadDashboard);
adminRouter.get("/logout", logout);
adminRouter.get("/pageerror", loadPageError);
adminRouter.post("/login", login)

