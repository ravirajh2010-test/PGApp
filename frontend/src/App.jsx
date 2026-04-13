import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import PropertyManagement from './pages/PropertyManagement';
import PaymentInfo from './pages/PaymentInfo';
import TenantDashboard from './pages/TenantDashboard';
import GuestView from './pages/GuestView';
import Onboarding from './pages/Onboarding';
import OnboardingSuccess from './pages/OnboardingSuccess';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OrgSettings from './pages/OrgSettings';
import TenantPaymentSearch from './pages/TenantPaymentSearch';
import ContactUs from './pages/ContactUs';
import Messenger from './pages/Messenger';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">
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
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;