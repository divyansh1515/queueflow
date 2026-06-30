import React, { useEffect, useState } from 'react';
import { Clock, ChefHat, Bell, CheckCircle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { getSocket, SOCKET_EVENTS } from '../../services/socket';
import useAuthStore from '../../store/authStore';

const STATUS_COLORS = {
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200'
};

const NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'completed' };
const NEXT_LABEL = { pending: '▶ Start Prep', preparing: '🔔 Mark Ready', ready: '✅ Collected' };

export default function WorkerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuthStore();

  const fetchQueue = async () => {
    try {
      const { data } = await orderAPI.getQueue();
      setOrders(data.data);
    } catch { toast.error('Failed to fetch queue'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchQueue();
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_WORKER);

    socket.on(SOCKET_EVENTS.ORDER_NEW, (order) => {
      setOrders(prev => [order, ...prev]);
      toast('New order! Token #' + order.tokenNumber, { icon: '🛎️' });
    });

    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, ({ orders: updatedOrders }) => {
      setOrders(updatedOrders.filter(o => ['pending', 'preparing'].includes(o.status)));
    });

    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, (update) => {
      setOrders(prev => prev.map(o => o._id === update.orderId ? { ...o, ...update } : o)
        .filter(o => ['pending', 'preparing'].includes(o.status)));
    });

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_NEW);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED);
    };
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      if (newStatus === 'completed') {
        setOrders(prev => prev.filter(o => o._id !== orderId));
      }
      toast.success(`Order marked as ${newStatus}`);
    } catch { toast.error('Status update failed'); }
  };

  const preparing = orders.filter(o => o.status === 'preparing');
  const pending = orders.filter(o => o.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-500">Worker Station</h1>
          <p className="text-xs text-gray-400">{user?.name} · {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black text-brand-500">{orders.length}</div>
            <div className="text-xs text-gray-400">in queue</div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-400">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Now Preparing */}
        {preparing.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <ChefHat size={14} /> Now Preparing ({preparing.length})
            </h2>
            <div className="space-y-3">
              {preparing.map(order => (
                <OrderCard key={order._id} order={order} onAction={handleStatusUpdate} highlight />
              ))}
            </div>
          </section>
        )}

        {/* Pending Queue */}
        <section>
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Clock size={14} /> Pending Queue ({pending.length})
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-300" />
              <p>Queue is clear! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(order => (
                <OrderCard key={order._id} order={order} onAction={handleStatusUpdate} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function OrderCard({ order, onAction, highlight }) {
  const nextStatus = NEXT_STATUS[order.status];
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 animate-slide-up ${
      highlight ? 'border-orange-400' : 'border-blue-300'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-dark-800">#{order.tokenNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status]}`}>
              {order.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleTimeString()} · ₹{order.totalAmount?.toFixed(2)}
          </p>
        </div>
        {order.estimatedWaitTime && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            {order.estimatedWaitTime}m
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-700">{item.name}</span>
            <span className="font-medium text-gray-900">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Customer */}
      {order.customer?.name && (
        <p className="text-xs text-gray-400 mb-3">👤 {order.customer.name}</p>
      )}

      {nextStatus && (
        <button
          onClick={() => onAction(order._id, nextStatus)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
            order.status === 'pending'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : order.status === 'preparing'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {NEXT_LABEL[order.status]}
        </button>
      )}
    </div>
  );
}
