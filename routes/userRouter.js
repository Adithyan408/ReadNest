import express from 'express'
import {loadHome, loadNotFound} from '../controllers/user/userController.js'

export const router = express.Router();

router.get("/notfound", loadNotFound)
router.get("/", loadHome)