export function priceDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}
export function formatPriceInput(value: string) {
  return priceDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
