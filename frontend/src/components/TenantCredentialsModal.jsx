import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

const TenantCredentialsModal = ({ credentials, onClose }) => {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        {/* Success Header */}
        <div className="text-center mb-3">
          <div className="text-3xl mb-1">✅</div>
          <h2 className="text-lg font-bold text-gray-800">Tenant Created Successfully!</h2>
          <p className="text-gray-500 text-sm">Share these credentials with the tenant</p>
        </div>

        {/* Credentials */}
        <div className="space-y-2 mb-3 bg-gray-50 p-3 rounded-lg">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Name</label>
            <div className="flex items-center gap-2">
              <input type="text" value={credentials.name} readOnly className="flex-1 px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-800 text-sm font-medium" />
              <button onClick={() => copyToClipboard(credentials.name, 'name')} className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium shrink-0">
                {copied === 'name' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Email</label>
            <div className="flex items-center gap-2">
              <input type="text" value={credentials.email} readOnly className="flex-1 px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-800 text-sm font-medium" />
              <button onClick={() => copyToClipboard(credentials.email, 'email')} className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium shrink-0">
                {copied === 'email' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Password</label>
            <div className="flex items-center gap-2">
              <input type="text" value={credentials.password} readOnly className="flex-1 px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-800 text-sm font-medium font-mono" />
              <button onClick={() => copyToClipboard(credentials.password, 'password')} className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium shrink-0">
                {copied === 'password' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded mb-3">
          📌 Tenant must change password on first login.
        </p>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded font-semibold text-sm transition">
            Close
          </button>
          <button
            onClick={() => copyToClipboard(`Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`, 'all')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-semibold text-sm transition"
          >
            {copied === 'all' ? '✓ Copied' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantCredentialsModal;
