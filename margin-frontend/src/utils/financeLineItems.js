export const ITEM_CATEGORIES = [
  { value: 'publicity_marketing', label: 'Publicity and Marketing' },
  { value: 'decorations_supplies', label: 'Decorations and Supplies' },
  { value: 'food', label: 'Food and Drinks' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'event_personnel', label: 'Event Personnel' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'technology', label: 'Technology' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export function createEmptyLineItem() {
  return {
    item_name: '',
    vendor: '',
    quantity: '1',
    unit_quantity: '',
    unit_price: '0.00',
    category: 'food',
    item_url: '',
  };
}

export function computeLineTotal(item) {
  const qty = parseFloat(item.quantity);
  const price = parseFloat(item.unit_price);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return Math.max(0, qty * price);
}

export const TX_SALES_TAX_RATE = 0.0825;

export function computeGrandTotal(items) {
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0);
}

export function computeCostBreakdown(items, includeTax = true, taxRate = TX_SALES_TAX_RATE) {
  const subtotal = computeGrandTotal(items);
  const tax = includeTax ? Math.round(subtotal * taxRate * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, grandTotal };
}
