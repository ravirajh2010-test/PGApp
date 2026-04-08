import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';

const ChangePasswordModal = ({ user, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = send OTP, 2 = verify & change
  const [email] = useState(user.email);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isFirstLogin = user.is_first_login;

  const handleSendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setSuccess('OTP sent to your email. Please check your inbox.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setSuccess('OTP resent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Error resending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { email, newPassword, otp });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          <FormattedMessage id="changePassword.title" defaultMessage="Change Password" />
        </h2>
        {isFirstLogin ? (
          <p className="text-gray-600 mb-6">This is your first login. Please change your password by verifying your email address.</p>
        ) : (
          <p className="text-gray-600 mb-6">Verify your email with OTP to reset your password.</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Step 1: Send OTP */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email (for verification)</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">An OTP will be sent to this email for verification</p>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Sending OTP...' : '📧 Send OTP'}
            </button>

            {!isFirstLogin && (
              <button
                type="button"
                onClick={onClose}
                className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg transition hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Step 2: Enter OTP + New Password */}
        {step === 2 && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500 text-center text-xl tracking-widest font-mono"
                required
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">Check your email inbox</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-xs text-brand-500 hover:text-brand-600 font-semibold"
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FormattedMessage id="changePassword.newPassword" defaultMessage="New Password" />
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FormattedMessage id="changePassword.confirmPassword" defaultMessage="Confirm Password" />
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Changing Password...' : <FormattedMessage id="changePassword.changePassword" defaultMessage="Change Password" />}
            </button>

            <button
              type="button"
              onClick={isFirstLogin ? () => setStep(1) : onClose}
              className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg transition hover:bg-gray-50"
            >
              {isFirstLogin ? 'Back' : 'Cancel'}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Your password will be securely updated and encrypted.
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
