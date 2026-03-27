import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [occupancy, setOccupancy] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Tenant form state
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedRoomBeds, setSelectedRoomBeds] = useState([]);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [tenantError, setTenantError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roomId: '',
    bedId: '',
    startDate: '',
    endDate: '',
    rent: ''
  });

  // Refresh all data
  const refreshAllData = async () => {
    await Promise.all([
      fetchTenants(),
      fetchBuildings(),
      fetchRooms(),
      fetchBeds(),
      fetchOccupancy(),
      fetchAvailableBeds()
    ]);
    setLastRefreshTime(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshAllData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Fetch functions
  const fetchTenants = async () => {
    try {
      const res = await api.get('/admin/tenants');
      if (res.data) setTenants(res.data);
    } catch (error) {
      console.error('Error fetching tenants:', error.response?.status, error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/admin/buildings');
      if (res.data) setBuildings(res.data);
    } catch (error) {
      console.error('Error fetching buildings:', error.response?.status, error.message);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/admin/rooms');
      if (res.data) setRooms(res.data);
    } catch (error) {
      console.error('Error fetching rooms:', error.response?.status, error.message);
    }
  };

  const fetchBeds = async () => {
    try {
      const res = await api.get('/admin/beds');
      if (res.data) setBeds(res.data);
    } catch (error) {
      console.error('Error fetching beds:', error.response?.status, error.message);
    }
  };

  const fetchOccupancy = async () => {
    try {
      const res = await api.get('/admin/occupancy');
      if (res.data) setOccupancy(res.data);
    } catch (error) {
      console.error('Error fetching occupancy:', error.response?.status, error.message);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const res = await api.get('/admin/available-beds');
      if (res.data) setAvailableBeds(res.data);
    } catch (error) {
      console.error('Error fetching available beds:', error.response?.status, error.message);
    }
  };

  // Building functions
  const handleEditBuilding = (building) => {
    navigate('/property-management');
  };

  // Room functions
  const handleEditRoom = (room) => {
    navigate('/property-management');
  };

  // Bed functions
  const handleEditBed = (bed) => {
    navigate('/property-management');
  };

  // Tenant functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'roomId') {
      // When room is selected, filter beds for that room
      // Note: availableBeds from API already contains only vacant beds
      const roomBedsFiltered = availableBeds.filter(bed => 
        bed.room_id === parseInt(value)
      );
      console.log(`Selected Room ${value}: Found ${roomBedsFiltered.length} vacant beds:`, roomBedsFiltered.map(b => b.bed_identifier));
      setSelectedRoomBeds(roomBedsFiltered);
      setFormData({ ...formData, roomId: value, bedId: '' }); // Reset bed selection
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setTenantError('');
    try {
      await api.post('/admin/tenants', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        bedId: parseInt(formData.bedId),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        rent: parseFloat(formData.rent)
      });

      setCreatedCredentials({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      setFormData({
        name: '',
        email: '',
        password: '',
        roomId: '',
        bedId: '',
        startDate: '',
        endDate: '',
        rent: ''
      });
      setSelectedRoomBeds([]);

      await Promise.all([fetchTenants(), fetchOccupancy(), fetchAvailableBeds(), fetchBeds()]);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Error creating tenant';
      setTenantError(errorMsg);
    }
  };

  const handleDeleteTenant = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/admin/tenants/${id}`);
        await Promise.all([fetchTenants(), fetchOccupancy(), fetchAvailableBeds(), fetchBeds()]);
      } catch (error) {
        alert('Error deleting tenant');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Admin Dashboard</h1>
        <p className="text-gray-600">Manage tenants and view property overview</p>
      </div>

      {/* Occupancy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Beds</h3>
          <p className="text-3xl font-bold text-orange-500">{occupancy.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Occupied</h3>
          <p className="text-3xl font-bold text-green-500">{occupancy.occupied || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Vacant</h3>
          <p className="text-3xl font-bold text-blue-500">{(occupancy.total || 0) - (occupancy.occupied || 0)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowTenantForm(!showTenantForm);
              if (showTenantForm) {
                // Clear form when closing
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  roomId: '',
                  bedId: '',
                  startDate: '',
                  endDate: '',
                  rent: ''
                });
                setSelectedRoomBeds([]);
              }
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            {showTenantForm ? '✕ Close' : '➕ Add New Tenant'}
          </button>
          <button
            onClick={refreshAllData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => navigate('/property-management')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            ⚙️ Modify Properties
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-gray-700">Auto-refresh (30s)</span>
          </label>
          {lastRefreshTime && (
            <span className="text-xs text-gray-500">Last: {lastRefreshTime}</span>
          )}
        </div>
      </div>

      {/* Add Tenant Form */}
      {showTenantForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Tenant</h2>
          
          {tenantError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-800 font-semibold">⚠️ {tenantError}</p>
            </div>
          )}

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <select
                name="roomId"
                value={formData.roomId}
                onChange={handleInputChange}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">Select Room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.building_name} - Room {room.room_number} (Capacity: {room.capacity})
                  </option>
                ))}
              </select>
              <select
                name="bedId"
                value={formData.bedId}
                onChange={handleInputChange}
                required
                disabled={!formData.roomId}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Bed</option>
                {selectedRoomBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    Bed {bed.bed_identifier}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <input
                type="number"
                name="rent"
                placeholder="Monthly Rent"
                value={formData.rent}
                onChange={handleInputChange}
                required
                step="0.01"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Create Tenant
            </button>
          </form>
        </div>
      )}

      {/* Created Credentials Display */}
      {createdCredentials && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">✓ Tenant Created Successfully</h3>
          <div className="bg-white rounded p-4 space-y-2 font-mono text-sm">
            <p><span className="font-bold text-gray-700">Name:</span> {createdCredentials.name}</p>
            <p><span className="font-bold text-gray-700">Email:</span> {createdCredentials.email}</p>
            <p><span className="font-bold text-gray-700">Password:</span> {createdCredentials.password}</p>
          </div>
          <p className="text-sm text-green-700 mt-4">Share these credentials with the tenant. They will be prompted to change their password on first login.</p>
          <button
            onClick={() => setCreatedCredentials(null)}
            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-orange-50 border-b-2 border-orange-500">
          <h2 className="text-2xl font-bold text-gray-800">👥 Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Loading...</p>
          ) : tenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Bed Assigned</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Rent</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Check-in</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{tenant.name}</td>
                    <td className="px-6 py-3">{tenant.email}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                        {tenant.building_name} - Room {tenant.room_number} - Bed {tenant.bed_identifier}
                      </span>
                    </td>
                    <td className="px-6 py-3">₹{tenant.rent}</td>
                    <td className="px-6 py-3">{new Date(tenant.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        onClick={() => handleDeleteTenant(tenant.id)} 
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No tenants found</p>
          )}
        </div>
      </div>

      {/* Buildings Overview (Read-Only) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b-2 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800">🏢 Buildings Overview</h2>
        </div>
        <div className="overflow-x-auto">
          {buildings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Location</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building) => (
                  <tr key={building.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{building.id}</td>
                    <td className="px-6 py-3">{building.name}</td>
                    <td className="px-6 py-3">{building.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No buildings found</p>
          )}
        </div>
      </div>

      {/* Rooms Overview (Read-Only) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-purple-50 border-b-2 border-purple-500">
          <h2 className="text-2xl font-bold text-gray-800">🚪 Rooms Overview</h2>
        </div>
        <div className="overflow-x-auto">
          {rooms.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Room Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{room.id}</td>
                    <td className="px-6 py-3">{room.building_name}</td>
                    <td className="px-6 py-3">{room.room_number}</td>
                    <td className="px-6 py-3">{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No rooms found</p>
          )}
        </div>
      </div>

      {/* Beds Overview (Read-Only) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-green-50 border-b-2 border-green-500">
          <h2 className="text-2xl font-bold text-gray-800">🛏️ Beds Overview</h2>
        </div>
        <div className="overflow-x-auto">
          {beds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Room</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed) => (
                  <tr key={bed.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{bed.id}</td>
                    <td className="px-6 py-3">{bed.building_name}</td>
                    <td className="px-6 py-3">Room {bed.room_number}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bed.status === 'occupied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {bed.status === 'occupied' ? '🔴 Occupied' : '🟢 Vacant'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No beds found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
