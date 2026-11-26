export const ITEM_CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'technology', label: 'Technology' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'merchandise', label: 'Merchandise' },
];

export function createEmptyLineItem() {
  return {
    item_name: '',
    quantity: '1',
    unit_quantity: '',
    unit_price: '0.00',
    category: 'food',
  };
}

export function computeLineTotal(item) {
  const qty = parseFloat(item.quantity);
  const price = parseFloat(item.unit_price);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return Math.max(0, qty * price);
}

export function computeGrandTotal(items) {
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0);
}
