'use client';

import { useEffect, useState } from 'react';
import { getStoredExpenseCategories } from '@/lib/expenseCategories';

interface ExpenseCategorySelectProps {
  name?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
}

export default function ExpenseCategorySelect({
  name = 'category',
  required = true,
  className = '',
  defaultValue,
}: ExpenseCategorySelectProps) {
  const [categories, setCategories] = useState<string[]>(getStoredExpenseCategories());

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

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue || categories[0] || ''}
      className={className}
    >
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
