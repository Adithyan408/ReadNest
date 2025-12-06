import { loadOrders, updateOrderStatus } from "../../services/admin/orderService.js"

export const getOrderList = async(req, res) => {
    await loadOrders(req, res);
}

export const postOrderUpdate = async(req, res) => {
    console.log("Status update Hitt")
    await updateOrderStatus(req, res);
}   