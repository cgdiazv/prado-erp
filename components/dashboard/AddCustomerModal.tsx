'use client';

import { useState } from 'react';
import { createCustomer } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface AddCustomerModalProps {
  organizationId: string;
  locale?: string;
}

export default function AddCustomerModal({ organizationId, locale = 'en' }: AddCustomerModalProps) {
  const translations = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('organizationId', organizationId);
      formDataObj.append('firstName', formData.firstName);
      formDataObj.append('lastName', formData.lastName);
      formDataObj.append('companyName', formData.companyName);
      formDataObj.append('email', formData.email);
      formDataObj.append('phone', formData.phone);

      await createCustomer(formDataObj);
      
      setFormData({ firstName: '', lastName: '', companyName: '', email: '', phone: '' });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
      >
        + {translations.dashboard.addNewCustomer}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{translations.dashboard.addNewCustomer}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="cursor-pointer text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs text-gray-400 mb-4">{translations.dashboard.addCustomerDescription}</p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="firstName"
                    placeholder={translations.dashboard.firstName}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder={translations.dashboard.lastName}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <input
                  type="text"
                  name="companyName"
                  placeholder={translations.dashboard.companyName}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />

                <input
                  type="email"
                  name="email"
                  placeholder={translations.dashboard.customerEmail}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />

                <input
                  type="tel"
                  name="phone"
                  placeholder={translations.dashboard.phoneNumber}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs py-2 rounded-lg transition shadow-sm font-semibold"
                  >
                    {isSubmitting ? 'Creating...' : translations.dashboard.registerClientProfile}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-2 rounded-lg transition shadow-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
