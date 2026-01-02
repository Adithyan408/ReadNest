import { addComment, blogDelete, commentDelete, createBlog, editBlogGet, editBlogPost, getSavedBlog, getStories, listBlog, loadCreateBlog, putEditBlog, putEditComment, singleBlog, toggelSaveBlog, toggleBlogLike } from "../../services/user/blogService.js"

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

export const deleteBlog = async(req, res) => {
    console.log("Hittingv")
    await blogDelete(req, res);
}

export const getEditBlog = async(req, res) => {
    await editBlogGet(req, res);
}

export const postEditBlog = async(req, res) => {
    await editBlogPost(req, res);
}

export const deleteComment = async(req, res) => {
    await commentDelete(req, res);
}

export const editBlog = async(req, res) => {
    await putEditBlog(req, res);
}

export const editComment = async(req, res) =>{
    await putEditComment(req, res);
}