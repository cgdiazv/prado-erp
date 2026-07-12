'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  emitExpenseCategoriesUpdated,
  getStoredExpenseCategories,
  saveExpenseCategories,
} from '@/lib/expenseCategories';

export default function ExpenseCategoriesPanel() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [draftCategory, setDraftCategory] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const syncCategories = () => {
      setCategories(getStoredExpenseCategories());
    };

    syncCategories();
    window.addEventListener('expense-categories-updated', syncCategories);

    return () => {
      window.removeEventListener('expense-categories-updated', syncCategories);
    };
  }, []);

  const handleAddCategory = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedValue = draftCategory.trim().replace(/\s+/g, ' ');
    if (!normalizedValue) {
      setStatusMessage('Enter a category name first.');
      return;
    }

    const nextCategories = Array.from(
      new Set([...categories, normalizedValue].map((category) => category.trim()).filter(Boolean))
    );

    setCategories(nextCategories);
    saveExpenseCategories(nextCategories);
    emitExpenseCategoriesUpdated();
    setDraftCategory('');
    setStatusMessage(`Added "${normalizedValue}".`);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (categories.length <= 1) {
      setStatusMessage('Keep at least one expense category enabled.');
      return;
    }

    const nextCategories = categories.filter((category) => category !== categoryToDelete);
    setCategories(nextCategories);
    saveExpenseCategories(nextCategories);
    emitExpenseCategoriesUpdated();
    setStatusMessage(`Removed "${categoryToDelete}".`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Expense Categories</h3>
        <p className="text-xs text-slate-400">Create or remove categories that appear in the expense logging dropdown.</p>
      </div>

      <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
        <input
          type="text"
          value={draftCategory}
          onChange={(event) => setDraftCategory(event.target.value)}
          placeholder="Add a new category"
          className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Add Category
        </button>
      </form>

      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="flex flex-wrap gap-2 max-w-2xl">
        {categories.map((category) => (
          <div
            key={category}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
          >
            <span>{category}</span>
            <button
              type="button"
              onClick={() => handleDeleteCategory(category)}
              className="text-xs font-semibold text-red-600 transition hover:text-red-700"
              aria-label={`Delete ${category}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
