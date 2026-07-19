
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';
import { clearRememberToken } from '@/lib/rememberMe';

export default function Header({ orgName }: { orgName: string }) {
  return (
    <header className="mb-8 border-b border-gray-200 pb-4 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-emerald-700">Prado</h1>
        <p className="text-sm text-gray-500 font-medium">Workspace: <span className="text-gray-800 font-bold">{orgName}</span></p>
      </div>
      <form action={async () => {
        'use server';
        const serverSupabase = await createClient();
        await serverSupabase.auth.signOut({ scope: 'local' });
        await clearRememberToken();
        redirect('/login');
      }}>
        <button type="submit" className="cursor-pointer text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition shadow-sm">
          Sign Out
        </button>
      </form>
    </header>
  );
}
