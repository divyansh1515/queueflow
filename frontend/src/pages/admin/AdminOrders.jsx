import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { getSocket, SOCKET_EVENTS } from '../../services/socket';
const notificationSound = new Audio("/notification.mp3");

const STATUS_BADGE = {
  pending: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const TABS = ['active', 'completed', 'cancelled'];

export default function AdminOrders() {
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
const [pickupPins, setPickupPins] = useState({});
const [verifying, setVerifying] = useState({});
  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, hRes] = await Promise.all([
        orderAPI.getQueue(),
        orderAPI.getHistory({ limit: 50 })
      ]);
      setQueue(qRes.data.data);
      setHistory(hRes.data.data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };
useEffect(() => {
  fetchData();

  const socket = getSocket();

  if (!socket) {
    console.error("❌ Socket not initialized");
    return;
  }

  const playNotification = async () => {
    try {
      notificationSound.currentTime = 0;
      await notificationSound.play();
      console.log("🔔 Notification Played");
    } catch (err) {
      console.error("🔇 Notification blocked:", err);
    }
  };

  const handleConnect = () => {
    console.log("✅ Socket Connected:", socket.id);

    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);

    console.log("📢 Joined Admin Room");
  };

  const handleNewOrder = (order) => {
    console.log("🔥 NEW ORDER:", order);

    playNotification();

    toast.success(
      `🔔 New Order #${order.tokenNumber}`,
      {
        duration: 5000,
      }
    );

    setQueue(prev => [order, ...prev]);

    fetchData();
  };

  const handleQueueUpdate = ({ orders }) => {
    setQueue(orders);
  };

  if (socket.connected) {
    handleConnect();
  } else {
    socket.once("connect", handleConnect);
  }

  socket.off(SOCKET_EVENTS.ORDER_NEW);
  socket.off(SOCKET_EVENTS.QUEUE_UPDATED);

  socket.on(SOCKET_EVENTS.ORDER_NEW, handleNewOrder);
  socket.on(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdate);

  socket.on("connect_error", (err) => {
    console.error("❌ Socket Error:", err.message);
  });

  return () => {
    socket.off("connect", handleConnect);
    socket.off(SOCKET_EVENTS.ORDER_NEW, handleNewOrder);
    socket.off(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdate);
  };
}, []);

  const handleStatus = async (id, status) => {
    try {
      await orderAPI.updateStatus(id, status);
      toast.success(`Marked as ${status}`);
      fetchData();
    } catch { toast.error('Update failed'); }
  };

  const displayed = tab === 'active'
    ? queue
    : history.filter(o => o.status === (tab === 'completed' ? 'completed' : 'cancelled'));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/admin" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-display font-bold flex-1">All Orders</h1>
        <button onClick={fetchData} className="text-gray-400 hover:text-white">
          <RefreshCw size={16} />
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t} {t === 'active' && queue.length > 0 && (
              <span className="ml-1 bg-brand-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No {tab} orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(order => (
              <div key={order._id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-dark-800">#{order.tokenNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{order.totalAmount?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  👤 {order.customer?.name || 'Unknown'} · {order.customer?.email}
                </p>
                {tab === 'active' && (
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatus(order._id, 'preparing')}
                        className="flex-1 bg-orange-500 text-white text-xs py-2 rounded-xl font-bold hover:bg-orange-600"
                      >
                        ▶ Start Prep
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatus(order._id, 'ready')}
                        className="flex-1 bg-teal-500 text-white text-xs py-2 rounded-xl font-bold hover:bg-teal-600"
                      >
                        🔔 Mark Ready
                      </button>
                    )}
                 {order.status === 'ready' && (
  <div className="w-full space-y-2">
    <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-3 py-2 text-sm font-semibold text-center">
      🟡 Ready for Collection — Waiting for Customer
    </div>

    <input
  type="password"
  inputMode="numeric"
  maxLength={4}
  placeholder="Enter Pickup PIN"
  value={pickupPins[order._id] || ""}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPickupPins((prev) => ({
      ...prev,
      [order._id]: value
    }));
  }}
  className="w-full border rounded-xl px-3 py-2 text-center font-bold tracking-widest"
/>
    <button
  onClick={async () => {
    try {
      setVerifying(prev => ({
        ...prev,
        [order._id]: true
      }));

      await orderAPI.verifyPickupPin(
        order._id,
        pickupPins[order._id]
      );

      toast.success("✅ Order Collected");

      setPickupPins(prev => ({
        ...prev,
        [order._id]: ""
      }));

      fetchData();

    } catch (err) {

      toast.error(
        err.response?.data?.message || "Invalid Pickup PIN"
      );

      setPickupPins(prev => ({
        ...prev,
        [order._id]: ""
      }));

    } finally {

      setVerifying(prev => ({
        ...prev,
        [order._id]: false
      }));

    }
  }}

  disabled={
    (pickupPins[order._id] || "").length !== 4 ||
    verifying[order._id]
  }

  className={`w-full py-2 rounded-xl font-bold text-white ${
    (pickupPins[order._id] || "").length === 4
      ? "bg-green-600 hover:bg-green-700"
      : "bg-gray-400 cursor-not-allowed"
  }`}
>
  {verifying[order._id]
    ? "Verifying..."
    : "✅ Verify & Collect"}
</button> 
</div>
)}                {['pending', 'preparing'].includes(order.status) && (
                      <button
                        onClick={() => handleStatus(order._id, 'cancelled')}
                        className="bg-gray-100 text-red-500 text-xs px-3 py-2 rounded-xl font-medium hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
