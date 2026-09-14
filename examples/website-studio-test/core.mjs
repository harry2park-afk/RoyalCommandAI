export const coreVersion = "studio-quote-1";
export const localePacks = {
  en: { title: "Quote calculator", quantity: "Quantity", price: "Unit price", add: "Add item", remove: "Remove", reset: "Reset", total: "Total", invalid: "Enter non-negative numbers." },
  ko: { title: "견적 계산기", quantity: "수량", price: "단가", add: "항목 추가", remove: "삭제", reset: "초기화", total: "합계", invalid: "0 이상의 숫자를 입력하세요." },
};
export function addItem(items, quantity, price) {
  const values = [quantity, price].map(value => typeof value === "string" && value.trim() === "" ? NaN : Number(value));
  if (values.some(value => !Number.isFinite(value) || value < 0) || !Number.isFinite(values[0] * values[1])) throw new Error("INVALID_NUMBER");
  const result = [...items, { quantity: values[0], price: values[1] }];
  total(result); return result;
}
export function total(items) {
  const sum = items.reduce((value, item) => value + item.quantity * item.price, 0);
  if (!Number.isFinite(sum)) throw new Error("INVALID_NUMBER");
  return sum;
}
export function removeItem(items, index) { return items.filter((_, i) => i !== index); }
