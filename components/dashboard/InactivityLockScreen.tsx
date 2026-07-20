'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyWorkspacePassword } from '@/app/[lng]/auth/actions';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

type InactivityLockScreenProps = {
  children: React.ReactNode;
  locale: string;
  userEmail: string;
};

export default function InactivityLockScreen({
  children,
  locale,
  userEmail,
}: InactivityLockScreenProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const lockSession = useCallback(() => {
    setIsLocked(true);
    setIsExpanded(false);
    setPassword('');
    setErrorMessage(null);
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

  const expandUnlockForm = useCallback(() => {
    setIsExpanded(true);
    setErrorMessage(null);
    window.setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  }, []);

  const unlockSession = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!userEmail) {
        setErrorMessage('Unable to verify this account. Please sign in again.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.set('email', userEmail);
      formData.set('password', password);

      const result = await verifyWorkspacePassword(formData);

      if (result?.error) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsLocked(false);
      setIsExpanded(false);
      setPassword('');
      setIsSubmitting(false);
      startLockTimer();
      router.refresh();
    },
    [password, router, startLockTimer, userEmail]
  );

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

  const unlockWithPasswordLabel = locale.toLowerCase().startsWith('es')
    ? 'Desbloquear con contraseña'
    : 'Unlock with password';

  const passwordLabel = locale.toLowerCase().startsWith('es')
    ? 'Contraseña'
    : 'Password';

  const passwordPlaceholder = locale.toLowerCase().startsWith('es')
    ? 'Ingresa tu contraseña'
    : 'Enter your password';

  const unlockHelper = locale.toLowerCase().startsWith('es')
    ? 'Ingresa la contraseña de tu cuenta para continuar.'
    : 'Enter your account password to continue.';

  return (
    <div className="relative flex flex-1 min-w-0">
      <div className={isLocked ? 'pointer-events-none blur-sm select-none flex flex-1 min-w-0' : 'flex flex-1 min-w-0'}>
        {children}
      </div>

      {isLocked ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className={isExpanded ? 'w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200' : 'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200'}>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>

            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={expandUnlockForm}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {unlockWithPasswordLabel}
              </button>

              <div className={isExpanded ? 'grid grid-rows-[1fr] opacity-100 transition-all duration-200' : 'grid grid-rows-[0fr] opacity-0 transition-all duration-200'}>
                <form onSubmit={unlockSession} className="overflow-hidden space-y-4">
                  <p className="text-sm text-slate-600">{unlockHelper}</p>

                  {errorMessage ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {passwordLabel}
                    </label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={passwordPlaceholder}
                      autoComplete="current-password"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSubmitting ? (locale.toLowerCase().startsWith('es') ? 'Verificando...' : 'Verifying...') : unlockLabel}
                    </button>
                    <button
                      type="button"
                      onClick={sendToLogin}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {reauthLabel}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
