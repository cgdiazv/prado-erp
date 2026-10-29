'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { sendDashboardSupportMessage } from '@/app/actions/messengerActions';
import { isWithinSupportBusinessHours } from '@/lib/supportHours';

type SupportMessageRow = {
  id: string;
  author_user_id: string | null;
  author_email: string | null;
  comment: string;
  created_at: string;
};

interface MessengerInboxProps {
  locale?: string;
  currentUserId: string;
  ticketStatus: string | null;
  ticketPriority: string | null;
  messages: SupportMessageRow[];
}

export default function MessengerInbox({
  locale = 'en',
  currentUserId,
  ticketStatus,
  ticketPriority,
  messages,
}: MessengerInboxProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const router = useRouter();
  const [messageText, setMessageText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupportOnline, setIsSupportOnline] = useState(() => isWithinSupportBusinessHours());
  const [pending, startTransition] = useTransition();
  const normalizedStatus = (ticketStatus || '').toLowerCase();
  const ticketClosed = normalizedStatus === 'closed';
  const ticketResolved = normalizedStatus === 'resolved';

  useEffect(() => {
    setIsSupportOnline(isWithinSupportBusinessHours());
    const intervalId = window.setInterval(() => {
      setIsSupportOnline(isWithinSupportBusinessHours());
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Keep chat fresh with agent replies from prado-sys
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !pending) {
        router.refresh();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [router, pending]);

  const statusLabel = useMemo(() => {
    if (!ticketStatus) return isEs ? 'Sin ticket activo' : 'No active ticket';

    const map: Record<string, { en: string; es: string }> = {
      open: { en: 'Open', es: 'Abierto' },
      in_progress: { en: 'In progress', es: 'En progreso' },
      blocked: { en: 'Blocked', es: 'Bloqueado' },
      resolved: { en: 'Resolved', es: 'Resuelto' },
      closed: { en: 'Closed', es: 'Cerrado' },
    };

    const normalized = ticketStatus.toLowerCase();
    return map[normalized] ? (isEs ? map[normalized].es : map[normalized].en) : ticketStatus;
  }, [isEs, ticketStatus]);

  const handleSend = () => {
    startTransition(async () => {
      setStatusMessage('');
      setErrorMessage('');
      const result = await sendDashboardSupportMessage({
        message: messageText,
        locale,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setMessageText('');
      setStatusMessage(isEs ? 'Mensaje enviado al equipo de Prado.' : 'Message sent to the Prado team.');
      router.refresh();
    });
  };

  const hoursLabel = isEs
    ? 'Horario de atención: Lun–Vie, 9:00 AM – 6:00 PM CST'
    : 'Support hours: Mon–Fri, 9:00 AM – 6:00 PM CST';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{isEs ? 'Canal de soporte Prado' : 'Prado support channel'}</h2>
          <p className="text-xs text-slate-500">
            {isEs
              ? 'Escribe aquí para recibir ayuda de soporte dentro de tu operación.'
              : 'Use this channel to get support help inside your operation.'}{' '}
            <span className="font-medium text-slate-600">({hoursLabel})</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              isSupportOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isSupportOnline
              ? (isEs ? 'En línea' : 'Online')
              : (isEs ? 'Fuera de horario' : 'Off hours')}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            {statusLabel}
          </span>
          {ticketPriority ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {ticketPriority}
            </span>
          ) : null}
        </div>
      </div>

      <div className="max-h-[56vh] overflow-y-auto bg-slate-50 px-5 py-5 space-y-3">
        {!isSupportOnline ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-800">
            {isEs
              ? 'Nuestro horario de soporte en vivo es de lunes a viernes de 9:00 AM a 6:00 PM CST. Déjanos tu mensaje y te responderemos tan pronto como lo veamos.'
              : "Our live support hours are Monday to Friday from 9:00 AM to 6:00 PM CST. Leave us a message and we'll get back to you as soon as we see it."}
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {isEs
              ? 'Todavía no hay mensajes. Envíanos el primero para abrir tu chat de soporte.'
              : 'No messages yet. Send the first message to open your support chat.'}
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.author_user_id === currentUserId;
            const rawAuthor = (message.author_email || '').toLowerCase();
            const isPrado = rawAuthor.endsWith('@pradojob.com') || rawAuthor.endsWith('@indevasa.com');
            const authorLabel = isMine
              ? (isEs ? 'Tú' : 'You')
              : (isPrado ? (isEs ? 'Soporte Prado' : 'Prado Support') : (isEs ? 'Equipo' : 'Team'));

            return (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isMine ? 'ml-auto bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-85">{authorLabel}</p>
                <p className="whitespace-pre-wrap">{message.comment}</p>
                <p className={`mt-2 text-[11px] ${isMine ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {new Date(message.created_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-4 space-y-3">
        {ticketClosed ? (
          <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            {isEs ? 'Este chat fue cerrado. Envía un nuevo mensaje para abrir una conversación nueva.' : 'This chat was closed. Send a new message to open a new conversation.'}
          </p>
        ) : null}
        {ticketResolved ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {isEs ? 'Este ticket está resuelto. Puedes enviar un nuevo mensaje para reabrir la conversación.' : 'This ticket is resolved. Send a new message to reopen the conversation.'}
          </p>
        ) : null}
        {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          rows={4}
          placeholder={isEs ? 'Escribe tu mensaje para soporte…' : 'Write your message for support…'}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          disabled={pending}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={pending || messageText.trim().length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar mensaje' : 'Send message')}
          </button>
        </div>
      </div>
    </section>
  );
}
