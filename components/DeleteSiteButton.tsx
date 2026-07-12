'use client';

import { deleteProperty } from '@/app/actions';

interface DeleteSiteButtonProps {
  propertyId: string;
  customerId: string;
}

export default function DeleteSiteButton({ propertyId, customerId }: DeleteSiteButtonProps) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (window.confirm('Are you sure you want to remove this service site?')) {
          await deleteProperty(propertyId, customerId);
        }
      }}
      className="absolute top-3 right-3 text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
      title="Delete Service Site"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.34 6m-4.74 0l-.34-6m4.78-3.92l-.28 11.5a.75.75 0 01-.748.732H8.381a.75.75 0 01-.749-.732L7.35 5.08M8.94 2.5h6.12m-7.96 0a1 1 0 011-1h5.83a1 1 0 011 1m-9.8 0h11.6" />
      </svg>
    </button>
  );
}