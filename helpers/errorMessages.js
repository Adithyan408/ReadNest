export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SESSION_EXPIRED: 'Session expired. Please login again',
    ADMIN_NOT_FOUND: 'Admin not found',
  },

  USER: {
    NOT_FOUND: 'User not found',
    BLOCKED: 'User account is blocked',
  },

  ORDER: {
    NOT_FOUND: 'Order not found',
    INVALID_STATUS: 'Invalid order status',
    INVALID_TRANSITION: 'Invalid order status transition',
    CANNOT_CANCEL: 'Order cannot be cancelled',
  },

  PAYMENT: {
    INVALID_METHOD: 'Invalid payment method',
    PAYMENT_FAILED: 'Payment failed',
  },

  VALIDATION: {
    REQUIRED_FIELDS: 'Required fields are missing',
    INVALID_INPUT: 'Invalid input provided',
  },

  SERVER: {
    INTERNAL_ERROR: 'Something went wrong. Please try again later',
  },
};
