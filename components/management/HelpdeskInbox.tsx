'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createClient as createRealtimeClient } from '@/lib/supabaseClient';
import {
  getHelpdeskInboxSnapshot,
  markHelpdeskTicketSeenByAgent,
  sendHelpdeskAgentReply,
  updateHelpdeskTicketStatusQuick,
} from '@/app/[lng]/management/actions';

type OrgRow = { id: string; name: string };
type TicketRow = {
  id: string;
  organization_id: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignee_name: string | null;
  assignee_email: string | null;
  requested_by_email: string | null;
  escalated_from: string | null;
  unread_for_agent_count: number;
  unread_for_user_count: number;
  waiting_on: 'agent' | 'user' | 'none' | string;
  last_comment_at: string | null;
  last_comment_author_email: string | null;
  created_at: string;
  updated_at: string;
};
type CommentRow = {
  id: string;
  ticket_id: string;
  author_user_id: string | null;
  author_email: string | null;
  comment: string;
  created_at: string;
};
type EventRow = {
  id: string;
  ticket_id: string;
  event_type: string;
  event_note: string | null;
  actor_email: string | null;
  created_at: string;
};

type Snapshot = {
  organizations: OrgRow[];
  tickets: TicketRow[];
  comments: CommentRow[];
  events: EventRow[];
};

function isAgentEmail(email: string | null | undefined) {
  const value = (email || '').toLowerCase();
  return value.endsWith('@pradojob.com') || value.endsWith('@indevasa.com');
}

