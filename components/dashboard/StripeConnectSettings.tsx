'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createStripeConnectAccountLink,
  disconnectStripeAccount,
  getStripeAccountStatus,
} from '@/app/[lng]/dashboard/settings/actions/stripeConnectActions';

interface StripeConnectSettingsProps {
  locale: string;
  initialStripeAccountId: string | null;
  initialChargesEnabled: boolean;
  initialPayoutsEnabled: boolean;
}

export default function StripeConnectSettings({
  locale,
  initialStripeAccountId,
  initialChargesEnabled,
  initialPayoutsEnabled,
}: StripeConnectSettingsProps) {
  const searchParams = useSearchParams();
  const isEs = useMemo(() => locale.toLowerCase().startsWith('es'), [locale]);

  const [accountId, setAccountId] = useState<string | null>(initialStripeAccountId);
  const [chargesEnabled, setChargesEnabled] = useState(initialChargesEnabled);
  const [payoutsEnabled, setPayoutsEnabled] = useState(initialPayoutsEnabled);
  const [requirementsDue, setRequirementsDue] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toFriendlyRequirement = (requirementKey: string) => {
    const map: Record<string, { en: string; es: string }> = {
      external_account: {
        en: 'Add a payout bank account',
        es: 'Agrega una cuenta bancaria para depositos',
      },
      'tos_acceptance.date': {
        en: 'Accept Stripe Terms of Service',
        es: 'Acepta los terminos de servicio de Stripe',
      },
      'tos_acceptance.ip': {
        en: 'Complete terms acceptance in Stripe onboarding',
        es: 'Completa la aceptacion de terminos en el onboarding de Stripe',
      },
      business_profile: {
        en: 'Complete business profile details',
        es: 'Completa los datos del perfil de negocio',
      },
      individual: {
        en: 'Complete personal identity details',
        es: 'Completa los datos de identidad personal',
      },
      company: {
        en: 'Complete company details',
        es: 'Completa los datos de la empresa',
      },
      verification: {
        en: 'Complete identity verification',
        es: 'Completa la verificacion de identidad',
      },
    };

    const directMatch = map[requirementKey];
    if (directMatch) {
      return isEs ? directMatch.es : directMatch.en;
    }

    if (requirementKey.startsWith('external_account')) {
      return isEs ? 'Agrega una cuenta bancaria para depositos' : 'Add a payout bank account';
    }

    if (requirementKey.startsWith('tos_acceptance')) {
      return isEs
        ? 'Acepta los terminos de Stripe durante el onboarding'
        : 'Accept Stripe terms during onboarding';
    }

    if (requirementKey.startsWith('business_profile')) {
      return isEs ? 'Completa el perfil del negocio' : 'Complete business profile details';
    }

    if (requirementKey.startsWith('individual.')) {
      return isEs ? 'Completa datos personales del titular' : 'Complete account holder personal details';
    }

    if (requirementKey.startsWith('company.')) {
      return isEs ? 'Completa datos de la empresa' : 'Complete company details';
    }

    if (requirementKey.startsWith('person_')) {
      return isEs ? 'Completa la verificacion de una persona requerida' : 'Complete required person verification';
    }

    return requirementKey.replaceAll('_', ' ');
  };

  const stripeState = searchParams.get('stripe');

  useEffect(() => {
    if (!stripeState) {
      return;
    }

    if (stripeState === 'return') {
      setNotice(isEs ? 'Stripe conectado. Validando estado de cuenta...' : 'Stripe connected. Validating account status...');
      refreshStatus();
      return;
    }

    if (stripeState === 'refresh') {
      setNotice(isEs ? 'Stripe solicito informacion adicional. Continua el onboarding.' : 'Stripe requested more details. Continue onboarding.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeState]);

  const refreshStatus = () => {
    startTransition(async () => {
      setError(null);

      const result = await getStripeAccountStatus(locale);

      if (result.error) {
        setError(result.error);
      }

      setAccountId(result.accountId);
      setChargesEnabled(Boolean(result.chargesEnabled));
      setPayoutsEnabled(Boolean(result.payoutsEnabled));
      setRequirementsDue(result.requirementsDue || []);
    });
  };

  const startOnboarding = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      const result = await createStripeConnectAccountLink(locale);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  const disconnect = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      const result = await disconnectStripeAccount(locale);

      if (result.error) {
        setError(result.error);
        return;
      }

      setChargesEnabled(false);
      setPayoutsEnabled(false);
      setRequirementsDue([]);
      setNotice(
        isEs
          ? 'Pagos con Stripe desactivados. Puedes reconectar la misma cuenta cuando quieras.'
          : 'Stripe payments disabled. You can reconnect the same account anytime.'
      );
    });
  };

  const isFullyEnabled = accountId && chargesEnabled && payoutsEnabled;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
          {isEs ? 'Pagos en linea (Stripe Connect)' : 'Online Payments (Stripe Connect)'}
        </h3>
        <p className="text-xs text-slate-500 max-w-2xl">
          {isEs
            ? 'Conecta tu cuenta Stripe Express para habilitar pagos de facturas en fases siguientes.'
            : 'Connect your Stripe Express account to enable invoice payments in upcoming phases.'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-3 text-sm">
        <p className="text-slate-700">
          <span className="font-semibold">{isEs ? 'Cuenta conectada:' : 'Connected account:'}</span>{' '}
          {accountId || (isEs ? 'No conectada' : 'Not connected')}
        </p>
        <p className="text-slate-700">
          <span className="font-semibold">{isEs ? 'Cobros habilitados:' : 'Charges enabled:'}</span>{' '}
          {chargesEnabled ? (isEs ? 'Si' : 'Yes') : (isEs ? 'No' : 'No')}
        </p>
        <p className="text-slate-700">
          <span className="font-semibold">{isEs ? 'Pagos a banco habilitados:' : 'Payouts enabled:'}</span>{' '}
          {payoutsEnabled ? (isEs ? 'Si' : 'Yes') : (isEs ? 'No' : 'No')}
        </p>

        {requirementsDue.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold mb-2">
              {isEs ? 'Pendiente en Stripe:' : 'Pending in Stripe:'}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {requirementsDue.map((requirement) => (
                <li key={requirement}>{toFriendlyRequirement(requirement)}</li>
              ))}
            </ul>
          </div>
        )}

        {isFullyEnabled ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800">
            {isEs
              ? 'Tu cuenta Stripe esta lista para recibir pagos.'
              : 'Your Stripe account is ready to accept payments.'}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">{error}</div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-xs text-sky-800">{notice}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startOnboarding}
          disabled={pending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending
            ? isEs
              ? 'Procesando...'
              : 'Processing...'
            : accountId
              ? isEs
                ? 'Continuar onboarding'
                : 'Continue onboarding'
              : isEs
                ? 'Conectar Stripe'
                : 'Connect Stripe'}
        </button>

        <button
          type="button"
          onClick={refreshStatus}
          disabled={pending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isEs ? 'Actualizar estado' : 'Refresh status'}
        </button>

        {accountId ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isEs ? 'Desconectar' : 'Disconnect'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
