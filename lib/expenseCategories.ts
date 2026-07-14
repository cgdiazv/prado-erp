export const EXPENSE_CATEGORIES_STORAGE_KEY = 'prado-expense-categories';
export const DEFAULT_EXPENSE_CATEGORIES = ['Fuel', 'Equipment Maintenance'];
export const ARCHIVED_EXPENSE_CATEGORY_PREFIX = '[[ARCHIVED]] ';

function normalizeExpenseCategory(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function dedupeExpenseCategories(categories: string[]) {
  return categories.filter(
    (category, index, list) => list.findIndex((item) => item.toLowerCase() === category.toLowerCase()) === index
  );
}

function getRawStoredExpenseCategories() {
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

    const categories = dedupeExpenseCategories(
      parsedValue.map((item) => normalizeExpenseCategory(String(item))).filter(Boolean)
    );

    return categories.length > 0 ? categories : [...DEFAULT_EXPENSE_CATEGORIES];
  } catch {
    return [...DEFAULT_EXPENSE_CATEGORIES];
  }
}

export function getStoredExpenseCategories() {
  const activeCategories = getRawStoredExpenseCategories().filter(
    (category) => !category.startsWith(ARCHIVED_EXPENSE_CATEGORY_PREFIX)
  );

  return activeCategories.length > 0 ? activeCategories : [...DEFAULT_EXPENSE_CATEGORIES];
}

export function saveExpenseCategories(categories: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedCategories = dedupeExpenseCategories(
    categories.map((category) => normalizeExpenseCategory(category)).filter(Boolean)
  );
  const archivedCategories = getRawStoredExpenseCategories().filter((category) =>
    category.startsWith(ARCHIVED_EXPENSE_CATEGORY_PREFIX)
  );
  const nextCategories = [...normalizedCategories, ...archivedCategories];

  window.localStorage.setItem(
    EXPENSE_CATEGORIES_STORAGE_KEY,
    JSON.stringify(nextCategories.length > 0 ? nextCategories : DEFAULT_EXPENSE_CATEGORIES)
  );
}

export function upsertExpenseCategory(category: string) {
  if (typeof window === 'undefined') {
    return getStoredExpenseCategories();
  }

  const normalizedCategory = normalizeExpenseCategory(category);
  if (!normalizedCategory) {
    return getStoredExpenseCategories();
  }

  const rawCategories = getRawStoredExpenseCategories();
  const archivedCategory = `${ARCHIVED_EXPENSE_CATEGORY_PREFIX}${normalizedCategory}`;
  const nextCategories = rawCategories.filter(
    (item) => item.toLowerCase() !== archivedCategory.toLowerCase() && item.toLowerCase() !== normalizedCategory.toLowerCase()
  );

  nextCategories.push(normalizedCategory);

  window.localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(dedupeExpenseCategories(nextCategories)));
  return getStoredExpenseCategories();
}

export function archiveExpenseCategory(category: string) {
  if (typeof window === 'undefined') {
    return getStoredExpenseCategories();
  }

  const normalizedCategory = normalizeExpenseCategory(category);
  if (!normalizedCategory) {
    return getStoredExpenseCategories();
  }

  const rawCategories = getRawStoredExpenseCategories();
  const nextCategories = rawCategories.map((item) =>
    item.toLowerCase() === normalizedCategory.toLowerCase()
      ? `${ARCHIVED_EXPENSE_CATEGORY_PREFIX}${normalizedCategory}`
      : item
  );

  window.localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(dedupeExpenseCategories(nextCategories)));
  return getStoredExpenseCategories();
}

export function emitExpenseCategoriesUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('expense-categories-updated'));
}
