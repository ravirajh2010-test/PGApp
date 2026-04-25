import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import { Spinner } from './components/ui';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PropertyManagement = lazy(() => import('./pages/PropertyManagement'));
const PaymentInfo = lazy(() => import('./pages/PaymentInfo'));
const TenantDashboard = lazy(() => import('./pages/TenantDashboard'));
const GuestView = lazy(() => import('./pages/GuestView'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingSuccess = lazy(() => import('./pages/OnboardingSuccess'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const OrgSettings = lazy(() => import('./pages/OrgSettings'));
const TenantPaymentSearch = lazy(() => import('./pages/TenantPaymentSearch'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const Messenger = lazy(() => import('./pages/Messenger'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Spinner size="xl" />
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App min-h-screen bg-slate-50 dark:bg-slate-950">
          <Header />
          <main className="relative mx-auto min-h-[calc(100vh-72px)] max-w-7xl px-3 py-3 sm:px-4 sm:py-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-brand-500/8 via-brand-500/4 to-transparent blur-2xl dark:from-brand-500/12 dark:via-brand-500/5" />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<GuestView />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/success" element={<OnboardingSuccess />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/property-management" element={<PropertyManagement />} />
                <Route path="/payment-info" element={<PaymentInfo />} />
                <Route path="/tenant-payment-search" element={<TenantPaymentSearch />} />
                <Route path="/tenant" element={<TenantDashboard />} />
                <Route path="/super_admin" element={<SuperAdminDashboard />} />
                <Route path="/org-settings" element={<OrgSettings />} />
                <Route path="/messenger" element={<Messenger />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/:orgSlug" element={<GuestView />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;