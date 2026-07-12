export const EXPENSE_CATEGORIES_STORAGE_KEY = 'prado-expense-categories';
export const DEFAULT_EXPENSE_CATEGORIES = ['Fuel', 'Equipment Maintenance'];

function normalizeExpenseCategory(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getStoredExpenseCategories() {
  if (typeof window === 'undefined') {
    return [...DEFAULT_EXPENSE_CATEGORIES];
  }

  try {
    const rawValue = window.localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY);
    if (!rawValue) {
      return [...DEFAULT_EXPENSE_CATEGORIES];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [...DEFAULT_EXPENSE_CATEGORIES];
    }

    const categories = parsedValue
      .map((item) => normalizeExpenseCategory(String(item)))
      .filter(Boolean)
      .filter((category, index, list) => list.findIndex((item) => item.toLowerCase() === category.toLowerCase()) === index);

    return categories.length > 0 ? categories : [...DEFAULT_EXPENSE_CATEGORIES];
  } catch {
    return [...DEFAULT_EXPENSE_CATEGORIES];
  }
}

export function saveExpenseCategories(categories: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedCategories = categories
    .map((category) => normalizeExpenseCategory(category))
    .filter(Boolean)
    .filter((category, index, list) => list.findIndex((item) => item.toLowerCase() === category.toLowerCase()) === index);

  window.localStorage.setItem(
    EXPENSE_CATEGORIES_STORAGE_KEY,
    JSON.stringify(normalizedCategories.length > 0 ? normalizedCategories : DEFAULT_EXPENSE_CATEGORIES)
  );
}

export function emitExpenseCategoriesUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('expense-categories-updated'));
}
