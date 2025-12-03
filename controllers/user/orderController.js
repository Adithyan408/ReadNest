import { cancelOrderItem, getOrderDetailsPage, getOrdersPage, returnOrderItem } from "../../services/user/orderServices.js"


export const loadOrderList = async(req, res) => {
    await getOrdersPage(req, res);
}

export const loadOrderDetails = async(req, res) => {
    await getOrderDetailsPage(req, res);
}

export const cancelOrder = async(req, res) => {
    await cancelOrderItem(req, res);
}

export const returnOrder = async(req, res) => {
    await returnOrderItem(req, res);
}