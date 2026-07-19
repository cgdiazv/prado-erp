'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

type InactivityLockScreenProps = {
  children: React.ReactNode;
  locale: string;
  isRemembered: boolean;
};

export default function InactivityLockScreen({
  children,
  locale,
  isRemembered,
}: InactivityLockScreenProps) {
  const [isLocked, setIsLocked] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const lockSession = useCallback(() => {
    setIsLocked(true);
  }, []);

  const clearLockTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLockTimer = useCallback(() => {
    clearLockTimer();
    timeoutRef.current = window.setTimeout(lockSession, IDLE_TIMEOUT_MS);
  }, [clearLockTimer, lockSession]);

  const handleActivity = useCallback(() => {
    if (isLocked) {
      return;
    }

    startLockTimer();
  }, [isLocked, startLockTimer]);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
    startLockTimer();
  }, [startLockTimer]);

  const sendToLogin = useCallback(() => {
    window.location.href = `/${locale}/login?locked=true`;
  }, [locale]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'mousedown',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    startLockTimer();

    return () => {
      clearLockTimer();
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [clearLockTimer, handleActivity, startLockTimer]);

  const title = locale.toLowerCase().startsWith('es')
    ? 'Sesion bloqueada por inactividad'
    : 'Session locked due to inactivity';

  const description = locale.toLowerCase().startsWith('es')
    ? 'Tu espacio esta protegido. Desbloquea para continuar.'
    : 'Your workspace is protected. Unlock to continue.';

  const unlockLabel = locale.toLowerCase().startsWith('es')
    ? 'Desbloquear espacio de trabajo'
    : 'Unlock Workspace';

  const reauthLabel = locale.toLowerCase().startsWith('es')
    ? 'Volver a iniciar sesion'
    : 'Re-authenticate';

  return (
    <div className="relative flex flex-1">
      <div className={isLocked ? 'pointer-events-none blur-sm select-none flex flex-1' : 'flex flex-1'}>
        {children}
      </div>

      {isLocked ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>

            <div className="mt-6">
              {isRemembered ? (
                <button
                  type="button"
                  onClick={unlockSession}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {unlockLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sendToLogin}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {reauthLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
