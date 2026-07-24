'use client';

import { useEffect, useState } from 'react';
import { disconnectMessengerConnection, checkMessengerConnection, saveMessengerConnection } from '@/app/actions/messengerActions';
import { getMessengerWebhookPath } from '@/lib/messenger';

interface MessengerIntegrationCardProps {
  organizationId: string;
  locale?: string;
}

export default function MessengerIntegrationCard({ organizationId, locale = 'en' }: MessengerIntegrationCardProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(getMessengerWebhookPath());

  useEffect(() => {
    async function loadStatus() {
      const result = await checkMessengerConnection(organizationId);
      setConnected(result.isConnected);
      setPageId(result.pageId || '');
      setPageName(result.pageName || '');
      setLoading(false);
    }

    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}${getMessengerWebhookPath()}`);
    }

    void loadStatus();
  }, [organizationId]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('pageId', pageId);
    formData.set('pageName', pageName);
    formData.set('pageAccessToken', pageAccessToken);

    const result = await saveMessengerConnection(formData);
    setSaving(false);

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    setConnected(true);
    setPageAccessToken('');
    setStatusMessage(isEs ? 'Messenger conectado correctamente.' : 'Messenger connected successfully.');
  }

  async function handleDisconnect() {
    setSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    const result = await disconnectMessengerConnection(organizationId, locale);
    setSaving(false);

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    setConnected(false);
    setPageId('');
    setPageName('');
    setPageAccessToken('');
    setStatusMessage(isEs ? 'Messenger desconectado.' : 'Messenger disconnected.');
  }

  if (loading) {
    return <div className="p-6 md:p-8 text-sm text-slate-500">{isEs ? 'Cargando integración...' : 'Loading integration...'}</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <h3 className="text-lg font-medium text-slate-900">{isEs ? 'Messenger Inbox Integration' : 'Messenger Inbox Integration'}</h3>
        <p className="mt-2 text-sm text-slate-500">
          {isEs
            ? 'Conecta una Facebook Page para recibir y responder mensajes desde Prado. Esto funciona con Messenger de una página, no con una cuenta personal.'
            : 'Connect a Facebook Page to receive and reply to messages from Prado. This works with a Page inbox, not a personal Messenger account.'}
        </p>
      </div>

      {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
        <p><strong>{isEs ? 'Webhook URL:' : 'Webhook URL:'}</strong> {webhookUrl}</p>
        <p><strong>{isEs ? 'Verify token env:' : 'Verify token env:'}</strong> META_WEBHOOK_VERIFY_TOKEN</p>
        <p>{isEs ? 'Meta también requiere que tu app tenga permisos de Messenger para la página y un Page Access Token válido.' : 'Meta also requires your app to have Messenger permissions for the Page and a valid Page Access Token.'}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{isEs ? 'Page name' : 'Page name'}</label>
            <input
              type="text"
              value={pageName}
              onChange={(event) => setPageName(event.target.value)}
              placeholder={isEs ? 'Ej. Prado Support' : 'Example: Prado Support'}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Page ID</label>
            <input
              type="text"
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Page Access Token</label>
          <input
            type="password"
            value={pageAccessToken}
            onChange={(event) => setPageAccessToken(event.target.value)}
            placeholder={connected ? (isEs ? 'Ingresa un nuevo token solo si deseas reemplazarlo' : 'Enter a new token only if you want to replace it') : ''}
            required={!connected}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#166fe0] disabled:opacity-60"
          >
            {saving ? (isEs ? 'Guardando...' : 'Saving...') : (connected ? (isEs ? 'Actualizar conexión' : 'Update connection') : (isEs ? 'Conectar Messenger' : 'Connect Messenger'))}
          </button>

          {connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={saving}
              className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {isEs ? 'Desconectar' : 'Disconnect'}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
