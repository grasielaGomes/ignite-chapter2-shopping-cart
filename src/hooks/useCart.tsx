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
      const currentStock = await api.get(`stock/${productId}`).then(response => response.data);
      const productToAdd = await api.get(`products/${productId}`).then(response => response.data);

      if (currentStock.amount <= 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      const existingProduct = cart.some(product => product.id === productId);
      if (!existingProduct) {
        const addNewProductToCart = {
          ...productToAdd,
          amount: 1,
        }
        setCart([...cart, addNewProductToCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, addNewProductToCart]));
        
      } else {
        const increaseAmount = cart.map(product => product.id === productId 
          ? { ...product, amount: product.amount += 1 } 
          : product);
        setCart(increaseAmount);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(increaseAmount));
      }
      
      await api.put(`stock/${productId}`, { amount: currentStock.amount -= 1 });

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProduct = cart.some(product => product.id === productId);
      if (!existProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const removeProductFromCart = cart.filter(product => product.id !== productId);

      setCart(removeProductFromCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProductFromCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const { data: currentStock } = await api.get(`stock/${productId}`);

      if (currentStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const addAmount = cart.map(product => product.id === productId 
        ? { ...product, amount } 
        : product);

      setCart(addAmount);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(addAmount))
      await api.put(`stock/${productId}`, { amount });

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
