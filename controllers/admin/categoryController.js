
import { categoryDelete, categoryLoad, getCategory, getEditCategory, getListCategory, getunlistCategory, postCategory, postEditCategory } from "../../services/admin/categoryService.js";

export const categoryInfo = async (req, res) => {
  await categoryLoad(req, res);
};

export const addCategory = async (req, res) => {
  await postCategory(req, res);
};

export const categoryAdd = async (req, res) => {
  await getCategory(req, res);
};

export const listCategory = async (req, res) => {
  await getListCategory(req, res);
};

export const unlistCategory = async (req, res) => {
  await getunlistCategory(req, res);
};


export const geteditCategory = async (req, res) => {
  await getEditCategory(req, res);
};

export const editCategory = async (req, res) => {
  await postEditCategory(req, res);
};

export const deleteCategory = async (req, res) => {
  await categoryDelete(req, res);
};