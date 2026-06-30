import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingBag, DollarSign, Clock, Users, QrCode, BarChart3, Package, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { analyticsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { getSocket, SOCKET_EVENTS } from '../../services/socket';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuthStore();

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard(),
      analyticsAPI.getWeekly(),
      analyticsAPI.getPeakHours()
    ]).then(([dash, wk, pk]) => {
      setDashboard(dash.data.data);
      setWeekly(wk.data.data);
      setPeakHours(pk.data.data.filter(h => h.orders > 0));
    }).finally(() => setLoading(false));

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    socket.on(SOCKET_EVENTS.ANALYTICS_UPDATED, (data) => setDashboard(data));

    return () => socket.off(SOCKET_EVENTS.ANALYTICS_UPDATED);
  }, []);

  const navItems = [
    { to: '/admin/menu', icon: Package, label: 'Menu', desc: 'Add, edit, toggle items' },
    { to: '/admin/orders', icon: ShoppingBag, label: 'Orders', desc: 'View all orders' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', desc: 'Deep dive reports' },
    { to: '/admin/qr', icon: QrCode, label: 'QR Code', desc: 'Print & share QR' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-brand-500">QueueFlow</h1>
          <p className="text-xs text-gray-400">Admin Dashboard</p>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 flex items-center gap-2 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={ShoppingBag} label="Today's Orders" value={dashboard?.today?.orders || 0} color="bg-blue-500" />
            <KPICard icon={DollarSign} label="Today's Revenue" value={`₹${(dashboard?.today?.revenue || 0).toFixed(0)}`} color="bg-green-500" />
            <KPICard icon={Clock} label="Active Orders" value={dashboard?.today?.activeOrders || 0} color="bg-orange-500" />
            <KPICard icon={TrendingUp} label="Top Item" value={dashboard?.topItems?.[0]?.name || '-'} color="bg-purple-500" small />
          </div>
        )}

        {/* Weekly Chart */}
        {weekly.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">Weekly Revenue</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak Hours */}
        {peakHours.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">Peak Hours (Last 30 days)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={h => `${h}:00`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={h => `${h}:00`} />
                <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-2 gap-3">
          {navItems.map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 group"
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-500 transition-colors">
                <Icon size={18} className="text-brand-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, small }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className={`font-black text-dark-800 ${small ? 'text-sm' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
