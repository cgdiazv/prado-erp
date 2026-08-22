'use client';

import React, { useState, FormEvent } from 'react';
import { signup } from '@/app/[lng]/auth/actions';
import { useRouter } from 'next/navigation';
import { 
  Trees, 
  Wind, 
  Wrench, 
  Sparkles, 
  Hammer, 
  Settings, 
  User, 
  Truck, 
  Users, 
  Building2,
  Zap,
  Navigation,
  DollarSign,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Mail,
  Loader2
} from 'lucide-react';

import BlurredDashboardPreview from '@/components/BlurredDashboardPreview';

interface WorkspaceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
  initialStep?: number;
}

export default function WorkspaceSetupModal({
  isOpen,
  onClose,
  initialStep = 1,
}: WorkspaceSetupModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(initialStep);

  // Form selections state
  const [tradeVertical, setTradeVertical] = useState<string>('');
  const [teamSize, setTeamSize] = useState<string>('');
  const [painPoint, setPainPoint] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & Error state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-advance handlers
  const handleSelectTrade = (trade: string) => {
    setTradeVertical(trade);
    setTimeout(() => {
      setStep(2);
    }, 180);
  };

  const handleSelectTeamSize = (size: string) => {
    setTeamSize(size);
    setTimeout(() => {
      setStep(3);
    }, 180);
  };

  const handleSelectPainPoint = (point: string) => {
    setPainPoint(point);
    setTimeout(() => {
      setStep(4);
    }, 180);
  };

  const handleBack = () => {
    if (step > 1) {
      setErrorMessage(null);
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('tradeVertical', tradeVertical);
    formData.set('teamSize', teamSize);
    formData.set('painPoint', painPoint);
    formData.set('intendedPlan', 'trial');

    try {
      const result = await signup(formData);

      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
        return;
      }

      if (result?.stripeUrl) {
        window.open(result.stripeUrl, '_blank', 'noopener,noreferrer');
        router.push('/login?registered=true');
        return;
      }

      if (result?.redirectTo) {
        router.push(result.redirectTo);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Signup modal error:', err);
      setErrorMessage('A connection error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Progress Bar configuration
  const getProgressDetails = () => {
    switch (step) {
      case 1:
        return { label: 'Step 1 of 3', width: '33%' };
      case 2:
        return { label: 'Step 2 of 3', width: '66%' };
      case 3:
        return { label: 'Step 3 of 3', width: '90%' };
      case 4:
        return { label: 'Almost Done', width: '100%' };
      default:
        return { label: 'Step 1 of 3', width: '33%' };
    }
  };

  const progress = getProgressDetails();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Blurred Dashboard Preview in the Background */}
      <BlurredDashboardPreview tradeVertical={tradeVertical} />

      {/* Foreground White Modal Card Container */}
      <div 
        className="relative z-10 w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Top Header & Progress Indicator */}
        <div className="w-full bg-slate-50/90 border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition flex items-center gap-1 text-xs font-medium cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Customizing Workspace
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">{progress.label}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Emerald Progress Fill Line */}
        <div className="w-full h-1 bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-emerald-600 transition-all duration-500 ease-out" 
            style={{ width: progress.width }}
          />
        </div>

        {/* Modal Body Container (White Theme) */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between bg-white text-slate-900">
          {/* STEP 1: Trade Vertical */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <header className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Let's set up your workspace
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  What is your primary trade or service?
                </p>
              </header>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  {
                    id: 'Lawn Care & Landscaping',
                    title: 'Lawn Care & Landscaping',
                    icon: Trees,
                    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  },
                  {
                    id: 'HVAC & Refrigeration',
                    title: 'HVAC & Refrigeration',
                    icon: Wind,
                    iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
                  },
                  {
                    id: 'Plumbing & Drain',
                    title: 'Plumbing & Drain',
                    icon: Wrench,
                    iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
                  },
                  {
                    id: 'Cleaning & Janitorial',
                    title: 'Cleaning & Janitorial',
                    icon: Sparkles,
                    iconBg: 'bg-teal-50 text-teal-700 border-teal-200',
                  },
                  {
                    id: 'Roofing & Construction',
                    title: 'Roofing & Construction',
                    icon: Hammer,
                    iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
                  },
                  {
                    id: 'Other / General Maintenance',
                    title: 'Other / General Maintenance',
                    icon: Settings,
                    iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
                  },
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = tradeVertical === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTrade(item.id)}
                      className={`group p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-28 relative cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-lg border ${item.iconBg}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition leading-snug ${isSelected ? 'text-emerald-950' : 'text-slate-800 group-hover:text-slate-900'}`}>
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Team & Fleet Size */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <header className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  How many crews do you coordinate?
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  This helps us configure your dispatch map.
                </p>
              </header>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'Just me (Solo tech)',
                    title: 'Just me (Solo tech)',
                    desc: 'Independent technician handling dispatch & field work',
                    icon: User,
                  },
                  {
                    id: '2 – 5 Vehicles / Technicians',
                    title: '2 – 5 Vehicles / Technicians',
                    desc: 'Small growing team managing daily routes',
                    icon: Truck,
                  },
                  {
                    id: '6 – 10 Vehicles / Technicians',
                    title: '6 – 10 Vehicles / Technicians',
                    desc: 'Mid-size fleet requiring active route optimization',
                    icon: Users,
                  },
                  {
                    id: '11+ Vehicles (Enterprise)',
                    title: '11+ Vehicles (Enterprise)',
                    desc: 'Large fleet with multiple dispatch coordinators',
                    icon: Building2,
                  },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = teamSize === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTeamSize(item.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2.5 rounded-lg border ${isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 border-slate-200 text-emerald-700'} group-hover:scale-105 transition`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`text-sm font-bold transition ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 transition ${isSelected ? 'text-emerald-700 transform translate-x-1' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Primary Pain Point */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <header className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  What is your biggest challenge right now?
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  We’ll highlight the best tools for you.
                </p>
              </header>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'Quoting & estimating faster on-site',
                    title: 'Quoting & estimating faster on-site',
                    desc: 'Win jobs on the spot with quick digital estimates',
                    icon: Zap,
                    color: 'bg-amber-50 text-amber-700 border-amber-200',
                  },
                  {
                    id: 'Route planning & reducing drive time',
                    title: 'Route planning & reducing drive time',
                    desc: 'Save fuel and fit more jobs into every day',
                    icon: Navigation,
                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  },
                  {
                    id: 'Chasing unpaid invoices & slow billing',
                    title: 'Chasing unpaid invoices & slow billing',
                    desc: 'Automate payment collection & sync with QBO/Xero',
                    icon: DollarSign,
                    color: 'bg-teal-50 text-teal-700 border-teal-200',
                  },
                  {
                    id: 'Replacing spreadsheets with one clean system',
                    title: 'Replacing spreadsheets with one clean system',
                    desc: 'Centralize jobs, scheduling, and customer history',
                    icon: FileSpreadsheet,
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = painPoint === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPainPoint(item.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2.5 rounded-lg border ${item.color} group-hover:scale-105 transition`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`text-sm font-bold transition ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 transition ${isSelected ? 'text-emerald-700 transform translate-x-1' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Account Creation & Final Capture */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <header className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Workspace Ready for {tradeVertical || 'Your Trade'}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Your Prado workspace is ready!
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Enter your email to unlock your 30-day free trial.
                </p>
              </header>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <input type="hidden" name="tradeVertical" value={tradeVertical} />
                <input type="hidden" name="teamSize" value={teamSize} />
                <input type="hidden" name="painPoint" value={painPoint} />

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Work Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="work@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition placeholder:text-slate-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-xs text-slate-500 hover:text-slate-700 transition font-medium cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Configuring Your Dashboard...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch My Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Trust Badge below button */}
              <div className="pt-2 text-center flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>No credit card required • Instant access in 30 seconds</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
