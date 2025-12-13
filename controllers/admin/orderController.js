import {
  approveReturn,
  loadOrders,
  orderDetails,
  rejectReturn,
  updateItemStatus,
  updateOrderStatus,
} from "../../services/admin/orderService.js";

export const getOrderList = async (req, res) => {
  await loadOrders(req, res);
};

export const postOrderUpdate = async (req, res) => {
  await updateOrderStatus(req, res);
};

export const updateSingleItemStatus = async (req, res) => {
  await updateItemStatus(req, res);
};
export const loadOrderDetails = async (req, res) => {
  await orderDetails(req, res);
};

export const returnApprove = async (req, res) => {
  await approveReturn(req, res);
};

export const returnReject = async (req, res) => {
  await rejectReturn(req, res);
};
