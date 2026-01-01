import { addComment, createBlog, listBlog, loadCreateBlog, singleBlog, toggleBlogLike } from "../../services/user/blogService.js"

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

export const blogLike = async(req, res) => {
    await toggleBlogLike(req, res);
}

export const blogComment = async(req,res) => {
    await addComment(req, res);
}