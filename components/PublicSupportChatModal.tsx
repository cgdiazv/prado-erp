'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';
import { getPublicSupportThread, sendPublicSupportMessage } from '@/app/actions/messengerActions';
import { isWithinSupportBusinessHours } from '@/lib/supportHours';

type SupportMessage = {
  id: string;
  author_user_id: string | null;
  author_email: string | null;
  comment: string;
  created_at: string;
};

type StoredVisitorSession = {
  ticketId: string | null;
  name: string;
  email: string;
};

const STORAGE_KEY = 'prado_public_support_chat_v1';
const TEASER_DISMISSED_KEY = 'prado_public_support_teaser_dismissed_v1';

export default function PublicSupportChatModal() {
  const pathname = usePathname();
  const params = useParams();
  const lngParam = params?.lng;
  const locale = typeof lngParam === 'string' && lngParam.length > 0 ? lngParam : 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  // Hide inside /dashboard because the authenticated dashboard renders its own SupportChatModal
  const isDashboardRoute = Boolean(pathname && /\/dashboard(\/|$)/.test(pathname));

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSupportOnline, setIsSupportOnline] = useState(() => isWithinSupportBusinessHours());
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [ticketPriority, setTicketPriority] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSending, startTransition] = useTransition();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredVisitorSession>;
      if (typeof parsed.name === 'string') setVisitorName(parsed.name);
      if (typeof parsed.email === 'string') setVisitorEmail(parsed.email);
      if (typeof parsed.ticketId === 'string' && parsed.ticketId.length > 0) {
        setTicketId(parsed.ticketId);
      }
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  const persistSession = (next: StoredVisitorSession) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  };

  useEffect(() => {
    setIsSupportOnline(isWithinSupportBusinessHours());
    const intervalId = window.setInterval(() => {
      setIsSupportOnline(isWithinSupportBusinessHours());
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isDashboardRoute || isOpen) return;

    try {
      if (sessionStorage.getItem(TEASER_DISMISSED_KEY) === 'true') {
        return;
      }
    } catch {
      // Ignore storage access errors
    }

    let triggered = false;
    let timerId: number | null = null;

    const handleActivity = () => {
      if (triggered) return;
      triggered = true;
      cleanupListeners();
      timerId = window.setTimeout(() => {
        setShowTeaser(true);
      }, 2500);
    };

    const events: Array<keyof WindowEventMap> = ['scroll', 'mousemove', 'pointerdown', 'keydown', 'touchstart'];

    const cleanupListeners = () => {
      for (const evt of events) {
        window.removeEventListener(evt, handleActivity);
      }
    };

    for (const evt of events) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }

    return () => {
      cleanupListeners();
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [isDashboardRoute, isOpen]);

  const dismissTeaser = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowTeaser(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(TEASER_DISMISSED_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    }
  };

  const loadThread = async (activeTicketId = ticketId, activeEmail = visitorEmail) => {
    if (!activeTicketId || !activeEmail.trim()) {
      return;
    }

    setIsLoadingThread(true);
    setErrorMessage('');
    const result = await getPublicSupportThread({
      ticketId: activeTicketId,
      visitorEmail: activeEmail,
    });

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
    if (!isOpen || !ticketId || !visitorEmail.trim()) return;

    void loadThread(ticketId, visitorEmail);

    const pollId = window.setInterval(() => {
      void loadThread(ticketId, visitorEmail);
    }, 15000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [isOpen, ticketId, visitorEmail]);

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

  if (isDashboardRoute) {
    return null;
  }

  const toggleModal = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        dismissTeaser();
      }
      return next;
    });
    setStatusMessage('');
    setErrorMessage('');
  };

  const hasSavedIdentity = Boolean(visitorEmail.trim() && ticketId && !isEditingIdentity);

  const handleSendMessage = () => {
    startTransition(async () => {
      setStatusMessage('');
      setErrorMessage('');

      const cleanEmail = visitorEmail.trim().toLowerCase();
      const cleanName = visitorName.trim();

      const result = await sendPublicSupportMessage({
        ticketId,
        visitorName: cleanName,
        visitorEmail: cleanEmail,
        message: messageText,
        locale,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      const nextTicketId = result?.ticketId || ticketId;
      setTicketId(nextTicketId);
      setIsEditingIdentity(false);
      persistSession({
        ticketId: nextTicketId,
        name: cleanName,
        email: cleanEmail,
      });

      setMessageText('');
      setStatusMessage(isEs ? 'Mensaje enviado.' : 'Message sent.');
      if (nextTicketId) {
        await loadThread(nextTicketId, cleanEmail);
      }
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

    if (isSending || messageText.trim().length === 0 || !visitorEmail.trim()) {
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
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
          {showTeaser ? (
            <div
              onClick={toggleModal}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleModal();
                }
              }}
              className="group/teaser relative max-w-[250px] sm:max-w-[270px] rounded-2xl rounded-br-sm border border-slate-200/90 bg-white/95 backdrop-blur-md pl-3.5 pr-7 py-2.5 text-left shadow-lg shadow-slate-900/10 ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl cursor-pointer"
            >
              <button
                type="button"
                onClick={dismissTeaser}
                aria-label={isEs ? 'Cerrar mensaje' : 'Dismiss prompt'}
                className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
              <p className="text-[11px] font-bold text-emerald-700 tracking-tight">
                {isEs ? '👋 ¿Podemos ayudarte?' : '👋 Need a hand?'}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">
                {isEs
                  ? '¿Tienes alguna pregunta sobre Prado? Chatea con nosotros aquí.'
                  : 'Have any questions about Prado? Click here to chat with us.'}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleModal}
            title={
              isEs
                ? `Chat con soporte Prado (${hoursLabel})`
                : `Chat with Prado support (${hoursLabel})`
            }
            aria-label={isEs ? 'Chat con soporte Prado' : 'Chat with Prado support'}
            className="group flex h-13 w-13 md:h-14 md:w-14 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-900/25 ring-2 ring-white transition hover:scale-105 active:scale-95 cursor-pointer"
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
        </div>
      ) : null}

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex h-dvh flex-col overscroll-none bg-white text-slate-900 md:inset-auto md:bottom-20 md:right-5 md:h-[min(78vh,680px)] md:w-[min(28rem,calc(100vw-2rem))] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleModal}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                    aria-label={isEs ? 'Cerrar chat' : 'Close chat'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    <span>{isEs ? 'Cerrar' : 'Close'}</span>
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
                      ? '¿Tienes preguntas sobre Prado? Déjanos tu correo y escríbenos para iniciar tu chat con nuestro equipo.'
                      : 'Have questions about Prado? Enter your email and send us a message to start chatting with our team.'}
                  </div>
                ) : null}

                {messages.map((message) => {
                  const rawAuthor = (message.author_email || '').toLowerCase();
                  const isPrado = rawAuthor.endsWith('@pradojob.com') || rawAuthor.endsWith('@indevasa.com');
                  const isMine = !isPrado && rawAuthor === visitorEmail.trim().toLowerCase();
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

              <div className="border-t border-slate-200 px-4 py-3 space-y-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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

                {hasSavedIdentity ? (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">
                    <span className="truncate">
                      {isEs ? 'Chateando como' : 'Chatting as'}{' '}
                      <strong className="text-slate-800">{visitorName ? `${visitorName} (${visitorEmail})` : visitorEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingIdentity(true)}
                      className="ml-2 shrink-0 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      {isEs ? 'Cambiar' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder={isEs ? 'Tu nombre (opcional)' : 'Your name (optional)'}
                      disabled={isSending}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      placeholder={isEs ? 'Tu correo electrónico *' : 'Your email address *'}
                      disabled={isSending}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                )}

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
                    className="support-chat-composer min-h-[40px] max-h-[140px] flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    disabled={isSending}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isSending || messageText.trim().length === 0 || !visitorEmail.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                    aria-label={isEs ? 'Enviar mensaje' : 'Send message'}
                  >
                    {isSending ? (
                      <span className="text-[10px] font-semibold">...</span>
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
