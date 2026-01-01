import { createBlog, listBlog, loadCreateBlog, singleBlog } from "../../services/user/blogService.js"

export const blogList = async(req, res) => {
    await listBlog(req, res);
}

export const loadAddBlog = async(req, res) => {
    await loadCreateBlog(req, res);
}

export const postCreateBlog = async(req, res) => {
    await createBlog(req, res);
}

export const getSingleBlog = async(req, res) => {
    await singleBlog(req, res);
}
