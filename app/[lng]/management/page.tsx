import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import { updateSubscriberAccount } from './actions';

type OrganizationRow = {
  id: string;
  name: string | null;
  owner_id: string | null;
  subscription_status: string | null;
  trial_starts_at: string | null;
  created_at: string | null;
};

type OwnerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

const STATUS_OPTIONS = ['trial', 'individual', 'growth', 'enterprise', 'cancelled', 'past_due'];

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US');
}

function normalizeStatus(status: string | null) {
  const normalized = (status || '').trim().toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : 'trial';
}

function toDateInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function PradoManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ q?: string; status?: string; updated?: string; error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';

  await requirePradoManagementUser(locale);

  const q = (resolvedSearchParams.q || '').trim().toLowerCase();
  const statusFilter = (resolvedSearchParams.status || '').trim().toLowerCase();
  const isUpdated = resolvedSearchParams.updated === '1';
  const hasError = (resolvedSearchParams.error || '').trim();

  const supabaseAdmin = createAdminClient();

  const { data: organizations, error: organizationsError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, owner_id, subscription_status, trial_starts_at, created_at')
    .order('created_at', { ascending: false });

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  const rows = (organizations || []) as OrganizationRow[];
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_id).filter(Boolean))) as string[];

  const { data: ownerProfiles } = ownerIds.length
    ? await supabaseAdmin
        .from('user_profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', ownerIds)
    : { data: [] };

  const ownerProfileByUserId = new Map<string, OwnerProfile>();
  for (const profile of (ownerProfiles || []) as OwnerProfile[]) {
    ownerProfileByUserId.set(profile.user_id, profile);
  }

  const ownerEmailEntries = await Promise.all(
    ownerIds.map(async (ownerId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(ownerId);
      return [ownerId, data?.user?.email || null] as const;
    })
  );

  const ownerEmailByUserId = new Map<string, string | null>(ownerEmailEntries);

  const filteredRows = rows.filter((row) => {
    const normalizedStatus = (row.subscription_status || '').toLowerCase();
    if (statusFilter && normalizedStatus !== statusFilter) return false;

    if (!q) return true;

    const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) || '' : '';
    const ownerProfile = row.owner_id ? ownerProfileByUserId.get(row.owner_id) : null;
    const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim();

    return [row.name || '', row.id, ownerEmail, ownerName]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prado Management Console</h1>
          <p className="text-sm text-slate-500 mt-2">Manage subscriber account status, trial lifecycle, and support/helpdesk operations.</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:support@pradojob.com?subject=Prado%20Helpdesk%20Escalation"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Open Helpdesk Inbox
            </a>
            <a
              href="mailto:info@pradojob.com?subject=Prado%20Customer%20Service"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Contact Customer Service
            </a>
            <Link
              href={`/${locale}/support`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Open Support Hub
            </Link>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams.q || ''}
              placeholder="Search by org name, owner name, owner email, or org id"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Apply filters
            </button>
          </form>

          {isUpdated ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Subscriber account updated successfully.
            </p>
          ) : null}

          {hasError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {hasError}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 text-left font-semibold">Subscriber</th>
                  <th className="py-2 pr-3 text-left font-semibold">Owner</th>
                  <th className="py-2 pr-3 text-left font-semibold">Account Controls</th>
                  <th className="py-2 pr-3 text-left font-semibold">Support</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const ownerProfile = row.owner_id ? ownerProfileByUserId.get(row.owner_id) : null;
                  const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) : null;
                  const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || 'N/A';
                  const ownerPhone = ownerProfile?.phone?.trim() || 'N/A';

                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{row.name || 'Unnamed organization'}</p>
                        <p className="text-xs text-slate-500">Org ID: {row.id}</p>
                        <p className="text-xs text-slate-500">Created: {formatDate(row.created_at)}</p>
                      </td>

                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-800">{ownerName}</p>
                        <p className="text-xs text-slate-500">{ownerEmail || 'No email available'}</p>
                        <p className="text-xs text-slate-500">{ownerPhone}</p>
                      </td>

                      <td className="py-3 pr-3">
                        <form action={updateSubscriberAccount} className="space-y-2 min-w-[260px]">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="organizationId" value={row.id} />

                          <label className="block text-xs text-slate-600 font-medium">
                            Subscription status
                            <select
                              name="subscriptionStatus"
                              defaultValue={normalizeStatus(row.subscription_status)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-xs text-slate-600 font-medium">
                            Trial starts at
                            <input
                              type="date"
                              name="trialStartsAt"
                              defaultValue={toDateInputValue(row.trial_starts_at)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>

                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-xs font-semibold hover:bg-emerald-500"
                          >
                            Save account
                          </button>
                        </form>
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          <a
                            href={`mailto:support@pradojob.com?subject=Helpdesk%20-%20${encodeURIComponent(row.name || row.id)}`}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            Escalate to Helpdesk
                          </a>
                          {ownerEmail ? (
                            <a
                              href={`mailto:${ownerEmail}?subject=Prado%20Account%20Update%20-%20${encodeURIComponent(row.name || row.id)}`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                              Email subscriber owner
                            </a>
                          ) : null}
                          <Link
                            href={`/${locale}/support`}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            Open support form
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-slate-500">No subscribers match the current filters.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
