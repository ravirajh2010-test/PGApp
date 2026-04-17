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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-900 dark:to-dark-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-dark-700 rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-8 w-8" />
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Roomi<span className="text-brand-500">Pilot</span></span>
          </div>

          {status === 'processing' && (
            <>
              <div className="flex justify-center mb-6">
                <Spinner size="xl" className="text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Setting up your organization...</h2>
              <p className="text-slate-500 dark:text-slate-400">Payment confirmed! We're creating your workspace now.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircleIcon className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome to RoomiPilot!</h2>
              <p className="text-slate-500 dark:text-slate-400">Your organization is ready. Redirecting to your dashboard...</p>
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
