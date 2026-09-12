'use client';

import { useEffect, useState } from 'react';
import {
  archiveExpenseCategory,
  DEFAULT_EXPENSE_CATEGORIES,
  emitExpenseCategoriesUpdated,
  getArchivedExpenseCategories,
  getStoredExpenseCategories,
  upsertExpenseCategory,
} from '@/lib/expenseCategories';
import { getTranslations } from '@/lib/translations';
import { Tag, Plus, X } from 'lucide-react';

interface ExpenseCategoriesPanelProps {
  locale?: string;
}

export default function ExpenseCategoriesPanel({ locale = 'en' }: ExpenseCategoriesPanelProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [archivedCategories, setArchivedCategories] = useState<string[]>([]);
  const [editingCreate, setEditingCreate] = useState(false);
  const [draftCategory, setDraftCategory] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const syncCategories = () => {
      setCategories(getStoredExpenseCategories());
      setArchivedCategories(getArchivedExpenseCategories());
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
      setStatusMessage(isEs ? 'Ingresa el nombre de la categoría.' : 'Enter a category name first.');
      return;
    }

    const isDuplicate = categories.some(
      (category) => category.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Esa categoría ya existe.' : 'That category already exists.');
      return;
    }

    const nextCategories = upsertExpenseCategory(normalizedValue);
    setCategories(nextCategories);
    setArchivedCategories(getArchivedExpenseCategories());
    emitExpenseCategoriesUpdated();
    setDraftCategory('');
    setEditingCreate(false);
    setStatusMessage(isEs ? `Categoría "${normalizedValue}" agregada con éxito.` : `Added "${normalizedValue}" successfully.`);
  };

  const handleArchiveCategory = (categoryToArchive: string) => {
    if (categories.length <= 1) {
      setStatusMessage(isEs ? 'Debes mantener al menos una categoría habilitada.' : 'Keep at least one expense category enabled.');
      return;
    }

    const nextCategories = archiveExpenseCategory(categoryToArchive);
    setCategories(nextCategories);
    setArchivedCategories(getArchivedExpenseCategories());
    emitExpenseCategoriesUpdated();
    setStatusMessage(isEs ? `Categoría archivada: "${categoryToArchive}".` : `Archived "${categoryToArchive}".`);
  };

  const handleRestoreCategory = (categoryToRestore: string) => {
    const nextCategories = upsertExpenseCategory(categoryToRestore);
    setCategories(nextCategories);
    setArchivedCategories(getArchivedExpenseCategories());
    emitExpenseCategoriesUpdated();
    setStatusMessage(isEs ? `Categoría restaurada: "${categoryToRestore}".` : `Restored "${categoryToRestore}".`);
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            {translations.dashboard.expenseCategoriesSection || (isEs ? 'Categorías de gastos' : 'Expense Categories')}
          </h3>
          <p className="text-xs text-slate-400">
            {translations.dashboard.expenseCategoriesDescription || (isEs ? 'Crea o administra categorías para registrar y clasificar gastos.' : 'Create or manage categories to track and classify expenses.')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatusMessage('');
            setEditingCreate((current) => !current);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          {editingCreate ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>{isEs ? 'Cancelar' : 'Cancel'}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{isEs ? 'Agregar categoría' : 'Add Category'}</span>
            </>
          )}
        </button>
      </div>

      {statusMessage ? (
        <div className="mx-6 md:mx-8 p-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700">
          {statusMessage}
        </div>
      ) : null}

      {editingCreate && (
        <div className="mx-6 md:mx-8 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-3">
            {isEs ? 'Nueva Categoría' : 'New Category'}
          </p>
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              placeholder={translations.dashboard.addNewCategory || (isEs ? 'Nombre de categoría (ej. Combustible)' : 'Category name (e.g. Fuel)')}
              className="flex-1 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shrink-0"
            >
              {isEs ? 'Guardar categoría' : 'Save Category'}
            </button>
          </form>
        </div>
      )}

      {/* Complete List of Saved Categories */}
      <div className="border-t border-slate-200 px-6 md:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? 'Categorías guardadas' : 'Saved Categories'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {categories.length}
            </span>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Tag className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'No hay categorías guardadas' : 'No saved categories'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Agrega una categoría arriba para clasificar tus gastos operativos.'
                : 'Add a category above to classify your operational expenses.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {categories.map((category) => (
              <div
                key={category}
                className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-900 truncate block">
                      {category}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEs ? 'Disponible en registro de gastos' : 'Available in expense logging'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {isEs ? 'Activa' : 'Active'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleArchiveCategory(category)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  >
                    {isEs ? 'Archivar' : 'Archive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived Categories Section (if any) */}
        {archivedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>
                {isEs ? 'Categorías archivadas' : 'Archived categories'} ({archivedCategories.length})
              </span>
              <span className="text-[10px] text-slate-400">{showArchived ? '▲' : '▼'}</span>
            </button>

            {showArchived && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                {archivedCategories.map((category) => (
                  <div
                    key={category}
                    className="px-4 py-3 flex items-center justify-between gap-4 opacity-75"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-400 shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreCategory(category)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {isEs ? 'Restaurar' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
