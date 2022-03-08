import nookies from 'nookies';
import { NextPageContext } from 'next';
import { ShopifyService, CurrencyCode } from '@app/services/shopify.service';
import { CartLineInput, CartLineUpdateInput } from './shopify/generated';

const CART_ID = 'CART_ID';

export namespace CartService {
  export interface CartItem {
    id: string;
    quantity: number;
    variant: {
      id: string;
      title: string;
      url: string;
      price: {
        amount: number;
        currencyCode: CurrencyCode;
      };
      image: {
        src: string;
        alt: string;
      };
    };
  }

  export type Cart = {
    items: CartItem[];
    subtotal: {
      amount: number;
      currencyCode: CurrencyCode;
    };
    tax: {
      amount: number;
      currencyCode: CurrencyCode;
    };
    total: {
      amount: number;
      currencyCode: CurrencyCode;
    };
    url: string;
  };

  export async function getCart(context?: NextPageContext): Promise<Cart | undefined> {
    const cartId = nookies.get(context, CART_ID).CART_ID;
    const node = await ShopifyService.getCart({ cartId });

    if (cartId) {
      const { cart } = await ShopifyService.getCart({ cartId });

      if (cart && cart?.lines.edges.length > 0) {
        const items: CartItem[] = cart.lines.edges.map(({ node }) => {
          const item: CartItem = {
            id: node.id,
            quantity: node.quantity,
            variant: {
              id: node.merchandise?.product.id!,
              title: node.merchandise?.product.title!,
              url: `/products/${node.merchandise?.product.handle}`,
              price: {
                amount: Number(node.merchandise?.product.priceRange.minVariantPrice.amount),
                currencyCode: node.merchandise?.product.priceRange.minVariantPrice.currencyCode,
              },
              image: {
                src: node.merchandise?.product.images.edges[0].node.url,
                alt: node.merchandise?.product.images.edges[0].node.altText || '',
              },
            },
          };

          return item;
        });

        return {
          items,
          url: cart.checkoutUrl,
          subtotal: {
            amount: Number(cart.estimatedCost.subtotalAmount.amount),
            currencyCode: cart.estimatedCost.subtotalAmount.currencyCode,
          },
          tax: {
            amount: Number(cart.estimatedCost.totalTaxAmount?.amount),
            currencyCode:
              cart.estimatedCost.totalTaxAmount?.currencyCode || cart.estimatedCost.subtotalAmount.currencyCode,
          },
          total: {
            amount: Number(cart.estimatedCost.totalAmount.amount),
            currencyCode: cart.estimatedCost.totalAmount.currencyCode,
          },
        };
      }
    }
  }

  export async function getItemCount(context?: NextPageContext): Promise<number> {
    let count: number = 0;
    const cartId = nookies.get(context, CART_ID).CART_ID;

    if (cartId) {
      const { cart } = await ShopifyService.getCartItemCount({ cartId });
      if (cart && cart?.lines.edges.length > 0) {
        cart.lines.edges.map(({ node }) => {
          count += node.quantity;
        });
      }
    }

    return count;
  }

  // when user tries to add a product to the cart
  //    if there is no cart, then create a cart and add the item
  //    if there is, then just add the item
  export async function addItem(lineItem: CartLineInput, context?: NextPageContext): Promise<void> {
    try {
      const cartId = nookies.get(context, CART_ID).CART_ID;
      await ShopifyService.addCartItem({
        cartId,
        lines: [lineItem],
      });
    } catch (error) {
      const { cartCreate } = await ShopifyService.createCart({ input: { lines: [lineItem] } });
      nookies.set(context, CART_ID, cartCreate?.cart?.id!, { maxAge: 30 * 24 * 60 * 60 });
    }
  }

  export async function updateItem(lineItem: CartLineUpdateInput, context?: NextPageContext): Promise<void> {
    const cartId = nookies.get(context, CART_ID).CART_ID;
    await ShopifyService.updateCartItem({ cartId, lines: [lineItem] });
  }

  export async function removeItem(lineItemId: string, context?: NextPageContext): Promise<void> {
    const cartId = nookies.get(context, CART_ID).CART_ID;
    await ShopifyService.removeCartItem({ cartId, lineIds: [lineItemId] });
  }
}
