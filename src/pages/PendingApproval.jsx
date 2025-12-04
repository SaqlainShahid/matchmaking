import React from 'react';
import { t } from '../lib/i18n';
import { Link } from 'react-router-dom';

export default function PendingApproval() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-yellow-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('Awaiting Admin Approval')}</h1>
        <p className="text-gray-600 text-sm mb-4">
          {t('Your account is pending admin approval. You will be able to sign in once it is approved.')}
        </p>
        <p className="text-gray-500 text-xs mb-6">
          {t('If you just registered, please also verify your email to speed up the review.')}
        </p>
        <Link to="/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {t('Back to Login')}
        </Link>
      </div>
    </div>
  );
}
