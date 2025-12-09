
import {  homeLoad, productDetails, searchLive } from "../../services/user/productService.js";


export const loadHome = async (req, res) => {
  await homeLoad(req, res);
};

export const getProductsDetails = async (req, res) => {
  await productDetails(req, res);
};


export const liveSearch = async(req, res) => {
    await searchLive(req, res);
}