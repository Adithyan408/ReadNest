
import { customerBlock, customerUnblock, loadCustomer } from '../../services/admin/customerService.js';

export const customerInfo = async (req, res) => {
  await loadCustomer(req, res);
};

export const blockCustomers = async (req, res) => {
  await customerBlock(req, res);
};

export const unblockCustomers = async (req, res) => {
  await customerUnblock(req, res);
};
