
import { loadEditProducts, loadFilteredProducts, loadProductsAdd, postEditProducts, postProducts, productDelete, productList, productUnlist } from "../../services/admin/productService.js";

export const getProductsAdd = async (req, res) => {
  await loadProductsAdd(req, res);
};

export const productsAdd = async (req, res) => {
  await postProducts(req, res);
};

export const geteditProduct = async (req, res) => {
  await loadEditProducts(req, res);
};

export const editProduct = async (req, res) => {
  await postEditProducts(req, res);
};

export const listProduct = async (req, res) => {
  await productList(req, res);
};

export const unlistProduct = async (req, res) => {
  await productUnlist(req, res);
};

export const deleteProduct = async (req, res) => {
  await productDelete(req, res);
};

export const getFilteredProducts = async (req, res) => {
  await loadFilteredProducts(req, res);
};
