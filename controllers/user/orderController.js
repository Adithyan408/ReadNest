import { cancelFullOrder, cancelOrderItem, downloadInvoice, getListOrders, getOrderDetailsPage,  returnOrderItem } from '../../services/user/orderServices.js';

export const loadOrderDetails = async(req, res) => {
    await getOrderDetailsPage(req, res);
};

export const cancelOrder = async(req, res) => {
    await cancelOrderItem(req, res);
};

export const returnOrder = async(req, res) => {
    await returnOrderItem(req, res);
};

export const invoicedownload = async(req, res) => {
    await downloadInvoice(req, res);
};

export const listOrders = async(req, res) => {
    await getListOrders(req, res);
};

export const fullOrderCancel = async(req, res) => {
    await cancelFullOrder(req, res);
};
