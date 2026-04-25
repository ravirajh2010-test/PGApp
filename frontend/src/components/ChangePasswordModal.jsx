import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

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
    <Modal
      isOpen={true}
      onClose={!isFirstLogin ? onClose : undefined}
      showClose={!isFirstLogin}
      title={<FormattedMessage id="changePassword.title" defaultMessage="Change Password" />}
    >
      {isFirstLogin ? (
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
          This is your first login. Please change your password by verifying your email address.
        </p>
      ) : (
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
          Verify your email with OTP to reset your password.
        </p>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm mb-4">
          {success}
        </div>
      )}

      {/* Step 1: Send OTP */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Email (for verification)"
            type="email"
            value={email}
            disabled
            helper="An OTP will be sent to this email for verification"
            iconLeft={<EnvelopeIcon />}
          />
          <Button variant="primary" fullWidth onClick={handleSendOtp} loading={loading}>
            Send OTP
          </Button>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      )}

      {/* Step 2: Enter OTP + New Password */}
      {step === 2 && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Input
              label="Enter OTP"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              maxLength={6}
              helper="Check your email inbox"
              className="text-center text-xl tracking-widest font-mono"
            />
            <div className="flex justify-end -mt-2">
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

          <Input
            label={<FormattedMessage id="changePassword.newPassword" defaultMessage="New Password" />}
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            helper="Minimum 6 characters"
            iconRight={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            }
            required
          />

          <Input
            label={<FormattedMessage id="changePassword.confirmPassword" defaultMessage="Confirm Password" />}
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            <FormattedMessage id="changePassword.changePassword" defaultMessage="Change Password" />
          </Button>

          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={isFirstLogin ? () => setStep(1) : onClose}
          >
            {isFirstLogin ? 'Back' : 'Cancel'}
          </Button>
        </form>
      )}

      <p className="text-xs text-slate-500 text-center mt-4">
        Your password will be securely updated and encrypted.
      </p>
    </Modal>
  );
};

export default ChangePasswordModal;
