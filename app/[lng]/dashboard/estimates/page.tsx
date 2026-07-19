import {
  getEstimatesDashboardData,
} from '@/app/actions';
import EstimatesClient from './EstimatesClient';

export default async function EstimatesPage() {
  // Preload data on the server
  const initialData = await getEstimatesDashboardData();

  return (
    <EstimatesClient initialData={initialData} />
  );
}