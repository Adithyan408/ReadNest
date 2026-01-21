import {  adminBlogSearch, blockUnblockBlog, deleteCommentAdmin, getBlogDetails, getBlogs } from '../../services/admin/blogsService.js';

export const blogsGet = async(req, res) => {
    await getBlogs(req, res);
};

export const detailedBlog = async(req, res) => {
    await getBlogDetails(req, res);
};

export const unblockBlockBlog = async(req, res) => {
    await blockUnblockBlog(req, res);
};

export const commentDelete = async(req, res) => {
    await deleteCommentAdmin(req, res);
};

export const blogSearchAdmin = async(req, res) => {
    await adminBlogSearch(req, res);
};
