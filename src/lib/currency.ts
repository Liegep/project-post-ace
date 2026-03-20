export const CURRENCIES = [
  { value: "BRL", label: "Real (R$)", symbol: "R$", locale: "pt-BR" },
  { value: "USD", label: "Dólar (US$)", symbol: "US$", locale: "en-US" },
  { value: "EUR", label: "Euro (€)", symbol: "€", locale: "de-DE" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

export function getCurrency(code?: string) {
  return CURRENCIES.find((c) => c.value === code) || CURRENCIES[0];
}

export function formatCurrency(value: number, code?: string): string {
  const cur = getCurrency(code);
  return `${cur.symbol} ${value.toLocaleString(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
