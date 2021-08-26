import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });


  const addProduct = async (productId: number) => {
    try {
      const productToAdd = await api.get(`products/${productId}`)
       .then(response => response.data);
      const currentStock = await api.get(`stock/${productId}`)
        .then(response => response.data);
      
      if(currentStock.amount > 0) {
        await api.put(`stock/${productId}`, { amount: currentStock.amount -= 1 });

        const existingItem = cart.some(item => item.id === productId);

        if (!existingItem) {
          setCart([{ ...productToAdd, amount: 1 }, ...cart]);
        } else {
          const incrementAmount = cart.map(item => item.id === productId ? {
            ...item,
            amount: item.amount += 1,
          } : item);
          setCart(incrementAmount);
        }
      } else toast.error('Quantidade solicitada fora de estoque');
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filteredProducts = cart.filter(item => item.id !== productId);
      setCart(filteredProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const currentStock = await api.get(`stock/${productId}`)
        .then(response => response.data);
      if(currentStock.amount < 1) return;
      if (currentStock.amount < amount) toast.error('Quantidade solicitada fora de estoque');
      const updateAmount = cart.map(item => item.id === productId 
            ? { ...item, amount } 
            : item);
      setCart(updateAmount);
      await api.put(`stock/${productId}`, { amount });
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
