import { useRef, useState } from 'react';
import {
  ITEM_CATEGORIES,
  computeGrandTotal,
  computeLineTotal,
  createEmptyLineItem,
} from '../../utils/financeLineItems';

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

const VALID_CATEGORIES = new Set(ITEM_CATEGORIES.map((c) => c.value));

export default function LineItemGrid({ items, onChange, disabled = false }) {
  const fileInputRef = useRef(null);
  const [csvNotice, setCsvNotice] = useState('');

  const updateRow = (index, field, value) => {
    const next = items.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, createEmptyLineItem()]);
  };

  const removeRow = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e, rowIndex) => {
    if (e.key === 'Enter' && rowIndex === items.length - 1 && !disabled) {
      e.preventDefault();
      addRow();
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvNotice('');

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        setCsvNotice('CSV file is empty.');
        return;
      }

      const startIndex = lines[0].toLowerCase().includes('item_name') ? 1 : 0;
      const imported = [];
      for (let i = startIndex; i < lines.length; i += 1) {
        const [itemName, qtyRaw, unitQty, priceRaw, catRaw] = parseCsvLine(lines[i]);
        if (!itemName) continue;
        const cat = (catRaw || 'logistics').toLowerCase();
        imported.push({
          item_name: itemName,
          quantity: String(Number.isFinite(parseFloat(qtyRaw)) ? parseFloat(qtyRaw) : 1),
          unit_quantity: unitQty || '',
          unit_price: String(
            Number.isFinite(parseFloat(priceRaw)) ? parseFloat(priceRaw).toFixed(2) : '0.00'
          ),
          category: VALID_CATEGORIES.has(cat) ? cat : 'logistics',
        });
      }

      if (imported.length === 0) {
        setCsvNotice('No valid rows found. Expected: item_name,quantity,unit_quantity,unit_price,category');
        return;
      }
      onChange(imported);
      setCsvNotice(`Imported ${imported.length} line item(s) from ${file.name}.`);
    } catch {
      setCsvNotice('Could not read CSV file.');
    }
  };

  const grandTotal = computeGrandTotal(items);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <span className="sac-eyebrow">Line Items (Spreadsheet Grid)</span>
          <div className="sac-muted" style={{ fontSize: 12 }}>
            Press Enter on the last row to add another item, or import a CSV.
          </div>
        </div>
        {!disabled && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleCsvImport}
            />
            <button
              type="button"
              className="sac-btn sac-btn-ghost sac-btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Import CSV
            </button>
            <button
              type="button"
              className="sac-btn sac-btn-primary sac-btn-sm"
              onClick={addRow}
            >
              + Add Row
            </button>
          </div>
        )}
      </div>

      {csvNotice && (
        <div className="sac-banner sac-banner-warn" style={{ padding: '8px 12px', fontSize: 13 }}>
          {csvNotice}
        </div>
      )}

      <div className="sac-table-wrap">
        <table className="sac-grid-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Item Name *</th>
              <th style={{ width: 90 }}>Qty *</th>
              <th style={{ width: 130 }}>Unit Qty</th>
              <th style={{ width: 115 }}>Unit Price ($) *</th>
              <th style={{ width: 145 }}>Category *</th>
              <th style={{ width: 110, textAlign: 'right' }}>Line Total</th>
              {!disabled && <th style={{ width: 44 }} />}
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const lineTotal = computeLineTotal(row);
              return (
                <tr key={idx}>
                  <td
                    className="sac-mono sac-muted"
                    style={{ padding: '0 10px', fontSize: 12, textAlign: 'center' }}
                  >
                    {idx + 1}
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sac-grid-input"
                      placeholder="e.g. Large Cheese Pizza"
                      value={row.item_name}
                      disabled={disabled}
                      onChange={(e) => updateRow(idx, 'item_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="sac-grid-input num"
                      value={row.quantity}
                      disabled={disabled}
                      onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sac-grid-input"
                      placeholder="box / each"
                      value={row.unit_quantity}
                      disabled={disabled}
                      onChange={(e) => updateRow(idx, 'unit_quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="sac-grid-input num"
                      value={row.unit_price}
                      disabled={disabled}
                      onChange={(e) => updateRow(idx, 'unit_price', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      required
                    />
                  </td>
                  <td>
                    <select
                      className="sac-grid-input"
                      style={{ background: 'var(--sac-void)' }}
                      value={row.category}
                      disabled={disabled}
                      onChange={(e) => updateRow(idx, 'category', e.target.value)}
                    >
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="sac-grid-total-cell">${lineTotal.toFixed(2)}</td>
                  {!disabled && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="sac-btn sac-btn-ghost sac-btn-sm"
                        style={{ padding: '4px 8px', border: 'none' }}
                        disabled={items.length <= 1}
                        title="Remove row"
                        onClick={() => removeRow(idx)}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'baseline',
          gap: 12,
          marginTop: 12,
        }}
      >
        <span className="sac-eyebrow">Estimated Grand Total</span>
        <span className="sac-mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--sac-orange-400)' }}>
          ${grandTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
