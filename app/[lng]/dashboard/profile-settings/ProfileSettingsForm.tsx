'use client';

import { useState } from 'react';
import { upsertUserProfile } from '@/app/[lng]/dashboard/settings/actions';

interface ProfileSettingsFormProps {
  locale: string;
  accountEmail: string;
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
}

export default function ProfileSettingsForm({
  locale,
  accountEmail,
  initialFirstName,
  initialLastName,
  initialPhone,
}: ProfileSettingsFormProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'phone' | null>(null);

  function toggleField(field: 'name' | 'phone') {
    setError('');
    setSuccess('');
    setEditingField((current) => (current === field ? null : field));
  }

  function renderFieldActions(field: 'name' | 'phone') {
    const isEditing = editingField === field;

    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggleField(field)}
          className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          {isEditing ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
        </button>
        {isEditing ? (
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
          >
            {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
          </button>
        ) : null}
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('firstName', firstName);
    formData.set('lastName', lastName);
    formData.set('phone', phone);

    const result = await upsertUserProfile(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setEditingField(null);
    setSuccess(isEs ? 'Perfil actualizado correctamente.' : 'Profile updated successfully.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded">
          {success}
        </div>
      ) : null}

      <div className="-mx-6 md:-mx-8">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isEs ? 'Correo de la cuenta' : 'Account Email'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">{accountEmail || '—'}</p>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isEs ? 'Nombre completo' : 'Full Name'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {`${firstName} ${lastName}`.trim() || (isEs ? 'Sin nombre' : 'No name set')}
                </p>
              </div>
              {renderFieldActions('name')}
            </div>
            <div className={editingField === 'name' ? 'mt-3 grid grid-cols-1 md:grid-cols-2 gap-3' : 'hidden'}>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder={isEs ? 'Nombre' : 'First Name'}
                required
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
              />
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder={isEs ? 'Apellido' : 'Last Name'}
                required
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
              />
            </div>
          </div>

          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isEs ? 'Telefono' : 'Phone'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">{phone.trim() || (isEs ? 'Sin teléfono' : 'No phone')}</p>
              </div>
              {renderFieldActions('phone')}
            </div>
            <div className={editingField === 'phone' ? 'mt-3' : 'hidden'}>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={isEs ? 'Telefono' : 'Phone'}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
