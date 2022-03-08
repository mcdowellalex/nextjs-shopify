import formatTitle from 'title';
import { Merge } from 'type-fest';
import truncate from 'lodash/truncate';
import { ShopifyService, GetProductListQuery, GetProductListQueryVariables, CurrencyCode } from './shopify.service';

export namespace ProductService {
  export interface Single {
    title: string;
    description: string;
    seo: {
      title: string;
      description: string;
    };
    images: {
      id: string;
      src: string;
      alt: string;
    }[];
    variants: {
      id: string;
      title: string;
      image?: string;
      quantityAvailable: number;
      price: {
        amount: number;
        currencyCode: CurrencyCode;
      };
    }[];
  }

  export async function getSingle(handle: string): Promise<Single> {
    const { product } = await ShopifyService.getProductSingle({ handle });
    const { title, description, seo, images, variants } = product!;
    const p: Single = {
      title: formatTitle(title),
      description,
      seo: {
        title: formatTitle(seo.title || title),
        description: seo.description || truncate(description, { length: 256 }),
      },
      images: images.edges.map(({ node }) => {
        return {
          id: node.id as string,
          src: node.url,
          alt: node.altText || '',
        };
      }),
      variants: variants.edges.map(({ node }) => {
        const variant: Single['variants'][0] = {
          id: node.id,
          title: node.title,
          image: node.image?.id!,
          quantityAvailable: node.quantityAvailable!,
          price: {
            amount: Number(node.priceV2.amount),
            currencyCode: node.priceV2.currencyCode,
          },
        };

        return variant;
      }),
    };

    return p;
  }

  export interface ListItem {
    id: string;
    url: string;
    title: string;
    description: string;
    image: {
      src: string;
      alt: string;
    };
    price: {
      amount: number;
      currencyCode: CurrencyCode;
    };
  }

  export interface List {
    products: Merge<ListItem, { cursor: string }>[];
    pageInfo: GetProductListQuery['products']['pageInfo'];
  }

  export async function getList(variables?: GetProductListQueryVariables): Promise<List> {
    const {
      products: { edges, pageInfo },
    } = await ShopifyService.getProductList(variables);

    const products: List['products'] = edges.map(({ node, cursor }) => {
      return {
        id: node.id,
        cursor: cursor,
        url: `/products/${node.handle}`,
        title: formatTitle(node.title),
        description: node.description,
        image: {
          src: node.images.edges[0].node.url,
          alt: node.images.edges[0].node.altText || '',
        },
        price: {
          amount: Number(node.priceRange.minVariantPrice.amount),
          currencyCode: node.priceRange.minVariantPrice.currencyCode,
        },
      };
    });

    return { products, pageInfo };
  }
}
