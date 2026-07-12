
import { createJob } from '@/app/actions';

interface Property {
  id: string;
  street_address: string;
}

interface ScheduleJobFormProps {
  properties: Property[] | null;
}

export default function ScheduleJobForm({ properties }: ScheduleJobFormProps) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Schedule Job</h3>
      <form action={createJob as (formData: FormData) => void} className="space-y-3">
        <select name="propertyId" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
          <option value="">-- Select Target Site --</option>
          {properties?.map((p) => (
            <option key={p.id} value={p.id}>{p.street_address}</option>
          ))}
        </select>
        <input type="date" name="scheduledDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <select name="jobType" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
          <option value="Mowing">Standard Lawn Mowing</option>
          <option value="Trimming">Hedge & Tree Trimming</option>
        </select>
        <input type="number" step="0.01" name="costAmount" placeholder="Price ($)" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-sm">
          Dispatch Job Target
        </button>
      </form>
    </section>
  );
}
