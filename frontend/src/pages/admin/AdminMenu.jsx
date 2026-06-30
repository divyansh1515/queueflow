import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { menuAPI } from '../../services/api';

const CATEGORIES = ['beverage', 'snack', 'meal', 'dessert', 'other'];
const EMPTY_FORM = { name: '', description: '', price: '', category: 'snack', preparationTime: '5', image: '', tags: '' };

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    setLoading(true);
    menuAPI.getAll()
      .then(({ data }) => setItems(data.data))
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      preparationTime: String(item.preparationTime),
      image: item.image || '',
      tags: item.tags?.join(', ') || ''
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
      preparationTime: parseInt(form.preparationTime),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    try {
      if (editItem) {
        await menuAPI.update(editItem._id, payload);
        toast.success('Item updated');
      } else {
        await menuAPI.create(payload);
        toast.success('Item added');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await menuAPI.delete(id);
      toast.success('Item deleted');
      setItems(prev => prev.filter(i => i._id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await menuAPI.toggle(id);
      setItems(prev => prev.map(i => i._id === id ? data.data : i));
      toast.success(data.data.isAvailable ? 'Item enabled' : 'Item disabled');
    } catch { toast.error('Toggle failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-dark-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/admin" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-display font-bold flex-1">Menu Management</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-brand-500 text-white text-sm px-3 py-2 rounded-xl hover:bg-brand-600"
        >
          <Plus size={15} /> Add Item
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat}>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 capitalize">{cat}</h2>
                  <div className="space-y-2">
                    {catItems.map(item => (
                      <div
                        key={item._id}
                        className={`bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm ${!item.isAvailable ? 'opacity-50' : ''}`}
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                            {!item.isAvailable && <span className="text-xs text-red-500 font-medium">Off</span>}
                          </div>
                          <p className="text-xs text-gray-400">₹{item.price} · ~{item.preparationTime}min · {item.soldCount} sold</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleToggle(item._id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                            {item.isAvailable ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-400" />}
                          </button>
                          <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                            <Edit2 size={14} className="text-blue-500" />
                          </button>
                          <button onClick={() => handleDelete(item._id, item.name)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100">
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editItem ? 'Edit Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Name', type: 'text', required: true },
                { key: 'description', label: 'Description', type: 'text' },
                { key: 'price', label: 'Price (₹)', type: 'number', required: true, step: '0.5', min: '0' },
                { key: 'preparationTime', label: 'Prep Time (minutes)', type: 'number', required: true, min: '1' },
                { key: 'image', label: 'Image URL', type: 'url' },
                { key: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'bestseller, veg, spicy' }
              ].map(({ key, label, ...rest }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input
                    {...rest}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-brand-500 text-white py-3 rounded-xl font-bold hover:bg-brand-600 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
