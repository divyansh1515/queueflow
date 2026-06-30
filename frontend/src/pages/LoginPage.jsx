import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const { login, isLoading } = useAuthStore();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await login(form.email, form.password);

      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);

      // Return user to checkout if they came from Cart
      const redirect = localStorage.getItem('checkout_redirect');

      if (redirect) {
        localStorage.removeItem('checkout_redirect');
        navigate(redirect);
        return;
      }

      // Normal login flow
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'worker') {
        navigate('/worker');
      } else {
        navigate('/order/abc-juice');
      }

    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">

          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>

          <h1 className="text-3xl font-display font-black text-white">
            QueueFlow
          </h1>

          <p className="text-gray-400 mt-1 text-sm">
            Smart queue for food counters
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-800 rounded-3xl p-6 space-y-4"
        >

          <div>

            <label className="text-xs font-medium text-gray-400 block mb-1.5">
              Email
            </label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
              className="w-full bg-dark-700 text-white rounded-xl px-4 py-3 text-sm border border-dark-600 focus:outline-none focus:border-brand-500"
              placeholder="you@example.com"
            />

          </div>

          <div>

            <label className="text-xs font-medium text-gray-400 block mb-1.5">
              Password
            </label>

            <input
              type="password"
              required
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
              className="w-full bg-dark-700 text-white rounded-xl px-4 py-3 text-sm border border-dark-600 focus:outline-none focus:border-brand-500"
              placeholder="••••••"
            />

          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-bold hover:bg-brand-600 disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <p className="text-center text-gray-500 text-sm mt-4">

          New here?{' '}

          <Link
            to="/register"
            className="text-brand-500 font-medium hover:underline"
          >
            Create account
          </Link>

        </p>

      </div>
    </div>
  );
}