import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
      const arrayProducts = [...cart];

      const itemExistsInCart = arrayProducts.find(
        (productInCart) => productInCart.id === productId
      );

      const stockProduct = await api
        .get<Stock>(`stock/${productId}`)
        .then((response) => response.data);

      const amountProduct = itemExistsInCart ? itemExistsInCart.amount : 0;
      const amountStock = stockProduct.amount;
      const newAmount = amountProduct + 1;

      if (newAmount > amountStock) {
        throw toast.error('Quantidade solicitada fora de estoque');
      }

      if (itemExistsInCart) {
        itemExistsInCart.amount = newAmount;
      } else {
        const actualProduct = await api
          .get<Product>(`products/${productId}`)
          .then((response) => response.data);

        const newProduct = {
          ...actualProduct,
          amount: 1,
        };
        arrayProducts.push(newProduct);
      }

      setCart(arrayProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(arrayProducts));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartArray = [...cart];

      const cartRemovedProduct = cartArray.findIndex(
        (itemCart) => itemCart.id === productId
      );

      if (cartRemovedProduct === -1) {
        throw toast.error('Erro na remoção do produto');
      }

      cartArray.splice(cartRemovedProduct, 1);

      setCart(cartArray);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartArray));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockProduct = await api
        .get<Stock>(`stock/${productId}`)
        .then((response) => response.data);

      if (amount <= 0) return;

      if (amount > stockProduct.amount) {
        throw toast.error('Quantidade solicitada fora de estoque');
      }

      const productUpdated = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        } else {
          return {
            ...product,
          };
        }
      });

      setCart(productUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productUpdated));
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
