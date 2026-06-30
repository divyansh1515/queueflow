import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { orderAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-teal-100 text-teal-700'
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    orderAPI.getHistory({ limit: 20 })
      .then(({ data }) => setOrders(data.data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-display font-bold">My Orders</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-medium">No orders yet</p>
            <button onClick={() => navigate('/order')} className="mt-3 text-brand-500 font-medium text-sm">
              Browse Menu →
            </button>
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order._id}
              onClick={() => navigate(`/track/${order._id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-dark-800 text-lg">#{order.tokenNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-bold text-gray-900">₹{order.totalAmount?.toFixed(2)}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
