'use client';

import { useEffect, useState } from 'react';
import {
  archiveExpenseCategory,
  DEFAULT_EXPENSE_CATEGORIES,
  emitExpenseCategoriesUpdated,
  getArchivedExpenseCategories,
  getStoredExpenseCategories,
  saveExpenseCategories,
  upsertExpenseCategory,
} from '@/lib/expenseCategories';
import { getTranslations } from '@/lib/translations';
import { Plus, X, Pencil, Archive, Check, RotateCcw } from 'lucide-react';

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
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryInput, setEditCategoryInput] = useState('');
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

  const startEditingCategory = (category: string) => {
    setStatusMessage('');
    setEditingCategory(category);
    setEditCategoryInput(category);
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
    setEditCategoryInput('');
  };

  const handleUpdateCategory = (originalCategory: string) => {
    const normalizedValue = editCategoryInput.trim().replace(/\s+/g, ' ');
    if (!normalizedValue) {
      setStatusMessage(isEs ? 'Ingresa el nombre de la categoría.' : 'Enter a category name first.');
      return;
    }

    const isDuplicate = categories.some(
      (cat) =>
        cat.toLowerCase() !== originalCategory.toLowerCase() &&
        cat.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Esa categoría ya existe.' : 'That category already exists.');
      return;
    }

    const nextCategories = categories.map((cat) =>
      cat === originalCategory ? normalizedValue : cat
    );
    saveExpenseCategories(nextCategories);
    setCategories(getStoredExpenseCategories());
    setArchivedCategories(getArchivedExpenseCategories());
    emitExpenseCategoriesUpdated();
    cancelEditingCategory();
    setStatusMessage(
      isEs
        ? `Categoría "${normalizedValue}" actualizada con éxito.`
        : `Updated "${normalizedValue}" successfully.`
    );
  };

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
            {translations.dashboard.expenseCategoriesDescription ||
              (isEs
                ? 'Crea o administra categorías para registrar y clasificar gastos.'
                : 'Create or manage categories to track and classify expenses.')}
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

      {/* Categories Table */}
      <div className="border-t border-slate-200">
        {categories.length === 0 ? (
          <div className="px-6 md:px-8 py-8 text-center">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500">
                    {isEs ? 'Descripción' : 'Description'}
                  </th>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">
                    {isEs ? 'Acciones' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {categories.map((category) => {
                  const isEditingThis = editingCategory === category;

                  if (isEditingThis) {
                    return (
                      <tr key={category} className="bg-emerald-50/30">
                        <td className="px-6 md:px-8 py-4">
                          <input
                            type="text"
                            value={editCategoryInput}
                            onChange={(e) => setEditCategoryInput(e.target.value)}
                            placeholder={isEs ? 'Nombre de categoría' : 'Category name'}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateCategory(category);
                              } else if (e.key === 'Escape') {
                                cancelEditingCategory();
                              }
                            }}
                            className="w-full max-w-md rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </td>

                        <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={cancelEditingCategory}
                              title={isEs ? 'Cancelar' : 'Cancel'}
                              aria-label={isEs ? 'Cancelar' : 'Cancel'}
                              className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(category)}
                              title={isEs ? 'Actualizar' : 'Update'}
                              aria-label={isEs ? 'Actualizar' : 'Update'}
                              className="inline-flex items-center justify-center p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/80 transition cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={category} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 md:px-8 py-4">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900">
                          {category}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isEs
                            ? 'Disponible en registro de gastos'
                            : 'Available in expense logging'}
                        </p>
                      </td>

                      <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingCategory(category)}
                            title={isEs ? 'Editar categoría' : 'Edit category'}
                            aria-label={isEs ? 'Editar categoría' : 'Edit category'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer border border-transparent hover:border-emerald-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveCategory(category)}
                            title={isEs ? 'Archivar categoría' : 'Archive category'}
                            aria-label={isEs ? 'Archivar categoría' : 'Archive category'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition duration-150 cursor-pointer border border-transparent hover:border-red-100"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Archived Categories Section (if any) */}
        {archivedCategories.length > 0 && (
          <div className="px-6 md:px-8 py-4 border-t border-slate-100">
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
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreCategory(category)}
                      title={isEs ? 'Restaurar categoría' : 'Restore category'}
                      aria-label={isEs ? 'Restaurar categoría' : 'Restore category'}
                      className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
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
