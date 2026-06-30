import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ChefHat, Bell, Home } from 'lucide-react';
import toast from "react-hot-toast";
import { orderAPI } from '../../services/api';
import { getSocket, SOCKET_EVENTS } from '../../services/socket';

const readySound = new Audio("/ready.mp3");

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Received', icon: CheckCircle, color: 'text-blue-500' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-orange-500' },
  { key: 'ready', label: 'Ready to Collect', icon: Bell, color: 'text-green-500' },
  { key: 'completed', label: 'Collected', icon: CheckCircle, color: 'text-gray-400' }
];

const STATUS_INDEX = { pending: 0, preparing: 1, ready: 2, completed: 3 };

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
   const previousStatus = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    orderAPI.getOrder(orderId)
  .then(({ data }) => {
    setOrder(data.data);
    previousStatus.current = data.data.status;
  })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Join order room for real-time updates
    const socket = getSocket();
    if ("Notification" in window) {
  Notification.requestPermission();
}
    socket.emit(SOCKET_EVENTS.JOIN_ORDER, orderId);

 socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, async () => {
  const { data } = await orderAPI.getOrder(orderId);

  const updatedOrder = data.data;

  // Notification sirf Ready hone par
  if (
    previousStatus.current !== "ready" &&
    updatedOrder.status === "ready"
  ) {
    readySound.currentTime = 0;
    readySound.play().catch(() => {});

    toast.success("🥤 Your Order is Ready!");

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🍹 QueueFlow", {
        body: `Token #${updatedOrder.tokenNumber} is ready for pickup.`,
        icon: "/logo192.png",
      });
    }
  }

  // Status update
  previousStatus.current = updatedOrder.status;

  // UI update
  setOrder(updatedOrder);
});
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-3">❓</p>
          <p className="text-gray-600">Order not found</p>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_INDEX[order.status] ?? 0;
  const isReady = order.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Token */}
      <div className={`py-10 px-4 text-center transition-colors ${isReady ? 'bg-green-600' : 'bg-dark-800'}`}>
        <p className="text-white/70 text-sm mb-2">Your Token Number</p>
        <div className={`text-7xl font-display font-black text-white mb-2 ${isReady ? 'animate-bounce' : ''}`}>
          #{order.tokenNumber}
        </div>
        {isReady ? (
          <div className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-2">
            <Bell size={14} className="animate-pulse" />
            Your order is ready! Please collect.
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
            <Clock size={14} />
            <span>Est. wait: ~{order.estimatedWaitTime || '?'} min</span>
            {order.queuePosition && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full">
                Position #{order.queuePosition}
              </span>
            )}
          </div>
        )}
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {order.status === "ready" && order.pickupPin && (
  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-5 text-center">
    <p className="text-sm text-gray-600">
      Show this PIN at the counter
    </p>

    <div className="text-6xl font-black tracking-widest text-yellow-600 mt-2">
      {order.pickupPin}
    </div>

    <p className="text-xs text-gray-500 mt-2">
      Staff will ask this PIN before handing over your order.
    </p>
  </div>
)}
        {/* Status Steps */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-5">Order Status</h3>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div
              className="absolute left-5 top-0 w-0.5 bg-brand-500 transition-all duration-700"
              style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            <div className="space-y-6">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-4 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                      done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {idx === currentStep && order.status !== 'completed' && (
                        <p className="text-xs text-brand-500 font-medium">In progress...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Order Summary</h3>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
              <span>Total Paid</span>
              <span className="text-brand-500">₹{order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/order')}
          className="w-full flex items-center justify-center gap-2 bg-dark-800 text-white py-4 rounded-2xl font-medium hover:bg-dark-700 transition-colors"
        >
          <Home size={16} />
          Back to Menu
        </button>
      </main>
    </div>
  );
}
