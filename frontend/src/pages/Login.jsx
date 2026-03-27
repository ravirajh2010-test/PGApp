import { useState } from 'react';
import api from '../services/api';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = `/${res.data.user.role}`;
    } catch (error) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 p-8">
            <img 
              src="/images/hanuman.png" 
              alt="Bajrang Hostels" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Form Section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-orange-500 mb-2">🏢 Bajrang Hostels</h1>
              <h2 className="text-2xl font-bold text-gray-800">Login</h2>
            </div>
            
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;