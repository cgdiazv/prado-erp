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
  const [editingCreate, setEditingCreate] = useState(false);
  const [editingManage, setEditingManage] = useState(false);
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

  const toggleCreateSection = () => {
    setStatusMessage('');
    setEditingCreate((current) => !current);
  };

  const toggleManageSection = () => {
    setStatusMessage('');
    setEditingManage((current) => !current);
  };

  const handleArchiveSelectedCategory = () => {
    if (!selectedCategory) return;
    handleArchiveCategory(selectedCategory);
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
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.expenseCategoriesSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.expenseCategoriesDescription}</p>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isEs ? 'Agregar categoria' : 'Add category'}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{isEs ? 'Crea categorias para clasificar gastos.' : 'Create categories to classify expenses.'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleCreateSection}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editingCreate ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editingCreate ? (
                  <button
                    type="submit"
                    form="categories-create-form"
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {isEs ? 'Agregar nuevo' : 'Add New'}
                  </button>
                ) : null}
              </div>
            </div>
            <form id="categories-create-form" onSubmit={handleAddCategory} className={editingCreate ? 'mt-3 space-y-3' : 'hidden'}>
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
            </form>
          </div>

          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isEs ? 'Categorias guardadas' : 'Saved categories'}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {selectedCategory || (isEs ? 'No hay categorias guardadas' : 'No saved categories')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleManageSection}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editingManage ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editingManage ? (
                  <button
                    type="button"
                    onClick={handleArchiveSelectedCategory}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:text-red-300"
                    disabled={!selectedCategory}
                  >
                    {isEs ? 'Archivar' : 'Archive'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={editingManage ? 'mt-3 space-y-3' : 'hidden'}>
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

              {selectedCategory ? (
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{selectedCategory}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
