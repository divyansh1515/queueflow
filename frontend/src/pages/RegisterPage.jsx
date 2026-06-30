import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ ...form, role: 'customer' });
      toast.success('Account created!');
      navigate('/order');
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
          <h1 className="text-3xl font-display font-black text-white">Join QueueFlow</h1>
          <p className="text-gray-400 mt-1 text-sm">Order smarter, skip the line</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-800 rounded-3xl p-6 space-y-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Divyansh Sharma' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+91 98765 43210' },
            { key: 'password', label: 'Password', type: 'password', placeholder: '••••••' }
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">{label}</label>
              <input
                type={type}
                required={key !== 'phone'}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-dark-700 text-white rounded-xl px-4 py-3 text-sm border border-dark-600 focus:outline-none focus:border-brand-500 placeholder-gray-600"
                placeholder={placeholder}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-bold hover:bg-brand-600 transition-colors disabled:opacity-60 mt-2"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-500 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
