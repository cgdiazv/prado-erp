'use client';

import { useState, useEffect } from 'react';
import { getOrganizationReferralData } from './actions';
import { Gift, Copy, Check, Share2, Mail, Users, Award, ExternalLink, Sparkles } from 'lucide-react';

interface ReferralProgramCardProps {
  referralCode?: string | null;
  referralDiscountActive?: boolean;
  referralDiscountEndsAt?: string | null;
  locale?: string;
}

interface ReferralItem {
  id: string;
  createdAt: string;
  status: 'pending' | 'rewarded' | 'expired';
  rewardedAt: string | null;
  discountApplied: boolean;
  discountMonths: number;
  referredOrgName: string;
}

export default function ReferralProgramCard({
  referralCode: initialCode,
  referralDiscountActive: initialDiscountActive = false,
  referralDiscountEndsAt: initialDiscountEndsAt = null,
  locale = 'en',
}: ReferralProgramCardProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState(initialCode || '');
  const [discountActive, setDiscountActive] = useState(initialDiscountActive);
  const [discountEndsAt, setDiscountEndsAt] = useState<string | null>(initialDiscountEndsAt);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [totalInvited, setTotalInvited] = useState(0);
  const [totalRewarded, setTotalRewarded] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getOrganizationReferralData();
        if (res.success && res.data) {
          if (res.data.referralCode) setReferralCode(res.data.referralCode);
          setDiscountActive(res.data.referralDiscountActive);
          setDiscountEndsAt(res.data.referralDiscountEndsAt);
          setReferrals(res.data.referrals || []);
          setTotalInvited(res.data.totalInvited);
          setTotalRewarded(res.data.totalRewarded);
        }
      } catch (err) {
        console.error('Error fetching referral details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pradojob.com';
  const referralLink = referralCode ? `${appBaseUrl}/signup?ref=${encodeURIComponent(referralCode)}` : '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  const shareText = isEs
    ? `¡Hola! Uso Prado para gestionar mis trabajos, presupuestos y facturación. Regístrate aquí:`
    : `Hey! I use Prado to manage my jobs, estimates, and invoices. Check it out here:`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    isEs ? 'Te invito a probar Prado' : 'Check out Prado - Contractor Management Software'
  )}&body=${encodeURIComponent(
    isEs
      ? `¡Hola!\n\nTe recomiendo que pruebes Prado para organizar tu negocio de contratista. Échale un vistazo:\n${referralLink}`
      : `Hey!\n\nI recommend trying Prado to streamline your contracting operations. Check it out here:\n${referralLink}`
  )}`;

  const formattedDiscountEndsAt = discountEndsAt
    ? new Date(discountEndsAt).toLocaleDateString(isEs ? 'es-US' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Top Banner / Discount Active Badge */}
      {discountActive && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 p-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white uppercase tracking-wider">
                  {isEs ? '50% de Descuento Activo' : '50% Discount Active'}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {isEs
                  ? '¡Estás ahorrando 50% en tu suscripción!'
                  : 'You are currently saving 50% on your subscription!'}
              </h4>
              <p className="text-sm text-slate-600">
                {isEs
                  ? `Tu recompensa de referido está activa. Tus renovaciones mensuales tienen 50% de descuento${
                      formattedDiscountEndsAt ? ` hasta el ${formattedDiscountEndsAt}` : ' durante 1 año'
                    }.`
                  : `Your referral reward is active. Your monthly renewals are discounted by 50%${
                      formattedDiscountEndsAt ? ` until ${formattedDiscountEndsAt}` : ' for 1 year'
                    }.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Value Proposition */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Gift className="w-3.5 h-3.5 text-emerald-600" />
              {isEs ? 'Programa de Referidos' : 'Contractor Referral Program'}
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {isEs ? 'Invita a un colega y obtén 50% de descuento por 1 año' : 'Give an invite, get 50% off for 1 full year'}
          </h3>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            {isEs
              ? 'Comparte tu enlace con otros contratistas o profesionales. Cuando tu referido se suscriba a cualquier plan de Prado, recibirás automáticamente un 50% de descuento en tu suscripción durante 12 meses.'
              : 'Share your personal referral link with contractor friends. When they subscribe to any paid Prado plan, you automatically receive 50% off your subscription for 12 months.'}
          </p>
        </div>
      </div>

      {/* Share Box */}
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {isEs ? 'Tu Enlace Único de Referido' : 'Your Unique Referral Link'}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={referralLink || (loading ? 'Loading...' : '')}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 select-all"
            />
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!referralLink}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                {isEs ? '¡Copiado!' : 'Copied!'}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {isEs ? 'Copiar Enlace' : 'Copy Link'}
              </>
            )}
          </button>
        </div>

        {/* Quick Share Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">
            {isEs ? 'Compartir directo:' : 'Quick share:'}
          </span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 transition border border-emerald-500/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <a
            href={mailtoUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/70 text-slate-700 hover:bg-slate-300 transition border border-slate-300/50"
          >
            <Mail className="w-3.5 h-3.5" />
            {isEs ? 'Correo electrónico' : 'Email'}
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isEs ? 'Invitados' : 'Friends Invited'}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : totalInvited}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEs ? 'Contratistas registrados' : 'Signed up contractors'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isEs ? 'Recompensas Activas' : 'Subscribed & Rewarded'}
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{loading ? '...' : totalRewarded}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEs ? 'Suscripciones confirmadas' : 'Active paid subscriptions'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isEs ? 'Tu Recompensa' : 'Your Reward'}
            </span>
            <Gift className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 mt-2">
            {discountActive ? '50% OFF' : '50% OFF'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {discountActive
              ? isEs
                ? 'Activo por 1 año'
                : 'Active for 1 year'
              : isEs
                ? 'Disponible con 1 referido'
                : 'Unlocked with 1 subscriber'}
          </p>
        </div>
      </div>

      {/* Referrals Activity List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          {isEs ? 'Historial de Referidos' : 'Referral History'}
        </h4>

        {referrals.length === 0 && !loading && (
          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
            <Gift className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'Aún no tienes referidos registrados' : 'No contractor referrals yet'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Envía tu enlace a amigos contratistas. En cuanto activen su suscripción, se activará tu 50% de descuento.'
                : 'Send your referral link to friends. As soon as they activate any subscription, your 50% discount triggers automatically.'}
            </p>
          </div>
        )}

        {referrals.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{isEs ? 'Espacio / Contratista' : 'Workspace'}</th>
                    <th className="py-3 px-4">{isEs ? 'Fecha de Registro' : 'Signup Date'}</th>
                    <th className="py-3 px-4">{isEs ? 'Estado' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isEs ? 'Descuento' : 'Discount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {ref.referredOrgName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(ref.createdAt).toLocaleDateString(isEs ? 'es-US' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        {ref.status === 'rewarded' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            {isEs ? 'Suscrito · 50% Activo' : 'Subscribed · 50% Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            {isEs ? 'Registrado · Pendiente Suscripción' : 'Signed up · Pending Subscription'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {ref.status === 'rewarded' ? (
                          <span className="text-xs font-bold text-emerald-700">
                            {isEs ? '50% por 1 año' : '50% off for 1 yr'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {isEs ? 'Pendiente' : 'Pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
