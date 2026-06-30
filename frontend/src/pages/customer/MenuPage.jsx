import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Search, Tag, Zap, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { menuAPI } from '../../services/api';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const CATEGORIES = ['all', 'beverage', 'snack', 'meal', 'dessert', 'other'];

const CATEGORY_EMOJI = {
  beverage: '☕',
  snack: '🍟',
  meal: '🍱',
  dessert: '🍰',
  other: '🛒',
  all: '🍽️'
};

export default function MenuPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { addItem, getItemCount, getTotal } = useCartStore();
  const { logout, user } = useAuthStore();

 useEffect(() => {
  menuAPI
    .getAll({
      available: true,
      shop: shopId
    })
    .then(({ data }) => {
      console.log("MENU RESPONSE:", data);

      setItems(data.data);
      setFiltered(data.data);
    })
    .catch((err) => {
      console.log(err);
      toast.error("Failed to load menu");
    })
    .finally(() => setLoading(false));

}, [shopId]);
  useEffect(() => {
    let result = items;

    if (activeCategory !== 'all') {
      result = result.filter(i => i.category === activeCategory);
    }

    if (search) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(result);
  }, [activeCategory, search, items]);

  const handleAdd = (item) => {
    addItem(item);
    toast.success(`${item.name} added to cart`, {
      icon: '🛒',
      duration: 1500
    });
  };

  const cartCount = getItemCount();
  const cartTotal = getTotal();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-dark-800 text-white sticky top-0 z-50 shadow-lg">

        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-display font-bold text-brand-500">
              {shopId ? shopId.toUpperCase() : 'QueueFlow'}
            </h1>

            <p className="text-xs text-gray-400">
              Welcome, {user?.name?.split(' ')[0]}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="text-gray-400 hover:text-white text-sm"
            >
              My Orders
            </button>

            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">

            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />

            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-dark-600 focus:outline-none focus:border-brand-500"
            />

          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">

          {CATEGORIES.map(cat => (

            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              {CATEGORY_EMOJI[cat]} {cat}
            </button>

          ))}

        </div>

      </header>

      {/* Menu */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-32">

        {loading ? (

          <div className="grid grid-cols-2 gap-3">

            {Array(6).fill(0).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-48 animate-pulse"
              />
            ))}

          </div>

        ) : filtered.length === 0 ? (

          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-medium">No items found</p>
          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3">

            {filtered.map(item => (
              <MenuCard
                key={item._id}
                item={item}
                onAdd={handleAdd}
              />
            ))}

          </div>

        )}

      </main>

      {/* Cart */}
      {cartCount > 0 && (

        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">

          <button
            onClick={() => navigate('/cart')}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-brand-500 text-white px-5 py-4 rounded-2xl shadow-2xl hover:bg-brand-600 transition-colors"
          >

            <div className="flex items-center gap-2">

              <span className="bg-white text-brand-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartCount}
              </span>

              <span className="font-medium">
                View Cart
              </span>

            </div>

            <span className="font-bold">
              ₹{cartTotal.toFixed(2)}
            </span>

          </button>

        </div>

      )}

    </div>
  );
}

function MenuCard({ item, onAdd }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-fade-in">

      <div className="relative">

        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-28 object-cover"
          />
        ) : (
          <div className="w-full h-28 bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center text-4xl">
            {CATEGORY_EMOJI[item.category] || '🍽️'}
          </div>
        )}

        {item.tags?.includes('bestseller') && (
          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Zap size={10} /> Best
          </span>
        )}

      </div>

      <div className="p-3">

        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {item.name}
        </h3>

        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Tag size={10} /> ~{item.preparationTime} min
        </p>

        <div className="flex items-center justify-between mt-2">

          <span className="font-bold text-gray-900">
            ₹{item.price}
          </span>

          <button
            onClick={() => onAdd(item)}
            className="bg-brand-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center hover:bg-brand-600 transition-colors active:scale-95"
          >
            +
          </button>

        </div>

      </div>

    </div>
  );
}