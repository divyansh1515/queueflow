const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    preparationTime: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      default: () => uuidv4().slice(0, 8).toUpperCase()
    },

    tokenNumber: {
      type: Number,
      required: true
    },
    pickupPin: {
  type: String,
  required: true
},

isCollected: {
  type: Boolean,
  default: false
},

    // ===============================
    // CUSTOMER (Guest OR Registered)
    // ===============================
    customer: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      name: {
        type: String,
        required: true
      },

      phone: {
        type: String,
        default: ''
      }
    },

    items: {
      type: [orderItemSchema],
      validate: [
        (v) => v.length > 0,
        'Order must have at least one item'
      ]
    },

    status: {
      type: String,
      enum: [
        'pending_payment',
        'pending',
        'preparing',
        'ready',
        'completed',
        'cancelled'
      ],
      default: 'pending_payment'
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,

      status: {
        type: String,
        enum: [
          'pending',
          'paid',
          'failed',
          'refunded'
        ],
        default: 'pending'
      },

      method: String,
      paidAt: Date
    },

    estimatedWaitTime: {
      type: Number,
      default: null
    },

    queuePosition: {
      type: Number,
      default: null
    },

    statusTimestamps: {
      pending: Date,
      preparing: Date,
      ready: Date,
      completed: Date,
      cancelled: Date
    },

    workerNotes: String,

    shop: {
      type: String,
      default: 'default-shop'
    },

    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// =========================================
// Generate Sequential Token Every Day
// =========================================
orderSchema.statics.getNextToken = async function () {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await this.countDocuments({
    createdAt: {
      $gte: startOfDay
    }
  });

  return count + 1;
};

// =========================================
// Indexes
// =========================================

orderSchema.index({
  status: 1,
  createdAt: 1
});

orderSchema.index({
  tokenNumber: 1
});

orderSchema.index({
  "payment.razorpayOrderId": 1
});

orderSchema.index({
  "customer.user": 1,
  createdAt: -1
});

module.exports = mongoose.model('Order', orderSchema);