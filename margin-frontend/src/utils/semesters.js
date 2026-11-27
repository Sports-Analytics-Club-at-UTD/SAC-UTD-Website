export const SEMESTER_OPTIONS = [
  { value: 'spring_2025', label: 'Spring 2025' },
  { value: 'summer_2025', label: 'Summer 2025' },
  { value: 'fall_2025', label: 'Fall 2025' },
  { value: 'spring_2026', label: 'Spring 2026' },
  { value: 'summer_2026', label: 'Summer 2026' },
  { value: 'fall_2026', label: 'Fall 2026' },
  { value: 'spring_2027', label: 'Spring 2027' },
  { value: '', label: 'All Semesters' },
];

export function getCurrentSemesterKey(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  if (month >= 1 && month <= 5) return `spring_${year}`;
  if (month >= 6 && month <= 7) return `summer_${year}`;
  return `fall_${year}`;
}

export function getSemesterLabel(key) {
  if (!key) return 'All Semesters';
  const match = SEMESTER_OPTIONS.find((opt) => opt.value === key);
  if (match) return match.label;
  const parts = String(key).split('_');
  if (parts.length === 2) {
    return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} ${parts[1]}`;
  }
  return key;
}
