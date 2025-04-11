import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed,
    refPath: 'productModel',
    required: [true, 'Product ID is required']
  },
  productModel: {
    type: String,
    default: 'Product',
    enum: ['Product', 'TempProduct']
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  image: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    name: {
      type: String,
      default: 'Guest',
      trim: true
    },
    phone: {
      type: String,
      default: '0000000000',
      trim: true
    }
  },
  orderItems: [orderItemSchema],
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'card', 'upi'],
    default: 'cash'
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  cgst: {
    type: Number,
    required: true,
    min: 0
  },
  sgst: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order; 