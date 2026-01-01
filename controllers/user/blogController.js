import { addComment, createBlog, getSavedBlog, getStories, listBlog, loadCreateBlog, singleBlog, toggelSaveBlog, toggleBlogLike } from "../../services/user/blogService.js"

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

export const savedBlog = async(req, res) => {
    await getSavedBlog(req,res);
}

export const saveToggleBlog = async(req, res) => {
    await toggelSaveBlog(req, res);
}

export const stories = async(req, res) => {
    await getStories(req, res);
}