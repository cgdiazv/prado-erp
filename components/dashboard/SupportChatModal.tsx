'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { getDashboardSupportThread, sendDashboardSupportMessage } from '@/app/actions/messengerActions';
import { isWithinSupportBusinessHours } from '@/lib/supportHours';

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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSupportOnline, setIsSupportOnline] = useState(() => isWithinSupportBusinessHours());
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [ticketPriority, setTicketPriority] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSending, startTransition] = useTransition();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setIsSupportOnline(isWithinSupportBusinessHours());
    const intervalId = window.setInterval(() => {
      setIsSupportOnline(isWithinSupportBusinessHours());
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

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
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewportState = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportState();

    mediaQuery.addEventListener('change', updateViewportState);
    return () => {
      mediaQuery.removeEventListener('change', updateViewportState);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages.length]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = '0px';
    const nextHeight = Math.min(composer.scrollHeight, 140);
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY = composer.scrollHeight > 140 ? 'auto' : 'hidden';
  }, [messageText, isOpen]);

  useEffect(() => {
    if (!isOpen || !isMobileViewport) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalRight = document.body.style.right;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
      document.body.style.right = originalRight;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileViewport, isOpen]);

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

    if (isSending || messageText.trim().length === 0) {
      return;
    }

    handleSendMessage();
  };

  const hoursLabel = isEs
    ? 'Lun–Vie, 9:00 AM – 6:00 PM CST'
    : 'Mon–Fri, 9:00 AM – 6:00 PM CST';

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={toggleModal}
          title={
            isEs
              ? `Chat con soporte Prado (${hoursLabel})`
              : `Chat with Prado support (${hoursLabel})`
          }
          aria-label={isEs ? 'Chat con soporte Prado' : 'Chat with Prado support'}
          className="group fixed bottom-5 right-5 z-40 flex h-13 w-13 md:h-14 md:w-14 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-900/25 ring-2 ring-white transition hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="h-full w-full overflow-hidden rounded-full">
              <Image
                src="/support-agent.jpg"
                alt={isEs ? 'Soporte Prado' : 'Prado Support'}
                width={56}
                height={56}
                className="h-full w-full object-cover object-center transition duration-200 group-hover:scale-105"
              />
            </div>
            {/* Online / Off-Hours Indicator Badge */}
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
              {isSupportOnline ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </>
              ) : (
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
              )}
            </span>
          </div>
        </button>
      ) : null}

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-[9999] flex h-dvh flex-col overscroll-none bg-white md:inset-auto md:bottom-20 md:right-5 md:h-[min(78vh,680px)] md:w-[min(28rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  aria-label={isEs ? 'Volver al dashboard' : 'Back to dashboard'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  <span>{isEs ? 'Volver' : 'Back'}</span>
                </button>

                <div className="relative h-8 w-8 rounded-full overflow-hidden ring-1 ring-slate-200">
                  <Image
                    src="/support-agent.jpg"
                    alt="Prado Support"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover object-center"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white ${
                      isSupportOnline ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900">{isEs ? 'Chat con Prado' : 'Prado support chat'}</h3>
                <p className="text-[10px] text-slate-500">{hoursLabel}</p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSupportOnline
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isSupportOnline
                      ? (isEs ? 'En línea' : 'Online')
                      : (isEs ? 'Fuera de horario' : 'Off hours')}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {statusLabel}
                  </span>
                  {ticketPriority ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {ticketPriority}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-2">
            {!isSupportOnline ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-800">
                {isEs
                  ? 'Nuestro horario de atención en vivo es de lunes a viernes de 9:00 AM a 6:00 PM CST. Déjanos tu mensaje y te responderemos tan pronto como lo veamos.'
                  : "Our live support hours are Monday to Friday from 9:00 AM to 6:00 PM CST. Leave us a message and we'll get back to you as soon as we see it."}
              </div>
            ) : null}

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
                ? 'ml-auto bg-emerald-200 border border-emerald-300 text-emerald-900'
                : (isPrado ? 'bg-sky-50 text-sky-900 border border-sky-200' : 'bg-white text-slate-800 border border-slate-200');
              const timestampClassName = isMine
                ? 'text-emerald-700'
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

            <div className="border-t border-slate-200 px-4 py-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {isClosed ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-700">
                {isEs ? 'Este chat fue cerrado. Envía un nuevo mensaje para abrir una conversación nueva.' : 'This chat was closed. Send a new message to open a new conversation.'}
              </p>
            ) : null}
            {isResolved ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                {isEs ? 'Ticket resuelto. Puedes enviar un nuevo mensaje para reabrir.' : 'Ticket resolved. Send a new message to reopen it.'}
              </p>
            ) : null}
            {statusMessage ? <p className="text-xs text-emerald-600">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}

            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                placeholder={isEs ? 'Escribe tu mensaje...' : 'Write your message...'}
                className="support-chat-composer min-h-[40px] max-h-[140px] flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm leading-5 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isSending || messageText.trim().length === 0}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-60"
                aria-label={isEs ? 'Enviar mensaje' : 'Send message'}
              >
                {isSending ? (
                  <span className="text-[10px] font-semibold">{isEs ? '...' : '...'}</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
            </div>
          </div>,
          document.body
        )
        : null}
    </>
  );
}
