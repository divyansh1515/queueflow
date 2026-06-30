import paymentQR from '../../assets/payment-qr.jpg';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../store/cartStore';
import { orderAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore();
  const { token } = useAuthStore();
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = getTotal();

  const handleCheckout = () => {
    if (!items.length) return;
    if (!token) {
      localStorage.setItem('checkout_redirect','/cart');
      toast('Please login to continue payment.');
      navigate('/login');
      return;
    }
    setShowQR(true);
  };

     

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-display font-bold">Your Cart</h1>
        <span className="text-gray-400 text-sm ml-auto">{items.length} item(s)</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-500 font-medium">Your cart is empty</p>
            <button onClick={() => navigate('/order/abc-juice')} className="mt-4 text-brand-500 font-medium">
              Browse Menu →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.menuItemId} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-brand-500 font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">₹{item.price} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-7 h-7 bg-brand-500 text-white rounded-full flex items-center justify-center hover:bg-brand-600"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => removeItem(item.menuItemId)}
                    className="w-7 h-7 text-red-400 hover:text-red-600 ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Bill Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">Bill Summary</h3>
              {items.map(item => (
                <div key={item.menuItemId} className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-3 mt-3 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-brand-500">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay ₹{total.toFixed(2)} via UPI / Card
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              🔒 Secured by Razorpay · UPI, Cards, NetBanking accepted
            </p>
          </div>
        )}
      </main>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 text-center w-80">
            <h2 className="font-bold text-xl mb-3">Scan to Pay</h2>
            <img src={paymentQR} alt="QR" className="w-56 h-56 mx-auto"/>
            <button
              className="mt-5 w-full bg-green-600 text-white py-3 rounded-lg"
              onClick={async()=>{
                try{
                  const {data}=await orderAPI.createOrder({items});
                  clearCart();
                  setShowQR(false);
                  toast.success('Order placed successfully!');
                  navigate(`/track/${data.data._id}`);
                }catch(err){
                  toast.error(err.response?.data?.message||'Order creation failed');
                }
              }}
            >
              I Paid
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
