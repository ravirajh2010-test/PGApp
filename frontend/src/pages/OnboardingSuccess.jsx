import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import api, { setAuthData } from '../services/api';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('Invalid session. Please try registering again.');
      setStatus('error');
      return;
    }

    const verifyAndCreate = async () => {
      try {
        const res = await api.get(`/stripe/checkout-success?session_id=${sessionId}`);
        setAuthData(res.data.token, res.data.user, res.data.organization);
        setStatus('success');
        setTimeout(() => { window.location.href = '/admin'; }, 2000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to complete registration. Please contact support.');
        setStatus('error');
      }
    };

    verifyAndCreate();
  }, [searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_50%,#111827_100%)]">
      <div className="max-w-md w-full mx-4">
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 text-center shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-2 shadow-lg shadow-brand-500/10 dark:border-brand-500/20 dark:bg-brand-500/10">
              <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-8 w-8" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Roomi<span className="text-brand-500">Pilot</span></span>
          </div>

          {status === 'processing' && (
            <>
              <div className="flex justify-center mb-6">
                <Spinner size="xl" className="text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Setting up your organization...</h2>
              <p className="text-slate-500 dark:text-slate-400">Payment confirmed. We are creating your workspace and both admin accounts now.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircleIcon className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome to RoomiPilot!</h2>
              <p className="text-slate-500 dark:text-slate-400">Your organization is ready. Redirecting to your primary admin dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <XCircleIcon className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
              <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
              <Button variant="primary" as="a" href="/onboarding">Try Again</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
