import express from 'express';

const router = express.Router();

// IFSC to Bank mapping (sample data - in production use a proper IFSC API)
const ifscBankMap = {
  'SBIN0000001': { bank: 'State Bank of India', branch: 'New Delhi Main Branch' },
  'HDFC0000001': { bank: 'HDFC Bank', branch: 'Mumbai Main Branch' },
  'ICIC0000001': { bank: 'ICICI Bank', branch: 'Bangalore Main Branch' },
  'AXIS0000001': { bank: 'Axis Bank', branch: 'Chennai Main Branch' },
  'PUNB0000001': { bank: 'Punjab National Bank', branch: 'Delhi Main Branch' },
  'UBIN0000001': { bank: 'Union Bank of India', branch: 'Kolkata Main Branch' },
  'CNRB0000001': { bank: 'Canara Bank', branch: 'Hyderabad Main Branch' },
  'BARB0000001': { bank: 'Bank of Baroda', branch: 'Ahmedabad Main Branch' },
};

// Get bank details by IFSC code
router.get('/bank-details/:ifscCode', (req, res) => {
  try {
    const { ifscCode } = req.params;
    const bankDetails = ifscBankMap[ifscCode.toUpperCase()];
    
    if (bankDetails) {
      res.json({
        success: true,
        data: bankDetails
      });
    } else {
      // In production, you might want to call an external IFSC API here
      res.status(404).json({
        success: false,
        message: 'IFSC code not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank details'
    });
  }
});

export default router;