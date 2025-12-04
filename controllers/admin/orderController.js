import { loadOrders, updateItemStatus } from "../../services/admin/orderService.js"

export const getOrderList = async(req, res) => {
    await loadOrders(req, res);
}

export const postUpdate = async(req, res) => {
    await updateItemStatus(req, res);
}