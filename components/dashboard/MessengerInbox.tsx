'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { linkMessengerConversationCustomer, markMessengerConversationRead, sendMessengerReply } from '@/app/actions/messengerActions';

type ConversationRow = {
  id: string;
  sender_name: string | null;
  sender_psid: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  customer_id: string | null;
};

type MessageRow = {
  id: string;
  direction: 'inbound' | 'outbound';
  message_text: string | null;
  sent_at: string;
};

type CustomerOption = {
  id: string;
  label: string;
};

interface MessengerInboxProps {
  locale?: string;
  connected: boolean;
  conversations: ConversationRow[];
  selectedConversationId?: string | null;
  selectedMessages: MessageRow[];
  customerOptions: CustomerOption[];
}

export default function MessengerInbox({
  locale = 'en',
  connected,
  conversations,
  selectedConversationId,
  selectedMessages,
  customerOptions,
}: MessengerInboxProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const router = useRouter();
  const [replyText, setReplyText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  const handleSend = () => {
    if (!selectedConversation) return;

    startTransition(async () => {
      setStatusMessage('');
      setErrorMessage('');
      const result = await sendMessengerReply({
        conversationId: selectedConversation.id,
        message: replyText,
        locale,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setReplyText('');
      setStatusMessage(isEs ? 'Respuesta enviada.' : 'Reply sent.');
      router.refresh();
    });
  };

  const handleMarkRead = () => {
    if (!selectedConversation) return;

    startTransition(async () => {
      await markMessengerConversationRead({ conversationId: selectedConversation.id, locale });
      router.refresh();
    });
  };

  const handleLinkCustomer = (customerId: string) => {
    if (!selectedConversation) return;

    startTransition(async () => {
      await linkMessengerConversationCustomer({
        conversationId: selectedConversation.id,
        customerId: customerId || null,
        locale,
      });
      router.refresh();
    });
  };

  if (!connected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEs ? 'Messenger Inbox' : 'Messenger Inbox'}</h1>
        <p className="mt-3 text-sm text-slate-500">
          {isEs
            ? 'Conecta tu Facebook Page en Integrations para empezar a recibir mensajes aquí.'
            : 'Connect your Facebook Page in Integrations to start receiving messages here.'}
        </p>
        <Link
          href={`/${locale}/dashboard/settings/integrations`}
          className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {isEs ? 'Abrir integraciones' : 'Open integrations'}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">{isEs ? 'Conversaciones' : 'Conversations'}</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{isEs ? 'Aún no hay conversaciones entrantes.' : 'No incoming conversations yet.'}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;
              return (
                <Link
                  key={conversation.id}
                  href={`/${locale}/dashboard/messenger?conversation=${conversation.id}`}
                  className={`block px-5 py-4 transition ${isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{conversation.sender_name || conversation.sender_psid}</p>
                      <p className="mt-1 text-xs text-slate-500">{conversation.last_message_preview || (isEs ? 'Sin vista previa' : 'No preview')}</p>
                    </div>
                    {conversation.unread_count > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {conversation.last_message_at
                      ? new Date(conversation.last_message_at).toLocaleString(isEs ? 'es-ES' : 'en-US')
                      : '—'}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{selectedConversation?.sender_name || (isEs ? 'Selecciona una conversación' : 'Select a conversation')}</h1>
            <p className="text-xs text-slate-500">{selectedConversation?.sender_psid || (isEs ? 'Elige un hilo de la lista para responder.' : 'Pick a thread from the list to reply.')}</p>
          </div>
          {selectedConversation ? (
            <div className="flex flex-wrap gap-2">
              <select
                defaultValue={selectedConversation.customer_id || ''}
                onChange={(event) => handleLinkCustomer(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                disabled={pending}
              >
                <option value="">{isEs ? 'Sin cliente vinculado' : 'No linked customer'}</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleMarkRead}
                disabled={pending}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isEs ? 'Marcar leído' : 'Mark read'}
              </button>
            </div>
          ) : null}
        </div>

        {!selectedConversation ? (
          <div className="p-8 text-sm text-slate-500">{isEs ? 'Selecciona una conversación para ver los mensajes.' : 'Select a conversation to view messages.'}</div>
        ) : (
          <>
            <div className="max-h-[55vh] overflow-y-auto bg-slate-50 px-5 py-5 space-y-3">
              {selectedMessages.length === 0 ? (
                <div className="text-sm text-slate-500">{isEs ? 'No hay mensajes en este hilo todavía.' : 'No messages in this thread yet.'}</div>
              ) : (
                selectedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.direction === 'outbound' ? 'ml-auto bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}
                  >
                    <p className="whitespace-pre-wrap">{message.message_text || (isEs ? '[Adjunto]' : '[Attachment]')}</p>
                    <p className={`mt-2 text-[11px] ${message.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {new Date(message.sent_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 px-5 py-4 space-y-3">
              {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={4}
                placeholder={isEs ? 'Escribe una respuesta…' : 'Write a reply…'}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={pending || replyText.trim().length === 0}
                  className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
                >
                  {pending ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar respuesta' : 'Send reply')}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