function waitingTone(waitingOn: string) {
  if (waitingOn === 'agent') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (waitingOn === 'user') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'open') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'in_progress') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (normalized === 'blocked') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'resolved') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (normalized === 'closed') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function HelpdeskInbox({
  locale,
  initialData,
}: {
  locale: string;
  initialData: Snapshot;
}) {
  const realtime = useMemo(() => createRealtimeClient(), []);
  const isEs = locale.toLowerCase().startsWith('es');
  const [snapshot, setSnapshot] = useState<Snapshot>(initialData);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialData.tickets[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [waitingFilter, setWaitingFilter] = useState<'all' | 'waiting_agent' | 'waiting_user'>('all');
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(false);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('unsupported');
  const [replyText, setReplyText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previousUnreadByTicketRef = useRef<Map<string, number>>(new Map());
  const initializedUnreadSnapshotRef = useRef(false);
  const replyComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const fallbackPollTimerRef = useRef<number | null>(null);

  const orgNameById = useMemo(() => {
    return new Map(snapshot.organizations.map((org) => [org.id, org.name]));
  }, [snapshot.organizations]);

  const commentsByTicketId = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    for (const comment of snapshot.comments) {
      const existing = map.get(comment.ticket_id) || [];
      existing.push(comment);
      map.set(comment.ticket_id, existing);
    }
    return map;
  }, [snapshot.comments]);

  const eventsByTicketId = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const event of snapshot.events) {
      const existing = map.get(event.ticket_id) || [];
      existing.push(event);
      map.set(event.ticket_id, existing);
    }
    return map;
  }, [snapshot.events]);

  const ticketSummaries = useMemo(() => {
    return snapshot.tickets.map((ticket) => {
      const comments = commentsByTicketId.get(ticket.id) || [];
      const latestComment = comments[comments.length - 1] || null;
      const latestActivityAt = ticket.last_comment_at || latestComment?.created_at || ticket.updated_at;
      const preview = latestComment?.comment || ticket.description;
      const normalizedWaitingOn = String(ticket.waiting_on || 'none').toLowerCase();
      const waitingOn = normalizedWaitingOn === 'agent' || normalizedWaitingOn === 'user' ? normalizedWaitingOn : 'none';
      const derivedUnreadFromUser = latestComment ? !isAgentEmail(latestComment.author_email) : false;
      const unreadForAgent = Number(ticket.unread_for_agent_count || 0);
      const unreadFromUser = unreadForAgent > 0 || (derivedUnreadFromUser && ticket.status !== 'closed');
      return {
        ...ticket,
        comments,
        latestComment,
        latestActivityAt,
        waitingOn,
        unreadForAgent,
        unreadFromUser,
        preview,
      };
    });
  }, [commentsByTicketId, snapshot.tickets]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      oscillator.start(now);
      oscillator.stop(now + 0.25);
    } catch {
      // Best-effort alert sound.
    }
  }, []);

  const activeTickets = useMemo(() => {
    const filtered = ticketSummaries
      .filter((ticket) => !['closed', 'resolved'].includes(ticket.status.toLowerCase()))
      .filter((ticket) => {
        if (waitingFilter === 'waiting_agent') return ticket.waitingOn === 'agent';
        if (waitingFilter === 'waiting_user') return ticket.waitingOn === 'user';
        return true;
      });

    return filtered
      .sort((a, b) => {
        if (a.unreadForAgent !== b.unreadForAgent) {
          return b.unreadForAgent - a.unreadForAgent;
        }
        if (a.waitingOn !== b.waitingOn) {
          if (a.waitingOn === 'agent') return -1;
          if (b.waitingOn === 'agent') return 1;
        }
        return new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime();
      });
  }, [ticketSummaries, waitingFilter]);

  const closedTickets = useMemo(() => {
    return ticketSummaries
      .filter((ticket) => ['closed', 'resolved'].includes(ticket.status.toLowerCase()))
      .sort((a, b) => new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime());
  }, [ticketSummaries]);

  const visibleTickets = activeTab === 'active' ? activeTickets : closedTickets;

  const selectedTicket = useMemo(() => {
    return ticketSummaries.find((ticket) => ticket.id === selectedTicketId) || visibleTickets[0] || null;
  }, [selectedTicketId, ticketSummaries, visibleTickets]);

  const selectedTicketMessages = useMemo(() => {
    if (!selectedTicket) return [] as CommentRow[];
    return selectedTicket.status.toLowerCase() === 'closed' ? [] : selectedTicket.comments;
  }, [selectedTicket]);

  useEffect(() => {
    if (selectedTicket) {
      if (selectedTicket.id !== selectedTicketId) {
        setSelectedTicketId(selectedTicket.id);
      }
      return;
    }
    setSelectedTicketId(null);
  }, [selectedTicket, selectedTicketId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedDesktopEnabled = window.localStorage.getItem('helpdesk_desktop_alerts_enabled') === 'true';
    const savedSoundEnabled = window.localStorage.getItem('helpdesk_sound_alerts_enabled') === 'true';
    setDesktopAlertsEnabled(savedDesktopEnabled);
    setSoundAlertsEnabled(savedSoundEnabled);

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission as 'default' | 'granted' | 'denied');
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('helpdesk_desktop_alerts_enabled', desktopAlertsEnabled ? 'true' : 'false');
  }, [desktopAlertsEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('helpdesk_sound_alerts_enabled', soundAlertsEnabled ? 'true' : 'false');
  }, [soundAlertsEnabled]);

  const refreshSnapshot = useCallback(async () => {
    setIsRefreshing(true);
    const result = await getHelpdeskInboxSnapshot(locale);

    if ('error' in result && result.error) {
      setErrorMessage(result.error);
      setIsRefreshing(false);
      return;
    }

    setSnapshot({
      organizations: result.organizations || [],
      tickets: result.tickets || [],
      comments: result.comments || [],
      events: result.events || [],
    });
    setIsRefreshing(false);
  }, [locale]);

  useEffect(() => {
    const currentUnreadByTicket = new Map<string, number>();
    for (const ticket of ticketSummaries) {
      currentUnreadByTicket.set(ticket.id, Number(ticket.unreadForAgent || 0));
    }

    if (!initializedUnreadSnapshotRef.current) {
      previousUnreadByTicketRef.current = currentUnreadByTicket;
      initializedUnreadSnapshotRef.current = true;
      return;
    }

    const previousUnreadByTicket = previousUnreadByTicketRef.current;
    const newlyUnreadTickets = ticketSummaries.filter((ticket) => {
      const prev = Number(previousUnreadByTicket.get(ticket.id) || 0);
      const curr = Number(ticket.unreadForAgent || 0);
      return curr > prev;
    });

    if (newlyUnreadTickets.length > 0 && soundAlertsEnabled) {
      playNotificationSound();
    }

    if (newlyUnreadTickets.length > 0 && desktopAlertsEnabled && notificationPermission === 'granted' && typeof window !== 'undefined') {
      for (const ticket of newlyUnreadTickets.slice(0, 3)) {
        const orgName = ticket.organization_id ? (orgNameById.get(ticket.organization_id) || ticket.organization_id) : 'Internal / Platform';
        const bodyText = ticket.preview || (isEs ? 'Tienes un nuevo mensaje.' : 'You have a new message.');
        const notification = new Notification(isEs ? 'Nuevo mensaje de soporte' : 'New support message', {
          body: `${orgName}: ${bodyText.slice(0, 120)}`,
          tag: `helpdesk-ticket-${ticket.id}`,
        });

        notification.onclick = () => {
          window.focus();
          setSelectedTicketId(ticket.id);
        };
      }
    }

    previousUnreadByTicketRef.current = currentUnreadByTicket;
  }, [desktopAlertsEnabled, isEs, notificationPermission, orgNameById, playNotificationSound, soundAlertsEnabled, ticketSummaries]);

  useEffect(() => {
    let isMounted = true;

    const triggerRefresh = () => {
      if (isMounted) {
        void refreshSnapshot();
      }
    };

    // Active polling every 5 seconds to ensure fast queue updates under all network conditions
    const pollInterval = window.setInterval(triggerRefresh, 5000);

    const channel = realtime
      .channel(`helpdesk-inbox-${locale}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'helpdesk_ticket_comments' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'helpdesk_tickets' }, triggerRefresh)
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(pollInterval);
      void realtime.removeChannel(channel);
    };
  }, [locale, realtime, refreshSnapshot]);

  useEffect(() => {
    const composer = replyComposerRef.current;
    if (!composer) return;

    composer.style.height = '0px';
    const nextHeight = Math.min(composer.scrollHeight, 140);
    composer.style.height = `${nextHeight}px`;
  }, [replyText, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicket) return;
    if (selectedTicket.unreadForAgent <= 0) return;

    startTransition(async () => {
      await markHelpdeskTicketSeenByAgent({ locale, ticketId: selectedTicket.id });
      setSnapshot((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) =>
          ticket.id === selectedTicket.id
            ? { ...ticket, unread_for_agent_count: 0 }
            : ticket
        ),
      }));
    });
  }, [locale, selectedTicket, startTransition]);

  const sendReply = () => {
    if (!selectedTicket) return;

    startTransition(async () => {
      setErrorMessage('');
      setStatusMessage('');
      const result = await sendHelpdeskAgentReply({
        locale,
        ticketId: selectedTicket.id,
        comment: replyText,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setReplyText('');
      setStatusMessage(isEs ? 'Respuesta enviada.' : 'Reply sent.');
      await refreshSnapshot();
    });
  };

  const enableDesktopAlerts = async () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      setErrorMessage(isEs ? 'Este navegador no soporta notificaciones.' : 'This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission as 'default' | 'granted' | 'denied');

    if (permission === 'granted') {
      setDesktopAlertsEnabled(true);
      setStatusMessage(isEs ? 'Notificaciones de escritorio activadas.' : 'Desktop notifications enabled.');
      return;
    }

    setDesktopAlertsEnabled(false);
    setErrorMessage(isEs ? 'Permiso de notificaciones denegado.' : 'Notification permission denied.');
  };

  const updateStatus = (status: 'open' | 'in_progress' | 'closed') => {
    if (!selectedTicket) return;

    startTransition(async () => {
      setErrorMessage('');
      setStatusMessage('');
      const result = await updateHelpdeskTicketStatusQuick({ locale, ticketId: selectedTicket.id, status });

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setStatusMessage(isEs ? 'Estado actualizado.' : 'Status updated.');
      await refreshSnapshot();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {isEs ? 'Activos' : 'Active'} ({activeTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === 'closed' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {isEs ? 'Archivados' : 'Archived'} ({closedTickets.length})
          </button>

          {activeTab === 'active' ? (
            <>
              <button
                type="button"
                onClick={() => setWaitingFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${waitingFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {isEs ? 'Todos' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setWaitingFilter('waiting_agent')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${waitingFilter === 'waiting_agent' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {isEs ? 'Esperando agente' : 'Waiting on agent'}
              </button>
              <button
                type="button"
                onClick={() => setWaitingFilter('waiting_user')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${waitingFilter === 'waiting_user' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {isEs ? 'Esperando usuario' : 'Waiting on user'}
              </button>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSoundAlertsEnabled((current) => !current);
              setStatusMessage('');
              setErrorMessage('');
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${soundAlertsEnabled ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            {soundAlertsEnabled ? (isEs ? 'Sonido: ON' : 'Sound: ON') : (isEs ? 'Sonido: OFF' : 'Sound: OFF')}
          </button>

          {notificationPermission !== 'unsupported' ? (
            <button
              type="button"
              onClick={enableDesktopAlerts}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${desktopAlertsEnabled ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              {desktopAlertsEnabled
                ? (isEs ? 'Desktop alerts: ON' : 'Desktop alerts: ON')
                : (notificationPermission === 'denied' ? (isEs ? 'Desktop alerts: bloqueado' : 'Desktop alerts: blocked') : (isEs ? 'Activar desktop alerts' : 'Enable desktop alerts'))}
            </button>
          ) : null}

          {isRefreshing ? <span className="text-xs text-slate-500">{isEs ? 'Actualizando...' : 'Refreshing...'}</span> : null}
          <button
            type="button"
            onClick={() => void refreshSnapshot()}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isEs ? 'Refrescar' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid h-[68vh] grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-h-0 border-r border-slate-200 bg-slate-50">
          <div className="h-full overflow-y-auto">
            {visibleTickets.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {activeTab === 'active'
                  ? (isEs ? 'No hay conversaciones activas.' : 'No active conversations.')
                  : (isEs ? 'No hay conversaciones archivadas.' : 'No archived conversations.')}
              </p>
            ) : (
              visibleTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const orgName = ticket.organization_id ? (orgNameById.get(ticket.organization_id) || ticket.organization_id) : 'Internal / Platform';

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full border-b border-slate-200 px-4 py-3 text-left transition ${isSelected ? 'bg-emerald-50' : 'hover:bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">{orgName}</p>
                      {ticket.unreadForAgent > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          {isEs ? 'Nuevo' : 'New'} {ticket.unreadForAgent}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-1">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ticket.preview}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${waitingTone(ticket.waitingOn)}`}>
                        {ticket.waitingOn === 'agent' ? (isEs ? 'espera agente' : 'waiting agent') : ticket.waitingOn === 'user' ? (isEs ? 'espera usuario' : 'waiting user') : (isEs ? 'neutral' : 'neutral')}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(ticket.latestActivityAt).toLocaleString(isEs ? 'es-ES' : 'en-US')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden">
          {!selectedTicket ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              {isEs ? 'Selecciona una conversación para responder.' : 'Select a conversation to reply.'}
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedTicket.subject}</p>
                    <p className="text-xs text-slate-500">
                      {selectedTicket.organization_id ? (orgNameById.get(selectedTicket.organization_id) || selectedTicket.organization_id) : 'Internal / Platform'}
                      {' · '}
                      {selectedTicket.requested_by_email || 'Unknown requester'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${waitingTone(selectedTicket.waitingOn)}`}>
                      {selectedTicket.waitingOn === 'agent' ? (isEs ? 'espera agente' : 'waiting agent') : selectedTicket.waitingOn === 'user' ? (isEs ? 'espera usuario' : 'waiting user') : (isEs ? 'neutral' : 'neutral')}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStatus('in_progress')}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isEs ? 'En progreso' : 'In progress'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus('closed')}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isEs ? 'Cerrar' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus('open')}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isEs ? 'Reabrir' : 'Reopen'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-2">
                {selectedTicketMessages.length === 0 ? (
                  <p className="text-sm text-slate-500">{isEs ? 'Sin mensajes todavía.' : 'No messages yet.'}</p>
                ) : (
                  selectedTicketMessages.map((comment) => {
                    const requesterEmail = (selectedTicket.requested_by_email || '').toLowerCase();
                    const authorEmail = (comment.author_email || '').toLowerCase();
                    const fromRequester = requesterEmail.length > 0 && authorEmail === requesterEmail;
                    const fromAgent = !fromRequester && isAgentEmail(comment.author_email);
                    return (
                      <div
                        key={comment.id}
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${fromAgent ? 'ml-auto bg-emerald-200 border border-emerald-300 text-emerald-900' : 'bg-sky-50 border border-sky-200 text-sky-900'}`}
                      >
                        <p className="whitespace-pre-wrap">{comment.comment}</p>
                        <p className={`mt-1 text-[10px] ${fromAgent ? 'text-emerald-700' : 'text-sky-500'}`}>
                          {(comment.author_email || 'Unknown')} • {new Date(comment.created_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 px-4 py-3 space-y-2">
                {statusMessage ? <p className="text-xs text-emerald-600">{statusMessage}</p> : null}
                {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={replyComposerRef}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (!isPending && replyText.trim().length > 0) {
                          sendReply();
                        }
                      }
                    }}
                    rows={1}
                    placeholder={isEs ? 'Escribe una respuesta...' : 'Write a reply...'}
                    className="min-h-[40px] max-h-[140px] flex-1 resize-none overflow-y-auto rounded-full border border-slate-300 px-4 py-2.5 text-sm leading-5"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={isPending || replyText.trim().length === 0}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-60"
                    aria-label={isEs ? 'Enviar respuesta' : 'Send reply'}
                  >
                    {isPending ? (
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

              <div className="border-t border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{isEs ? 'Historial de escalación' : 'Escalation history'}</p>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {(eventsByTicketId.get(selectedTicket.id) || []).slice(0, 8).map((event) => (
                    <div key={event.id} className="rounded-md bg-slate-50 border border-slate-200 p-2">
                      <p className="text-[11px] text-slate-500">{event.event_type} • {event.actor_email || 'Unknown'} • {new Date(event.created_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}</p>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{event.event_note || 'No event note'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
