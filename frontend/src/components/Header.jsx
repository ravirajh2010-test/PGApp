import { Link } from 'react-router-dom';
import { useState } from 'react';
import AvailabilityModal from './AvailabilityModal';

const Header = () => {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const [showAvailability, setShowAvailability] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <header className="bg-orange-500 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold">🏢 Bajrang Hostels and PG Pvt Ltd</span>
        </Link>
        <nav className="flex items-center gap-6">
          {!user ? (
            <>
              <Link to="/login" className="hover:bg-orange-600 px-4 py-2 rounded transition">Login</Link>
              <button 
                onClick={() => setShowAvailability(true)}
                className="hover:bg-orange-600 px-4 py-2 rounded transition font-medium"
              >
                Check Availability
              </button>
            </>
          ) : (
            <>
              <span className="text-sm">Welcome, {user.name}</span>
              {user.role === 'admin' && <Link to="/admin" className="hover:bg-orange-600 px-4 py-2 rounded">Dashboard</Link>}
              {user.role === 'admin' && <Link to="/payment-info" className="hover:bg-orange-600 px-4 py-2 rounded">Payment Info</Link>}
              {user.role === 'tenant' && <Link to="/tenant" className="hover:bg-orange-600 px-4 py-2 rounded">My Profile</Link>}
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition">Logout</button>
            </>
          )}
        </nav>
      </div>
      <AvailabilityModal isOpen={showAvailability} onClose={() => setShowAvailability(false)} />
    </header>
  );
};

export default Header;