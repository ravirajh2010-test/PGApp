import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { PlusIcon, ArrowPathIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, UsersIcon, BuildingOffice2Icon, HomeIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import FloorOccupancyVisual from '../components/FloorOccupancyVisual';
import TenantCredentialsModal from '../components/TenantCredentialsModal';
import { useCurrency } from '../context/LanguageContext';
import { Button, Card, Badge, Spinner, Input } from '../components/ui';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
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
  const [floorRefreshKey, setFloorRefreshKey] = useState(0);

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
    setFloorRefreshKey(prev => prev + 1);
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
        setFloorRefreshKey(prev => prev + 1);
      } catch (error) {
        alert('Error deleting tenant');
      }
    }
  };

  const closeCredentialsModal = async () => {
    setCreatedCredentials(null);
    // Refresh data when modal closes so tenant appears in list
    await Promise.all([fetchTenants(), fetchOccupancy(), fetchAvailableBeds(), fetchBeds()]).catch(() => {});
    setFloorRefreshKey(prev => prev + 1);
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
        <h1 className="flex items-center justify-center gap-2 text-2xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          <UsersIcon className="w-8 h-8 text-brand-500" />
          <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Admin Dashboard" />
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base"><FormattedMessage id="dashboard.subtitle" defaultMessage="Manage tenants and view property overview" /></p>
      </div>

      {/* Occupancy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card accent="brand">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="dashboard.totalBeds" defaultMessage="Total Beds" /></h3>
          <p className="text-3xl font-bold text-brand-500 mt-1">{occupancy.total || 0}</p>
        </Card>
        <Card accent="green">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="dashboard.occupied" defaultMessage="Occupied" /></h3>
          <p className="text-3xl font-bold text-green-500 mt-1">{occupancy.occupied || 0}</p>
        </Card>
        <Card accent="blue">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="dashboard.vacant" defaultMessage="Vacant" /></h3>
          <p className="text-3xl font-bold text-blue-500 mt-1">{(occupancy.total || 0) - (occupancy.occupied || 0)}</p>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant={showTenantForm ? 'secondary' : 'primary'}
            size="sm"
            iconLeft={showTenantForm ? <XMarkIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
            onClick={() => {
              setShowTenantForm(!showTenantForm);
              if (showTenantForm) {
                setFormData({ name: '', email: '', password: '', phone: '', roomId: '', bedId: '', startDate: '', rent: '' });
                setSelectedRoomBeds([]);
              }
            }}
          >
            {showTenantForm ? 'Close' : <FormattedMessage id="dashboard.addNewTenant" defaultMessage="Add New Tenant" />}
          </Button>
          <Button variant="outline" size="sm" iconLeft={<ArrowPathIcon className="w-4 h-4" />} onClick={refreshAllData}>
            <FormattedMessage id="dashboard.refresh" defaultMessage="Refresh" />
          </Button>
          <Button variant="outline" size="sm" iconLeft={<Cog6ToothIcon className="w-4 h-4" />} onClick={() => navigate('/property-management')}>
            <FormattedMessage id="dashboard.modifyProperties" defaultMessage="Modify Properties" />
          </Button>
          <Button variant="outline" size="sm" iconLeft={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={() => navigate('/messenger')}>
            <FormattedMessage id="messenger.title" defaultMessage="Messenger" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.autoRefresh" defaultMessage="Auto Refresh" /> (30s)</span>
          </label>
          {lastRefreshTime && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Last: {lastRefreshTime}</span>
          )}
        </div>
      </div>

      {/* Add Tenant Form */}
      {showTenantForm && (
        <Card className="border-2 border-brand-300 dark:border-brand-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6"><FormattedMessage id="tenants.addNewTenant" defaultMessage="Add New Tenant" /></h2>
          
          {tenantError && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-800 dark:text-red-300 font-semibold">{tenantError}</p>
            </div>
          )}

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <Input
                type="tel"
                name="phone"
                placeholder="Phone (WhatsApp)"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FormattedMessage id="tenants.password" defaultMessage="Password" /></label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                    <FormattedMessage id="tenants.generatePassword" defaultMessage="Generate" />
                  </Button>
                </div>
              </div>
              <select
                name="roomId"
                value={formData.roomId}
                onChange={handleInputChange}
                required
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
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
              <Input
                type="date"
                name="startDate"
                label="Check-in Date *"
                value={formData.startDate}
                onChange={handleInputChange}
                required
              />
              <Input
                type="date"
                name="endDate"
                label="Checkout Date"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || undefined}
              />
              <Input
                type="number"
                name="rent"
                label="Monthly Rent *"
                placeholder="Monthly Rent"
                value={formData.rent}
                onChange={handleInputChange}
                required
                step="0.01"
              />
            </div>

            <Button
              type="submit"
              variant="success"
              fullWidth
              loading={creatingTenant}
            >
              <FormattedMessage id="tenants.create" defaultMessage="Create Tenant" />
            </Button>
          </form>
        </Card>
      )}

      {/* Floor-wise Occupancy Visual */}
      <FloorOccupancyVisual buildings={buildings} refreshKey={floorRefreshKey} />

      {/* Tenants Table */}
      <Card padding={false}>
        <div className="px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-brand-600" />
            <FormattedMessage id="dashboard.tenantsSection" defaultMessage="Tenants" />
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner size="lg" /></div>
          ) : tenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.email" defaultMessage="Email" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.bedAssigned" defaultMessage="Bed Assigned" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.rent" defaultMessage="Rent" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.checkIn" defaultMessage="Check-in" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Checkout</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.action" defaultMessage="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{tenant.name}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{tenant.email}</td>
                    <td className="px-6 py-3 text-sm">
                      <Badge variant="info">
                        {tenant.building_name} - Room {tenant.room_number} - Bed {tenant.bed_identifier}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{currencySymbol}{tenant.rent}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{new Date(tenant.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      {editingCheckout === tenant.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={editCheckoutDate}
                            onChange={(e) => setEditCheckoutDate(e.target.value)}
                            min={new Date(tenant.start_date).toISOString().split('T')[0]}
                            className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                          <Button
                            size="xs"
                            variant="success"
                            onClick={async () => {
                              try {
                                await api.put(`/admin/tenants/${tenant.id}`, { end_date: editCheckoutDate || null });
                                setEditingCheckout(null);
                                fetchTenants();
                              } catch (err) {
                                alert(err.response?.data?.message || 'Failed to update');
                              }
                            }}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </Button>
                          <Button size="xs" variant="secondary" onClick={() => setEditingCheckout(null)}>
                            <XMarkIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCheckout(tenant.id);
                            setEditCheckoutDate(tenant.end_date ? new Date(tenant.end_date).toISOString().split('T')[0] : '');
                          }}
                          className="cursor-pointer hover:text-brand-600 underline decoration-dashed text-slate-700 dark:text-slate-300"
                          title="Click to edit checkout date"
                        >
                          {tenant.end_date ? new Date(tenant.end_date).toLocaleDateString() : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteTenant(tenant.id)}
                      >
                        <FormattedMessage id="common.delete" defaultMessage="Delete" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="dashboard.noTenantsFound" defaultMessage="No tenants found" /></p>
          )}
        </div>
      </Card>

      {/* Buildings Overview (Read-Only) */}
      <Card padding={false}>
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BuildingOffice2Icon className="h-6 w-6 text-blue-600" />
            <FormattedMessage id="dashboard.buildingsOverview" defaultMessage="Buildings Overview" />
          </h2>
        </div>
        <div className="overflow-x-auto">
          {buildings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.location" defaultMessage="Location" /></th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building, idx) => (
                  <tr key={building.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{building.name}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{building.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="dashboard.noBuildingsFound" defaultMessage="No buildings found" /></p>
          )}
        </div>
      </Card>

      {/* Layout View Toggle */}
      <Card className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <label className="font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.viewLayout" defaultMessage="View Layout:" /></label>
        <select 
          value={layoutView} 
          onChange={(e) => {
            setLayoutView(e.target.value);
            if (e.target.value === 'floors' && buildings.length > 0) {
              fetchFloorLayout(buildings[0].id);
            }
          }}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="rooms"><FormattedMessage id="dashboard.rooms" defaultMessage="Rooms" /></option>
          <option value="floors"><FormattedMessage id="dashboard.floors" defaultMessage="Floors" /></option>
        </select>
        {layoutView === 'floors' && buildings.length > 0 && (
          <>
            <label className="font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.selectBuilding" defaultMessage="Select Building:" /></label>
            <select 
              value={selectedBuildingForFloors || ''} 
              onChange={(e) => fetchFloorLayout(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value=""><FormattedMessage id="dashboard.chooseBuilding" defaultMessage="Choose a building..." /></option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </>
        )}
      </Card>

      {/* Rooms Overview (Read-Only) */}
      {layoutView === 'rooms' && (
      <Card padding={false}>
        <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-500">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-purple-600" />
            <FormattedMessage id="dashboard.roomsOverview" defaultMessage="Rooms Overview" />
          </h2>
        </div>
        <div className="overflow-x-auto">
          {rooms.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.building" defaultMessage="Building" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.roomNumber" defaultMessage="Room Number" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.capacity" defaultMessage="Capacity" /></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, idx) => (
                  <tr key={room.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.building_name}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.room_number}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="dashboard.noRoomsFound" defaultMessage="No rooms found" /></p>
          )}
        </div>
      </Card>
      )}

      {/* Floor Layout View */}
      {layoutView === 'floors' && (
      <div className="space-y-4">
        {floors.map((floor) => (
          <Card key={floor.floor_number} padding={false}>
            <div className="px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{getFloorLabel(floor.floor_number)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.room" defaultMessage="Room" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.capacity" defaultMessage="Capacity" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.totalBeds" defaultMessage="Total Beds" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.occupiedBeds" defaultMessage="Occupied" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.vacantBeds" defaultMessage="Vacant" /></th>
                  </tr>
                </thead>
                <tbody>
                  {floor.rooms.map((room) => (
                    <tr key={room.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">Room {room.room_number}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.capacity}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.total_beds}</td>
                      <td className="px-6 py-3">
                        <Badge variant="danger">{room.occupied_beds}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="success">{room.vacant_beds}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Beds Overview (Read-Only) */}
      {layoutView === 'rooms' && (
      <Card padding={false}>
        <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-green-600" />
            <FormattedMessage id="dashboard.bedsOverview" defaultMessage="Beds Overview" />
          </h2>
        </div>
        <div className="overflow-x-auto">
          {beds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.id" defaultMessage="ID" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.building" defaultMessage="Building" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.room" defaultMessage="Room" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200"><FormattedMessage id="dashboard.status" defaultMessage="Status" /></th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed, idx) => (
                  <tr key={bed.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{bed.building_name}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">Room {bed.room_number}</td>
                    <td className="px-6 py-3">
                      <Badge variant={bed.status === 'occupied' ? 'danger' : 'success'}>
                        {bed.status === 'occupied'
                          ? <FormattedMessage id="dashboard.occupiedStatus" defaultMessage="Occupied" />
                          : <FormattedMessage id="dashboard.vacantStatus" defaultMessage="Vacant" />}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="dashboard.noBedsFound" defaultMessage="No beds found" /></p>
          )}
        </div>
      </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
