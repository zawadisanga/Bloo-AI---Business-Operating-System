// api/middleware/validation.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const validateFinancialInput = [
  body('revenue').optional().isFloat({ min: 0 }).toFloat(),
  body('costs').optional().isFloat({ min: 0 }).toFloat(),
  body('customers').optional().isInt({ min: 0 }).toInt(),
  body('industry').optional().isString().trim(),
  validateRequest
];

const validateEmail = [
  body('email').isEmail().normalizeEmail(),
  validateRequest
];

const validatePassword = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest
];

const validateBusinessData = [
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('industry').optional().isString(),
  body('size').optional().isIn(['small', 'medium', 'large', 'enterprise']),
  validateRequest
];

module.exports = {
  validateRequest,
  validateFinancialInput,
  validateEmail,
  validatePassword,
  validateBusinessData
};
