import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem) => {
        const existing = get().items.find(i => i.menuItemId === menuItem._id);
        if (existing) {
          set({ items: get().items.map(i =>
            i.menuItemId === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i
          )});
        } else {
          set({ items: [...get().items, {
            menuItemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            preparationTime: menuItem.preparationTime,
            quantity: 1,
            image: menuItem.image
          }]});
        }
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter(i => i.menuItemId !== menuItemId) });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({ items: get().items.map(i =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i
        )});
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      isEmpty: () => get().items.length === 0
    }),
    { name: 'queueflow_cart' }
  )
);

export default useCartStore;
