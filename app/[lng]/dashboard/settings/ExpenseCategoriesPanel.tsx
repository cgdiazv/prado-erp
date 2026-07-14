'use client';

import { useEffect, useState } from 'react';
import {
  archiveExpenseCategory,
  DEFAULT_EXPENSE_CATEGORIES,
  emitExpenseCategoriesUpdated,
  getStoredExpenseCategories,
  upsertExpenseCategory,
} from '@/lib/expenseCategories';
import { getTranslations } from '@/lib/translations';

interface ExpenseCategoriesPanelProps {
  locale?: string;
}

export default function ExpenseCategoriesPanel({ locale = 'en' }: ExpenseCategoriesPanelProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('');
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

    const isDuplicate = categories.some(
      (category) => category.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Esa categoria ya existe.' : 'That category already exists.');
      return;
    }

    const nextCategories = upsertExpenseCategory(normalizedValue);
    setCategories(nextCategories);
    setSelectedCategory(normalizedValue);
    emitExpenseCategoriesUpdated();
    setDraftCategory('');
    setStatusMessage(`Added "${normalizedValue}".`);
  };

  const handleArchiveCategory = (categoryToArchive: string) => {
    if (categories.length <= 1) {
      setStatusMessage('Keep at least one expense category enabled.');
      return;
    }

    const nextCategories = archiveExpenseCategory(categoryToArchive);
    setCategories(nextCategories);
    setSelectedCategory((currentSelected) => {
      if (currentSelected !== categoryToArchive) {
        return currentSelected;
      }

      return nextCategories[0] || '';
    });
    emitExpenseCategoriesUpdated();
    setStatusMessage(isEs ? `Categoria archivada: "${categoryToArchive}".` : `Archived "${categoryToArchive}".`);
  };

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
      return;
    }

    if (selectedCategory && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0] || '');
    }
  }, [categories, selectedCategory]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.expenseCategoriesSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.expenseCategoriesDescription}</p>
      </div>

      <form onSubmit={handleAddCategory} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isEs ? 'Nombre de categoria' : 'Category name'}
          </label>
          <input
            type="text"
            value={draftCategory}
            onChange={(event) => setDraftCategory(event.target.value)}
            placeholder={translations.dashboard.addNewCategory}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {translations.dashboard.addCategory}
        </button>
      </form>

      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="space-y-3 rounded-xl border border-gray-200 bg-slate-50 p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isEs ? 'Categorias guardadas' : 'Saved categories'}
            </label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              disabled={categories.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              {categories.length === 0 ? (
                <option value="">{isEs ? 'No hay categorias guardadas' : 'No saved categories'}</option>
              ) : (
                categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => selectedCategory && handleArchiveCategory(selectedCategory)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            disabled={!selectedCategory}
          >
            {isEs ? 'Archivar categoria' : 'Archive category'}
          </button>
        </div>

        {selectedCategory ? (
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{selectedCategory}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
