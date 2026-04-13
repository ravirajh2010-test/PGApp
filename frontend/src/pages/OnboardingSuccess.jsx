import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { setAuthData } from '../services/api';

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
        // Redirect to admin dashboard after short delay
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to complete registration. Please contact support.');
        setStatus('error');
      }
    };

    verifyAndCreate();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-8 w-8" />
            <span className="text-2xl font-extrabold text-gray-800">Roomi<span className="text-brand-500">Pilot</span></span>
          </div>

          {status === 'processing' && (
            <>
              <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Setting up your organization...</h2>
              <p className="text-gray-500">Payment confirmed! We're creating your workspace now.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome to RoomiPilot!</h2>
              <p className="text-gray-500">Your organization is ready. Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <a href="/onboarding" className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-6 rounded-xl transition">
                Try Again
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
