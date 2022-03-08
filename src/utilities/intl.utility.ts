import { CurrencyCode } from '@app/services/shopify.service';

export namespace IntlUtility {
  interface Price {
    amount: number;
    currencyCode: CurrencyCode;
    locales?: string | string[];
  }

  export function formatPrice({ amount, currencyCode, locales }: Price): string {
    if (!amount) {
      return '$0';
    }
    return new Intl.NumberFormat(locales, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }
}
