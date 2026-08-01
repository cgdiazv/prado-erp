'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  User,
  MapPin,
  Truck,
  Wrench,
  FileText,
  Sparkles,
  Send,
  X,
  Check,
  Loader2,
} from 'lucide-react';

import {
  parseTaskPrompt,
  ParseTaskPromptResult,
  executeAICreateEntity,
  AIIntent,
} from '@/app/actions/aiTaskAssistantActions';
import { createJob } from '@/app/actions';

interface AITaskAssistantModalProps {
  locale?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AITaskAssistantModal({
  locale = 'en',
  isOpen,
  onClose,
}: AITaskAssistantModalProps) {
  const router = useRouter();
  const isEs = locale.toLowerCase().startsWith('es');
  const [isPending, startTransition] = useTransition();

  const [activeIntent, setActiveIntent] = useState<AIIntent>('estimate');
  const [promptText, setPromptText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseTaskPromptResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state for Job
  const [jobCustomerId, setJobCustomerId] = useState<string>('');
  const [jobPropertyId, setJobPropertyId] = useState<string>('');
  const [jobServiceId, setJobServiceId] = useState<string>('');
  const [jobTruckId, setJobTruckId] = useState<string>('');
  const [jobScheduledDate, setJobScheduledDate] = useState<string>('');
  const [jobCostAmount, setJobCostAmount] = useState<string>('0');
  const [jobNotes, setJobNotes] = useState<string>('');

  // Form state for Customer
  const [custFirstName, setCustFirstName] = useState<string>('');
  const [custLastName, setCustLastName] = useState<string>('');
  const [custCompanyName, setCustCompanyName] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');

  // Form state for Property
  const [propCustomerId, setPropCustomerId] = useState<string>('');
  const [propStreetAddress, setPropStreetAddress] = useState<string>('');
  const [propGateCodes, setPropGateCodes] = useState<string>('');

  // Form state for Truck
  const [truckName, setTruckName] = useState<string>('');
  const [truckPlateNumber, setTruckPlateNumber] = useState<string>('');

  // Form state for Service
  const [serviceName, setServiceName] = useState<string>('');
  const [serviceBasePrice, setServiceBasePrice] = useState<string>('150');

  // Form state for Estimate
  const [estCustomerId, setEstCustomerId] = useState<string>('');
  const [estPropertyId, setEstPropertyId] = useState<string>('');
  const [estServiceId, setEstServiceId] = useState<string>('');
  const [estTotalAmount, setEstTotalAmount] = useState<string>('250');
  const [estNotes, setEstNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleParsePrompt = async (textToParse?: string) => {
    const text = textToParse || promptText;
    if (!text || !text.trim()) return;

    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await parseTaskPrompt(text, locale);
    setIsParsing(false);

    if (!res.success) {
      setErrorMsg(res.error || (isEs ? 'No se pudo interpretar el comando.' : 'Could not interpret prompt.'));
      return;
    }

    setParseResult(res);
    setActiveIntent(res.intent);

    // Seed state depending on intent
    if (res.intent === 'customer' && res.parsedCustomer) {
      setCustFirstName(res.parsedCustomer.firstName);
      setCustLastName(res.parsedCustomer.lastName);
      setCustCompanyName(res.parsedCustomer.companyName || '');
      setCustEmail(res.parsedCustomer.email || '');
      setCustPhone(res.parsedCustomer.phone || '');
    } else if (res.intent === 'property' && res.parsedProperty) {
      setPropCustomerId(res.parsedProperty.customerId || (res.availableCustomers[0]?.id || ''));
      setPropStreetAddress(res.parsedProperty.streetAddress);
      setPropGateCodes(res.parsedProperty.gateCodes || '');
    } else if (res.intent === 'truck' && res.parsedTruck) {
      setTruckName(res.parsedTruck.name);
      setTruckPlateNumber(res.parsedTruck.plateNumber || '');
    } else if (res.intent === 'service' && res.parsedService) {
      setServiceName(res.parsedService.name);
      setServiceBasePrice(res.parsedService.basePrice ? String(res.parsedService.basePrice) : '150');
    } else if (res.intent === 'estimate' && res.parsedEstimate) {
      const e = res.parsedEstimate;
      setEstCustomerId(e.customerId || (res.availableCustomers[0]?.id || ''));
      setEstPropertyId(e.propertyId || res.availableProperties[0]?.id || '');
      setEstServiceId(e.serviceId || res.availableServices[0]?.id || '');
      setEstTotalAmount(e.totalAmount ? String(e.totalAmount) : '250');
      setEstNotes(e.notes || '');
    } else if (res.parsedJob) {
      const j = res.parsedJob;
      setJobCustomerId(j.customerId || (res.availableCustomers[0]?.id || ''));
      const matchingProps = res.availableProperties.filter(
        (p) => p.customerId === (j.customerId || res.availableCustomers[0]?.id)
      );
      setJobPropertyId(j.propertyId || matchingProps[0]?.id || res.availableProperties[0]?.id || '');
      setJobServiceId(j.serviceId || res.availableServices[0]?.id || '');
      setJobTruckId(j.truckId || '');
      setJobScheduledDate(j.scheduledDate || new Date().toISOString().split('T')[0]);
      setJobCostAmount(j.costAmount ? String(j.costAmount) : '0');
      setJobNotes(j.notes || '');
    }
  };

  const handleCustomerSelectChange = (newCustId: string) => {
    setJobCustomerId(newCustId);
    if (parseResult) {
      const matchingProps = parseResult.availableProperties.filter((p) => p.customerId === newCustId);
      setJobPropertyId(matchingProps[0]?.id || '');
    }
  };

  const handleExecuteCreation = () => {
    setErrorMsg(null);

    startTransition(async () => {
      if (activeIntent === 'job') {
        if (!jobPropertyId || !jobScheduledDate) {
          setErrorMsg(isEs ? 'Selecciona una propiedad y fecha válida.' : 'Please select a valid property and date.');
          return;
        }

        const formData = new FormData();
        formData.append('propertyId', jobPropertyId);
        formData.append('scheduledDate', jobScheduledDate);
        formData.append('serviceId', jobServiceId);
        formData.append('costAmount', jobCostAmount);
        formData.append('truckId', jobTruckId);
        formData.append('notes', jobNotes);

        const selService = parseResult?.availableServices.find((s) => s.id === jobServiceId);
        formData.append('jobType', selService?.name || 'Custom Job');

        const res = await createJob(formData);
        if (res?.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(isEs ? '¡Trabajo creado exitosamente!' : 'Job successfully scheduled via AI Assistant!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      } else if (activeIntent === 'customer') {
        const res = await executeAICreateEntity('customer', {
          firstName: custFirstName,
          lastName: custLastName,
          companyName: custCompanyName,
          email: custEmail,
          phone: custPhone,
        });
        if (!res.success) setErrorMsg(res.error || 'Failed to create customer');
        else {
          setSuccessMsg(res.message || 'Customer created successfully!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      } else if (activeIntent === 'property') {
        const res = await executeAICreateEntity('property', {
          customerId: propCustomerId,
          streetAddress: propStreetAddress,
          gateCodes: propGateCodes,
        });
        if (!res.success) setErrorMsg(res.error || 'Failed to create property');
        else {
          setSuccessMsg(res.message || 'Property created successfully!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      } else if (activeIntent === 'truck') {
        const res = await executeAICreateEntity('truck', {
          name: truckName,
          plateNumber: truckPlateNumber,
        });
        if (!res.success) setErrorMsg(res.error || 'Failed to add truck');
        else {
          setSuccessMsg(res.message || 'Fleet vehicle created successfully!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      } else if (activeIntent === 'service') {
        const res = await executeAICreateEntity('service', {
          name: serviceName,
          basePrice: serviceBasePrice,
        });
        if (!res.success) setErrorMsg(res.error || 'Failed to add service catalog item');
        else {
          setSuccessMsg(res.message || 'Service catalog item added successfully!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      } else if (activeIntent === 'estimate') {
        const res = await executeAICreateEntity('estimate', {
          customerId: estCustomerId,
          propertyId: estPropertyId,
          serviceId: estServiceId,
          totalAmount: estTotalAmount,
          notes: estNotes,
        });
        if (!res.success) setErrorMsg(res.error || 'Failed to create estimate');
        else {
          setSuccessMsg(res.message || 'Estimate created successfully!');
          setTimeout(() => {
            onClose();
            router.refresh();
          }, 1200);
        }
      }
    });
  };

  const handleQuickChipClick = (chipText: string) => {
    setPromptText(chipText);
    void handleParsePrompt(chipText);
  };

  const candidateProperties = parseResult
    ? parseResult.availableProperties.filter((p) => p.customerId === jobCustomerId)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-0 md:p-4 backdrop-blur-xs select-none">
      <div className="relative h-dvh w-screen overflow-y-auto overflow-x-hidden rounded-none border-0 bg-white p-4 shadow-2xl transition-all md:h-auto md:w-full md:max-w-2xl md:overflow-hidden md:rounded-2xl md:border md:border-slate-200 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEs ? 'Asistente IA de Operaciones' : 'Multi-Entity AI Assistant'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEs
                  ? 'Crea trabajos, clientes, propiedades, vehiculos, servicios o presupuestos con IA.'
                  : 'Create Jobs, Customers, Properties, Fleet Vehicles, Services, or Estimates via natural language.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lucide Icon Tab Header */}
        <div className="mt-3 flex overflow-x-auto border-b border-slate-200 text-xs font-semibold text-slate-600 gap-1">
          <button
            type="button"
            onClick={() => setActiveIntent('estimate')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'estimate' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{isEs ? 'Presupuesto' : 'Estimate'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveIntent('job')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'job' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{isEs ? 'Trabajo' : 'Job'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveIntent('customer')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'customer' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{isEs ? 'Cliente' : 'Customer'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveIntent('property')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'property' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{isEs ? 'Propiedad' : 'Property'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveIntent('service')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'service' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>{isEs ? 'Servicio' : 'Service'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveIntent('truck')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeIntent === 'truck' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-slate-900'}`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>{isEs ? 'Camión' : 'Truck'}</span>
          </button>
        </div>

        {/* Banners */}
        {errorMsg ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        {successMsg ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-600" />
            {successMsg}
          </div>
        ) : null}

        {/* Single-line Expandable Prompt Input Container */}
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
            <textarea
              rows={1}
              value={promptText}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (promptText.trim() && !isParsing) {
                    void handleParsePrompt();
                  }
                }
              }}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={
                activeIntent === 'customer'
                  ? (isEs ? 'Crear cliente Sarah Connor, sarah@skynet.com...' : 'Add customer Sarah Connor, sarah@skynet.com...')
                  : activeIntent === 'property'
                  ? (isEs ? 'Agregar propiedad 742 Evergreen Terrace...' : 'Add property 742 Evergreen Terrace...')
                  : activeIntent === 'truck'
                  ? (isEs ? 'Agregar camion Camion 4 placas ABC-1234...' : 'Add truck Fleet Truck 4 plate ABC-1234...')
                  : activeIntent === 'service'
                  ? (isEs ? 'Agregar servicio Lavado de Fachadas por $220...' : 'Add service Pressure Washing for $220...')
                  : activeIntent === 'estimate'
                  ? (isEs ? 'Crear presupuesto para Acme Corp por $1200...' : 'Create estimate for Acme Corp for $1,200...')
                  : (isEs ? 'Programar corte de cesped para John Smith mañana por $150...' : 'Schedule lawn maintenance for John Smith tomorrow for $150...')
              }
              className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-slate-900 focus:outline-none max-h-28 overflow-y-auto leading-normal"
            />
            <button
              type="button"
              disabled={isParsing || !promptText.trim()}
              onClick={() => void handleParsePrompt()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">{isEs ? 'Analizando...' : 'Parsing...'}</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{isEs ? 'Enviar' : 'Send'}</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestions Chips with Lucide Icons */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="font-semibold text-slate-500 mr-1">{isEs ? 'Ejemplos:' : 'Examples:'}</span>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Crear presupuesto para Acme Corp por $1200' : 'Create estimate for Acme Corp for $1200')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <FileText className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Presupuesto' : 'Estimate'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Programar corte de cesped mañana por $120' : 'Schedule lawn maintenance tomorrow for $120')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Trabajo' : 'Job'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Crear cliente Sarah Connor correo sarah@skynet.com' : 'Add customer Sarah Connor email sarah@skynet.com')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <User className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Cliente' : 'Customer'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Agregar propiedad 742 Evergreen Terrace' : 'Add property 742 Evergreen Terrace')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <MapPin className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Propiedad' : 'Property'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Agregar servicio Lavado de Fachadas por $220' : 'Add service Pressure Washing for $220')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <Wrench className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Servicio' : 'Service'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(isEs ? 'Agregar camion Camion 4 placas ABC-1234' : 'Add truck Fleet Truck 4 plate ABC-1234')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <Truck className="h-3 w-3 text-emerald-600" />
              <span>{isEs ? 'Camión' : 'Truck'}</span>
            </button>
          </div>
        </div>

        {/* Tailored Form Views based on Active Intent */}
        <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          {activeIntent === 'job' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Cliente' : 'Customer'}</label>
                <select
                  value={jobCustomerId}
                  onChange={(e) => handleCustomerSelectChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? '-- Seleccionar Cliente --' : '-- Select Customer --'}</option>
                  {parseResult?.availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Direccion / Propiedad' : 'Property Address'}</label>
                <select
                  value={jobPropertyId}
                  onChange={(e) => setJobPropertyId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? '-- Seleccionar Propiedad --' : '-- Select Property --'}</option>
                  {candidateProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Tipo de Servicio' : 'Service Type'}</label>
                <select
                  value={jobServiceId}
                  onChange={(e) => setJobServiceId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? '-- Seleccionar Servicio --' : '-- Select Service --'}</option>
                  {parseResult?.availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.base_price ? `($${s.base_price})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Fecha Programada' : 'Scheduled Date'}</label>
                <input
                  type="date"
                  value={jobScheduledDate}
                  onChange={(e) => setJobScheduledDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Costo ($ USD)' : 'Cost ($ USD)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={jobCostAmount}
                  onChange={(e) => setJobCostAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Camion / Vehiculo' : 'Fleet Vehicle'}</label>
                <select
                  value={jobTruckId}
                  onChange={(e) => setJobTruckId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? 'Sin asignar' : 'Unassigned'}</option>
                  {parseResult?.availableTrucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeIntent === 'customer' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Nombre' : 'First Name'}</label>
                <input
                  type="text"
                  value={custFirstName}
                  onChange={(e) => setCustFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Apellido' : 'Last Name'}</label>
                <input
                  type="text"
                  value={custLastName}
                  onChange={(e) => setCustLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Empresa (Opcional)' : 'Company Name (Optional)'}</label>
                <input
                  type="text"
                  value={custCompanyName}
                  onChange={(e) => setCustCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Correo Electrónico' : 'Email'}</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">{isEs ? 'Teléfono' : 'Phone Number'}</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>
          ) : activeIntent === 'property' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Cliente' : 'Customer'}</label>
                <select
                  value={propCustomerId}
                  onChange={(e) => setPropCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? '-- Seleccionar Cliente --' : '-- Select Customer --'}</option>
                  {parseResult?.availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Direccion de Propiedad' : 'Street Address'}</label>
                <input
                  type="text"
                  value={propStreetAddress}
                  onChange={(e) => setPropStreetAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">{isEs ? 'Códigos de Acceso (Opcional)' : 'Gate Codes (Optional)'}</label>
                <input
                  type="text"
                  value={propGateCodes}
                  onChange={(e) => setPropGateCodes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>
          ) : activeIntent === 'truck' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Nombre de Camión / Vehículo' : 'Truck / Asset Name'}</label>
                <input
                  type="text"
                  value={truckName}
                  onChange={(e) => setTruckName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Número de Placa' : 'Plate Number'}</label>
                <input
                  type="text"
                  value={truckPlateNumber}
                  onChange={(e) => setTruckPlateNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>
          ) : activeIntent === 'service' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Nombre del Servicio' : 'Service Name'}</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Precio Base ($ USD)' : 'Base Price ($ USD)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceBasePrice}
                  onChange={(e) => setServiceBasePrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>
          ) : activeIntent === 'estimate' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Cliente' : 'Customer'}</label>
                <select
                  value={estCustomerId}
                  onChange={(e) => setEstCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                >
                  <option value="">{isEs ? '-- Seleccionar Cliente --' : '-- Select Customer --'}</option>
                  {parseResult?.availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">{isEs ? 'Monto Total ($ USD)' : 'Total Amount ($ USD)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={estTotalAmount}
                  onChange={(e) => setEstTotalAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">{isEs ? 'Notas / Descripción' : 'Notes / Proposal Description'}</label>
                <input
                  type="text"
                  value={estNotes}
                  onChange={(e) => setEstNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>
          ) : null}

          {/* Footer Action Button */}
          <div className="flex flex-col-reverse items-stretch gap-2 pt-2 border-t border-emerald-200/50 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition sm:w-auto"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleExecuteCreation}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isEs ? 'Creando...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  {isEs ? `Crear ${activeIntent.toUpperCase()}` : `Create ${activeIntent.toUpperCase()}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
