import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import PropertyManagement from './pages/PropertyManagement';
import PaymentInfo from './pages/PaymentInfo';
import TenantDashboard from './pages/TenantDashboard';
import GuestView from './pages/GuestView';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<GuestView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/property-management" element={<PropertyManagement />} />
            <Route path="/payment-info" element={<PaymentInfo />} />
            <Route path="/tenant" element={<TenantDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;