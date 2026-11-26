from io import BytesIO
from pathlib import Path

from django.conf import settings
import openpyxl

from .models import FundingRequest


TEMPLATE_PATH = Path(settings.BASE_DIR).parent / "sample_programming_funds.xlsx"

# Row slots per section in sample_programming_funds.xlsx ("Budget Breakdown")
SECTION_ROW_SLOTS = {
    "publicity_marketing": list(range(16, 21)),    # Publicity and Marketing
    "decorations_supplies": list(range(23, 31)),   # Decorations and Supplies
    "food": list(range(32, 37)),                   # Food and Drinks
    "facilities": list(range(38, 41)),             # Facilities (Venue)
    "entertainment": list(range(42, 45)),          # Entertainment
    "event_personnel": list(range(46, 49)),        # Event Personnel
    "equipment_rental": list(range(50, 53)),       # Equipment Rental
    "miscellaneous": list(range(54, 57)),          # Miscellaneous
}

SECTION_LABELS = {
    "publicity_marketing": "Publicity and Marketing",
    "decorations_supplies": "Decorations and Supplies",
    "food": "Food and Drinks",
    "facilities": "Facilities",
    "entertainment": "Entertainment",
    "event_personnel": "Event Personnel",
    "equipment_rental": "Equipment Rental",
    "miscellaneous": "Miscellaneous",
}

# Map item categories (including Technology & legacy categories) to template sections
CATEGORY_TO_SECTION = {
    "publicity_marketing": "publicity_marketing",
    "decorations_supplies": "decorations_supplies",
    "food": "food",
    "facilities": "facilities",
    "entertainment": "entertainment",
    "event_personnel": "event_personnel",
    "equipment_rental": "equipment_rental",
    "technology": "miscellaneous",
    "miscellaneous": "miscellaneous",
    "logistics": "miscellaneous",
    "merchandise": "miscellaneous",
    "prizes": "miscellaneous",
}


def build_utd_programming_funds_xlsx(funding_request: FundingRequest) -> bytes:
    """
    Populate sample_programming_funds.xlsx with FundingRequest data,
    preserving all formulas, styles, merges, and Table1 structure.
    Any fields not applicable or uncertain are left blank.
    """
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"UTD template not found at {TEMPLATE_PATH}")

    wb = openpyxl.load_workbook(TEMPLATE_PATH)
    ws = wb["Budget Breakdown"]

    # Header metadata
    ws["H1"] = "Sports Analytics Club"
    ws["H2"] = (
        funding_request.event_name
        or (funding_request.event.name if funding_request.event_id else "")
        or funding_request.title
    )
    event_date = funding_request.event_date or (
        funding_request.event.date if funding_request.event_id else None
    )
    ws["H3"] = event_date if event_date else None

    # Clear all template placeholder item values (cols B, C, D, E, H) while keeping F & G formulas
    for rows in SECTION_ROW_SLOTS.values():
        for r in rows:
            for col in ("B", "C", "D", "E", "H"):
                cell = ws[f"{col}{r}"]
                cell.value = None
                cell.hyperlink = None

    # Track next available row index per section
    cursors = {sec: 0 for sec in SECTION_ROW_SLOTS}
    used_sections = []

    for item in funding_request.items.all():
        section = CATEGORY_TO_SECTION.get(item.category, "miscellaneous")
        slots = SECTION_ROW_SLOTS[section]
        if cursors[section] >= len(slots):
            # Overflow into Miscellaneous if section is full
            section = "miscellaneous"
            slots = SECTION_ROW_SLOTS[section]
        if cursors[section] >= len(slots):
            # If even Miscellaneous is full, stop adding rows without breaking template
            continue

        row_idx = slots[cursors[section]]
        cursors[section] += 1
        if section not in used_sections:
            used_sections.append(section)

        label = item.item_name
        if item.vendor:
            label = f"{item.item_name} - {item.vendor}"
        if item.category == "technology":
            label = f"[Technology] {label}"

        ws[f"B{row_idx}"].value = label
        ws[f"C{row_idx}"].value = float(item.quantity)
        ws[f"D{row_idx}"].value = float(item.unit_price)
        ws[f"E{row_idx}"].value = item.unit_quantity or None
        link_cell = ws[f"H{row_idx}"]
        link_cell.value = item.item_url or None
        link_cell.hyperlink = item.item_url or None

    # Income breakdown
    ws["C7"] = float(funding_request.total_amount)
    ws["E7"] = ", ".join(SECTION_LABELS[s] for s in used_sections) if used_sections else None
    ws["C8"] = 0
    ws["E8"] = None
    ws["C9"] = 0
    ws["E9"] = None
    ws["C10"] = 0
    ws["E10"] = None

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
