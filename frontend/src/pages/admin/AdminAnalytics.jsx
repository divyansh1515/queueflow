import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Package } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function AdminAnalytics() {
  const [weekly, setWeekly] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getWeekly(),
      analyticsAPI.getPeakHours(),
      analyticsAPI.getInventoryForecast()
    ]).then(([wk, pk, fc]) => {
      setWeekly(wk.data.data);
      setPeakHours(pk.data.data);
      setForecast(fc.data.data.slice(0, 8));
    }).catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Revenue category pie data from weekly
  const totalRevenue = weekly.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalOrders = weekly.reduce((s, d) => s + (d.orders || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/admin" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-display font-bold">Analytics</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">7-Day Revenue</p>
            <p className="text-2xl font-black text-green-600">₹{totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">7-Day Orders</p>
            <p className="text-2xl font-black text-blue-600">{totalOrders}</p>
          </div>
        </div>

        {/* Daily Orders Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" /> Daily Orders (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5) || d} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#3b82f6" radius={[5, 5, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Revenue Line */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Daily Revenue (₹)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5) || d} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1">Peak Hours (Last 30 Days)</h2>
          <p className="text-xs text-gray-400 mb-4">Average orders per hour of day</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={peakHours} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={h => `${h}h`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={h => `${h}:00 – ${h + 1}:00`} />
              <Bar
                dataKey="orders"
                radius={[4, 4, 0, 0]}
                name="Orders"
                fill="#f97316"
              >
                {peakHours.map((entry, i) => (
                  <Cell key={i} fill={entry.orders >= Math.max(...peakHours.map(p => p.orders)) * 0.75 ? '#c2410c' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">Dark bars = peak periods</p>
        </div>

        {/* Inventory Forecast */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Package size={16} className="text-brand-500" /> Inventory Forecast (Next 7 Days)
          </h2>
          <p className="text-xs text-gray-400 mb-4">Based on historical order data</p>
          {forecast.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Not enough data yet. Forecasts appear after orders are placed.</p>
          ) : (
            <div className="space-y-3">
              {forecast.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="font-bold text-gray-900 ml-2">{item.forecast7Days} units</span>
                    </div>
                    <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (item.forecast7Days / (forecast[0]?.forecast7Days || 1)) * 100)}%`,
                          backgroundColor: COLORS[i % COLORS.length]
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
