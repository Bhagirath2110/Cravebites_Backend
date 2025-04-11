import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Get order statistics and reports
// @route   GET /api/orders/stats/reports
// @access  Admin
router.get('/stats/reports', async (req, res) => {
  try {
    // Get total sales and orders (only completed orders)
    const completedOrders = await Order.find({ status: 'delivered' });
    const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

    // Get sales by date (last 30 days, only completed orders)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDate = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          sales: 1,
          orders: 1,
          _id: 0
        }
      }
    ]);

    // Get sales by category (only completed orders)
    const salesByCategory = await Order.aggregate([
      {
        $match: { status: 'delivered' }
      },
      {
        $unwind: "$orderItems"
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: "$product"
      },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: "$category"
      },
      {
        $group: {
          _id: "$category.name",
          sales: { $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] } },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          category: "$_id",
          sales: 1,
          orders: 1,
          _id: 0
        }
      },
      {
        $sort: { sales: -1 }
      }
    ]);

    // Get sales by product (only completed orders)
    const salesByProduct = await Order.aggregate([
      {
        $match: { status: 'delivered' }
      },
      {
        $unwind: "$orderItems"
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: "$product"
      },
      {
        $group: {
          _id: "$product.name",
          sales: { $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] } },
          quantity: { $sum: "$orderItems.quantity" }
        }
      },
      {
        $project: {
          name: "$_id",
          sales: 1,
          quantity: 1,
          _id: 0
        }
      },
      {
        $sort: { sales: -1 }
      }
    ]);

    // Get order status counts
    const orderStatusCounts = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          totalSales: 1,
          _id: 0
        }
      }
    ]);

    // Get top selling category
    const topSellingCategory = salesByCategory.length > 0 ? salesByCategory[0].category : 'N/A';

    res.json({
      summary: {
        totalSales,
        totalOrders: completedOrders.length,
        averageOrderValue,
        topSellingCategory
      },
      salesByDate,
      salesByCategory,
      salesByProduct,
      orderStatusCounts
    });
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({ message: 'Error getting order statistics' });
  }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      customer,
      orderItems,
      paymentMethod,
      subtotal,
      cgst,
      sgst,
      deliveryCharge = 0,
      totalAmount
    } = req.body;

    // Validate required fields
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ 
        message: 'Validation Error',
        errors: ['Order items are required']
      });
    }

    if (!cgst || !sgst) {
      return res.status(400).json({
        message: 'Validation Error',
        errors: ['CGST and SGST are required']
      });
    }

    // Create order with auto-generated order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD${String(orderCount + 1).padStart(4, '0')}`;

    // Process order items to handle temporary products
    const processedOrderItems = orderItems.map(item => {
      // Check if product ID is a valid MongoDB ObjectId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(item.product);
      
      return {
        ...item,
        // Set productModel based on whether product is a temp product or not
        productModel: isValidObjectId ? 'Product' : 'TempProduct'
      };
    });

    const order = new Order({
      orderNumber,
      customer,
      orderItems: processedOrderItems,
      paymentMethod,
      subtotal,
      cgst,
      sgst,
      deliveryCharge,
      totalAmount,
      status: 'pending'
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });
    
    // We need to handle the populate differently now because of mixed product types
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public/Admin
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('orderItems.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Admin
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('orderItems.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// @desc    Update payment status
// @route   PUT /api/orders/:id/pay
// @access  Admin
router.put('/:id/pay', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address
    };
    
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

export default router; 