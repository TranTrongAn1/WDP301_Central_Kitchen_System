import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CART_STORAGE_KEY = "store_staff_cart";

export type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as CartItem[];
            if (Array.isArray(parsed)) setItems(parsed);
          } catch {
            // ignore
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.productId === item.productId);
        let next: CartItem[];
        if (i >= 0) {
          next = [...prev];
          next[i] = { ...next[i], quantity: next[i].quantity + quantity };
        } else {
          next = [...prev, { ...item, quantity }];
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const next = prev.filter((x) => x.productId !== productId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        if (quantity < 1) {
          const next = prev.filter((x) => x.productId !== productId);
          persist(next);
          return next;
        }
        const next = prev.map((x) =>
          x.productId === productId ? { ...x, quantity } : x,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persist([]);
  }, [persist]);

  const subtotal = useMemo(
    () => items.reduce((sum, x) => sum + x.price * x.quantity, 0),
    [items],
  );
  const itemCount = useMemo(
    () => items.reduce((sum, x) => sum + x.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      subtotal,
      itemCount,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      subtotal,
      itemCount,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
