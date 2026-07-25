'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { getDashboardSupportThread, sendDashboardSupportMessage } from '@/app/actions/messengerActions';

type SupportMessage = {
  id: string;
  author_user_id: string | null;
  author_email: string | null;
  comment: string;
  created_at: string;
};

interface SupportChatModalProps {
  locale?: string;
  currentUserId: string;
}

export default function SupportChatModal({ locale = 'en', currentUserId }: SupportChatModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [ticketPriority, setTicketPriority] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSending, startTransition] = useTransition();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const loadThread = async () => {
    setIsLoadingThread(true);
    setErrorMessage('');
    const result = await getDashboardSupportThread();

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoadingThread(false);
      return;
    }

    setMessages((result?.messages || []) as SupportMessage[]);
    setTicketStatus((result?.ticketStatus as string | null) || null);
    setTicketPriority((result?.ticketPriority as string | null) || null);
    setIsLoadingThread(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    void loadThread();

    const pollId = window.setInterval(() => {
      void loadThread();
    }, 15000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages.length]);

  const normalizedStatus = (ticketStatus || '').toLowerCase();
  const isClosed = normalizedStatus === 'closed';
  const isResolved = normalizedStatus === 'resolved';

  const statusLabel = useMemo(() => {
    if (!ticketStatus) return isEs ? 'Nuevo chat' : 'New chat';

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

  const toggleModal = () => {
    setIsOpen((current) => !current);
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleSendMessage = () => {
    if (isClosed) return;

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
      setStatusMessage(isEs ? 'Mensaje enviado.' : 'Message sent.');
      await loadThread();
    });
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    if (event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();

    if (isClosed || isSending || messageText.trim().length === 0) {
      return;
    }

    handleSendMessage();
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleModal}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 19.5A2.625 2.625 0 0021 16.875V7.125A2.625 2.625 0 0018.375 4.5H5.625A2.625 2.625 0 003 7.125v9.75A2.625 2.625 0 005.625 19.5h8.155a2.625 2.625 0 011.857.769l1.594 1.594a.375.375 0 00.64-.265V19.5h.504Z" />
        </svg>
        <span>{isOpen ? (isEs ? 'Cerrar chat' : 'Close chat') : (isEs ? 'Chat soporte' : 'Support chat')}</span>
      </button>

      {isOpen ? (
        <div className="fixed bottom-20 right-4 z-40 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl md:right-5">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{isEs ? 'Chat con Prado' : 'Prado support chat'}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  {statusLabel}
                </span>
                {ticketPriority ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {ticketPriority}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleModal}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={isEs ? 'Cerrar chat' : 'Close chat'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-80 overflow-y-auto bg-slate-50 px-4 py-4 space-y-2">
            {isLoadingThread ? (
              <p className="text-sm text-slate-500">{isEs ? 'Cargando conversación...' : 'Loading conversation...'}</p>
            ) : null}

            {!isLoadingThread && messages.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                {isEs
                  ? 'Aún no hay mensajes. Escríbenos para abrir tu chat de soporte.'
                  : 'No messages yet. Send us a message to start your support chat.'}
              </div>
            ) : null}

            {messages.map((message) => {
              const isMine = message.author_user_id === currentUserId;
              const rawAuthor = (message.author_email || '').toLowerCase();
              const isPrado = rawAuthor.endsWith('@pradojob.com') || rawAuthor.endsWith('@indevasa.com');
              const authorLabel = isMine
                ? (isEs ? 'Tú' : 'You')
                : (isPrado ? (isEs ? 'Soporte Prado' : 'Prado Support') : (isEs ? 'Equipo' : 'Team'));
              const bubbleClassName = isMine
                ? 'ml-auto bg-emerald-600 text-white'
                : (isPrado ? 'bg-sky-50 text-sky-900 border border-sky-200' : 'bg-white text-slate-800 border border-slate-200');
              const timestampClassName = isMine
                ? 'text-emerald-100'
                : (isPrado ? 'text-sky-500' : 'text-slate-400');

              return (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm ${bubbleClassName}`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-85">{authorLabel}</p>
                  <p className="whitespace-pre-wrap">{message.comment}</p>
                  <p className={`mt-1 text-[10px] ${timestampClassName}`}>
                    {new Date(message.created_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}
                  </p>
                </div>
              );
            })}

            <div ref={scrollAnchorRef} />
          </div>

          <div className="border-t border-slate-200 px-4 py-3 space-y-2">
            {isResolved ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                {isEs ? 'Ticket resuelto. Puedes enviar un nuevo mensaje para reabrir.' : 'Ticket resolved. Send a new message to reopen it.'}
              </p>
            ) : null}
            {statusMessage ? <p className="text-xs text-emerald-600">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}

            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={3}
              placeholder={isEs ? 'Escribe tu mensaje...' : 'Write your message...'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={isClosed || isSending}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isClosed || isSending || messageText.trim().length === 0}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSending ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
