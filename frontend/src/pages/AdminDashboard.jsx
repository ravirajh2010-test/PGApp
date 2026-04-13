import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';
import FloorOccupancyVisual from '../components/FloorOccupancyVisual';
import TenantCredentialsModal from '../components/TenantCredentialsModal';

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
  const [layoutView, setLayoutView] = useState('rooms'); // 'floors' or 'rooms'
  const [floors, setFloors] = useState([]);
  const [selectedBuildingForFloors, setSelectedBuildingForFloors] = useState(null);

  // Tenant form state
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedRoomBeds, setSelectedRoomBeds] = useState([]);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsEmailSent, setCredentialsEmailSent] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    roomId: '',
    bedId: '',
    startDate: '',
    endDate: '',
    rent: ''
  });
  const [editingCheckout, setEditingCheckout] = useState(null); // tenant id being edited
  const [editCheckoutDate, setEditCheckoutDate] = useState('');

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

  // Get readable floor label
  const getFloorLabel = (floorNumber) => {
    if (floorNumber === 0) return 'Ground Floor';
    if (floorNumber === 1) return '1st Floor';
    if (floorNumber === 2) return '2nd Floor';
    if (floorNumber === 3) return '3rd Floor';
    return `${floorNumber}th Floor`;
  };

  // Fetch floor layout
  const fetchFloorLayout = async (buildingId) => {
    try {
      const res = await api.get(`/admin/floor-layout?buildingId=${buildingId}`);
      setFloors(res.data);
      setSelectedBuildingForFloors(buildingId);
    } catch (error) {
      console.error('Error fetching floor layout:', error);
    }
  };

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

  const [creatingTenant, setCreatingTenant] = useState(false);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setTenantError('');
    setCreatingTenant(true);
    try {
      // Save credentials before clearing form
      const savedCredentials = {
        name: formData.name,
        email: formData.email,
        password: formData.password
      };

      const response = await api.post('/admin/tenants', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        bedId: parseInt(formData.bedId),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        rent: parseFloat(formData.rent)
      });

      const emailSent = response.data?.emailSent;

      // Clear form and hide it
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        roomId: '',
        bedId: '',
        startDate: '',
        endDate: '',
        rent: ''
      });
      setSelectedRoomBeds([]);
      setShowTenantForm(false);

      // Show modal immediately
      setCreatedCredentials({
        ...savedCredentials,
        emailSent
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Error creating tenant';
      setTenantError(errorMsg);
    } finally {
      setCreatingTenant(false);
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

  const closeCredentialsModal = async () => {
    setCreatedCredentials(null);
    // Refresh data when modal closes so tenant appears in list
    await Promise.all([fetchTenants(), fetchOccupancy(), fetchAvailableBeds(), fetchBeds()]).catch(() => {});
  };

  return (
    <div className="space-y-8">
      {/* Tenant Credentials Modal - rendered at top level for proper overlay */}
      {createdCredentials && (
        <TenantCredentialsModal 
          credentials={createdCredentials} 
          onClose={closeCredentialsModal}
        />
      )}

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Admin Dashboard" /></h1>
        <p className="text-gray-600"><FormattedMessage id="dashboard.subtitle" defaultMessage="Manage tenants and view property overview" /></p>
      </div>

      {/* Occupancy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-brand-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="dashboard.totalBeds" defaultMessage="Total Beds" /></h3>
          <p className="text-3xl font-bold text-brand-500">{occupancy.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="dashboard.occupied" defaultMessage="Occupied" /></h3>
          <p className="text-3xl font-bold text-green-500">{occupancy.occupied || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="dashboard.vacant" defaultMessage="Vacant" /></h3>
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
                  phone: '',
                  roomId: '',
                  bedId: '',
                  startDate: '',
                  rent: ''
                });
                setSelectedRoomBeds([]);
              }
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            {showTenantForm ? '✕ Close' : <><FormattedMessage id="dashboard.addNewTenant" defaultMessage="+ Add New Tenant" /></>}
          </button>
          <button
            onClick={refreshAllData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            <FormattedMessage id="dashboard.refresh" defaultMessage="🔄 Refresh" />
          </button>
          <button
            onClick={() => navigate('/property-management')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            <FormattedMessage id="dashboard.modifyProperties" defaultMessage="⚙️ Modify Properties" />
          </button>
          <button
            onClick={() => navigate('/messenger')}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            💬 <FormattedMessage id="messenger.title" defaultMessage="Messenger" />
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
            <span className="text-sm font-semibold text-gray-700"><FormattedMessage id="dashboard.autoRefresh" defaultMessage="Auto Refresh" /> (30s)</span>
          </label>
          {lastRefreshTime && (
            <span className="text-xs text-gray-500">Last: {lastRefreshTime}</span>
          )}
        </div>
      </div>

      {/* Add Tenant Form */}
      {showTenantForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-brand-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6"><FormattedMessage id="tenants.addNewTenant" defaultMessage="Add New Tenant" /></h2>
          
          {tenantError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-800 font-semibold">⚠️ {tenantError}</p>
            </div>
          )}

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name" // DB field
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone (WhatsApp)"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2"><FormattedMessage id="tenants.password" defaultMessage="Password" /></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    <FormattedMessage id="tenants.generatePassword" defaultMessage="Generate" />
                  </button>
                </div>
              </div>
              <select
                name="roomId"
                value={formData.roomId}
                onChange={handleInputChange}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
              >
                <option value=""><FormattedMessage id="tenants.selectRoom" defaultMessage="Select Room" /></option>
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value=""><FormattedMessage id="tenants.selectBed" defaultMessage="Select Bed" /></option>
                {selectedRoomBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    Bed {bed.bed_identifier}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Check-in Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Checkout Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || undefined}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Rent *</label>
                <input
                  type="number"
                  name="rent"
                  placeholder="Monthly Rent"
                  value={formData.rent}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingTenant}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-wait text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              {creatingTenant ? 'Creating...' : <FormattedMessage id="tenants.create" defaultMessage="Create Tenant" />}
            </button>
          </form>
        </div>
      )}

      {/* Floor-wise Occupancy Visual */}
      <FloorOccupancyVisual buildings={buildings} />

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-brand-50 border-b-2 border-brand-500">
          <h2 className="text-2xl font-bold text-gray-800">👥 <FormattedMessage id="dashboard.tenantsSection" defaultMessage="Tenants" /></h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Loading...</p>
          ) : tenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.email" defaultMessage="Email" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.bedAssigned" defaultMessage="Bed Assigned" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.rent" defaultMessage="Rent" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.checkIn" defaultMessage="Check-in" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Checkout</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="dashboard.action" defaultMessage="Action" /></th>
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
                    <td className="px-6 py-3">
                      {editingCheckout === tenant.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={editCheckoutDate}
                            onChange={(e) => setEditCheckoutDate(e.target.value)}
                            min={new Date(tenant.start_date).toISOString().split('T')[0]}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-500"
                          />
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/admin/tenants/${tenant.id}`, { end_date: editCheckoutDate || null });
                                setEditingCheckout(null);
                                fetchTenants();
                              } catch (err) {
                                alert(err.response?.data?.message || 'Failed to update');
                              }
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >✓</button>
                          <button
                            onClick={() => setEditingCheckout(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                          >✕</button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCheckout(tenant.id);
                            setEditCheckoutDate(tenant.end_date ? new Date(tenant.end_date).toISOString().split('T')[0] : '');
                          }}
                          className="cursor-pointer hover:text-brand-600 underline decoration-dashed"
                          title="Click to edit checkout date"
                        >
                          {tenant.end_date ? new Date(tenant.end_date).toLocaleDateString() : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        onClick={() => handleDeleteTenant(tenant.id)} 
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                      >
                        <FormattedMessage id="common.delete" defaultMessage="Delete" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500"><FormattedMessage id="dashboard.noTenantsFound" defaultMessage="No tenants found" /></p>
          )}
        </div>
      </div>

      {/* Buildings Overview (Read-Only) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b-2 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800">🏢 <FormattedMessage id="dashboard.buildingsOverview" defaultMessage="Buildings Overview" /></h2>
        </div>
        <div className="overflow-x-auto">
          {buildings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.location" defaultMessage="Location" /></th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building, idx) => (
                  <tr key={building.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{building.name}</td>
                    <td className="px-6 py-3">{building.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500"><FormattedMessage id="dashboard.noBuildingsFound" defaultMessage="No buildings found" /></p>
          )}
        </div>
      </div>

      {/* Layout View Toggle */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
        <label className="font-semibold text-gray-700"><FormattedMessage id="dashboard.viewLayout" defaultMessage="View Layout:" /></label>
        <select 
          value={layoutView} 
          onChange={(e) => {
            setLayoutView(e.target.value);
            if (e.target.value === 'floors' && buildings.length > 0) {
              fetchFloorLayout(buildings[0].id);
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="rooms"><FormattedMessage id="dashboard.rooms" defaultMessage="Rooms" /></option>
          <option value="floors"><FormattedMessage id="dashboard.floors" defaultMessage="Floors" /></option>
        </select>
        {layoutView === 'floors' && buildings.length > 0 && (
          <>
            <label className="font-semibold text-gray-700"><FormattedMessage id="dashboard.selectBuilding" defaultMessage="Select Building:" /></label>
            <select 
              value={selectedBuildingForFloors || ''} 
              onChange={(e) => fetchFloorLayout(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value=""><FormattedMessage id="dashboard.chooseBuilding" defaultMessage="Choose a building..." /></option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Rooms Overview (Read-Only) */}
      {layoutView === 'rooms' && (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-purple-50 border-b-2 border-purple-500">
          <h2 className="text-2xl font-bold text-gray-800"><FormattedMessage id="dashboard.roomsOverview" defaultMessage="🚪 Rooms Overview" /></h2>
        </div>
        <div className="overflow-x-auto">
          {rooms.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.building" defaultMessage="Building" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.roomNumber" defaultMessage="Room Number" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.capacity" defaultMessage="Capacity" /></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, idx) => (
                  <tr key={room.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{room.building_name}</td>
                    <td className="px-6 py-3">{room.room_number}</td>
                    <td className="px-6 py-3">{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500"><FormattedMessage id="dashboard.noRoomsFound" defaultMessage="No rooms found" /></p>
          )}
        </div>
      </div>
      )}

      {/* Floor Layout View */}
      {layoutView === 'floors' && (
      <div className="space-y-4">
        {floors.map((floor) => (
          <div key={floor.floor_number} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-indigo-50 border-b-2 border-indigo-500">
              <h3 className="text-xl font-bold text-gray-800">{getFloorLabel(floor.floor_number)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.room" defaultMessage="Room" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.capacity" defaultMessage="Capacity" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.totalBeds" defaultMessage="Total Beds" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.occupiedBeds" defaultMessage="Occupied" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.vacantBeds" defaultMessage="Vacant" /></th>
                  </tr>
                </thead>
                <tbody>
                  {floor.rooms.map((room) => (
                    <tr key={room.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">Room {room.room_number}</td>
                      <td className="px-6 py-3">{room.capacity}</td>
                      <td className="px-6 py-3">{room.total_beds}</td>
                      <td className="px-6 py-3">
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                          {room.occupied_beds}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          {room.vacant_beds}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Beds Overview (Read-Only) */}
      {layoutView === 'rooms' && (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-green-50 border-b-2 border-green-500">
          <h2 className="text-2xl font-bold text-gray-800"><FormattedMessage id="dashboard.bedsOverview" defaultMessage="🛏️ Beds Overview" /></h2>
        </div>
        <div className="overflow-x-auto">
          {beds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.building" defaultMessage="Building" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.room" defaultMessage="Room" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.status" defaultMessage="Status" /></th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed, idx) => (
                  <tr key={bed.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{bed.building_name}</td>
                    <td className="px-6 py-3">Room {bed.room_number}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bed.status === 'occupied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {bed.status === 'occupied' ? <><FormattedMessage id="dashboard.occupiedStatus" defaultMessage="Occupied" /> 🔴</> : <><FormattedMessage id="dashboard.vacantStatus" defaultMessage="Vacant" /> 🟢</>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500"><FormattedMessage id="dashboard.noBedsFound" defaultMessage="No beds found" /></p>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default AdminDashboard;
