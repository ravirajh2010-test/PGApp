import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

const TenantCredentialsModal = ({ credentials, emailSent, onClose }) => {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Tenant Created Successfully!</h2>
          <p className="text-gray-600">Share these credentials with the tenant</p>
        </div>

        {/* Email Status */}
        {!emailSent && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>⚠️ Note:</strong> Email could not be sent. Please share these credentials manually.
            </p>
          </div>
        )}
        {emailSent && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <p className="text-green-800 text-sm">
              <strong>✓ Sent:</strong> Credentials have been sent to the tenant's email.
            </p>
          </div>
        )}

        {/* Credentials */}
        <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-lg">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Tenant Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={credentials.name}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium"
              />
              <button
                onClick={() => copyToClipboard(credentials.name, 'name')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
              >
                {copied === 'name' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Email Address</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={credentials.email}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium"
              />
              <button
                onClick={() => copyToClipboard(credentials.email, 'email')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
              >
                {copied === 'email' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Password</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={credentials.password}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium font-mono"
              />
              <button
                onClick={() => copyToClipboard(credentials.password, 'password')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
              >
                {copied === 'password' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <p className="text-blue-900 text-sm">
            <strong>📌 Important:</strong> Tenant will be required to change their password on first login for security purposes.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            Close
          </button>
          <button
            onClick={() => {
              copyToClipboard(`Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`, 'all');
            }}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            {copied === 'all' ? '✓ All Copied' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantCredentialsModal;
