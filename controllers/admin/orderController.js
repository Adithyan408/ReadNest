import { loadOrders, orderDetails, updateItemStatus, updateOrderStatus } from "../../services/admin/orderService.js"

export const getOrderList = async(req, res) => {
    await loadOrders(req, res);
}

export const postOrderUpdate = async(req, res) => {
    
    await updateOrderStatus(req, res);
}   

export const updateSingleItemStatus = async(req, res) => {
    await updateItemStatus(req, res);
}
export const loadOrderDetails = async(req, res) => {
    await orderDetails(req, res);
}