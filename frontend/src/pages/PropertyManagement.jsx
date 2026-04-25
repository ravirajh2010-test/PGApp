import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { PlusIcon, ArrowPathIcon, PencilIcon, TrashIcon, BuildingOffice2Icon, HomeIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Toast from '../components/Toast';
import { Button, Card, Badge, Spinner, Input } from '../components/ui';

const PropertyManagement = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeSection, setActiveSection] = useState('buildings');

  // Buildings state
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState(null);
  const [buildingError, setBuildingError] = useState('');
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    location: ''
  });

  // Rooms state
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomError, setRoomError] = useState('');
  const [roomForm, setRoomForm] = useState({
    buildingId: '',
    roomNumber: '',
    capacity: ''
  });

  // Beds state
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingBedId, setEditingBedId] = useState(null);
  const [bedError, setBedError] = useState('');
  const [bedForm, setBedForm] = useState({
    roomId: '',
    bedIdentifier: '',
    status: 'vacant'
  });

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Refresh all data
  const refreshAllData = async () => {
    const token = localStorage.getItem('token');
    console.log('Token available:', !!token);
    if (!token) {
      console.error('No token found! User may need to login again.');
    }
    await Promise.all([
      fetchBuildings(),
      fetchRooms(),
      fetchBeds()
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
  const fetchBuildings = async () => {
    try {
      const res = await api.get('/admin/buildings');
      console.log('Buildings response:', res.data);
      setBuildings(res.data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/admin/rooms');
      console.log('Rooms response:', res.data);
      setRooms(res.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error.response?.data || error.message);
    }
  };

  const fetchBeds = async () => {
    try {
      const res = await api.get('/admin/beds');
      console.log('Beds response:', res.data);
      setBeds(res.data || []);
    } catch (error) {
      console.error('Error fetching beds:', error.response?.data || error.message);
    }
  };

  // Building functions
  const handleAddBuilding = async (e) => {
    e.preventDefault();
    setBuildingError('');
    try {
      if (!buildingForm.name.trim()) {
        setBuildingError('Building name is required');
        return;
      }

      if (editingBuildingId) {
        await api.put(`/admin/buildings/${editingBuildingId}`, buildingForm);
        showToast('Building updated successfully!');
      } else {
        await api.post('/admin/buildings', buildingForm);
        showToast('Building created successfully!');
      }

      setBuildingForm({ name: '', location: '' });
      setEditingBuildingId(null);
      setShowBuildingForm(false);
      await fetchBuildings();
    } catch (error) {
      setBuildingError(error.response?.data?.message || 'Error saving building');
    }
  };

  const handleEditBuilding = (building) => {
    setBuildingForm({ name: building.name, location: building.location || '' });
    setEditingBuildingId(building.id);
    setShowBuildingForm(true);
  };

  const handleDeleteBuilding = async (id) => {
    if (window.confirm('Delete this building?')) {
      try {
        await api.delete(`/admin/buildings/${id}`);
        showToast('Building deleted successfully!');
        await fetchBuildings();
      } catch (error) {
        showToast(error.response?.data?.message || 'Error deleting building', 'error');
      }
    }
  };

  // Room functions
  const handleAddRoom = async (e) => {
    e.preventDefault();
    setRoomError('');
    try {
      if (!roomForm.buildingId || !roomForm.roomNumber || !roomForm.capacity) {
        setRoomError('All fields are required');
        return;
      }

      if (editingRoomId) {
        await api.put(`/admin/rooms/${editingRoomId}`, {
          buildingId: parseInt(roomForm.buildingId),
          roomNumber: roomForm.roomNumber,
          capacity: parseInt(roomForm.capacity)
        });
        showToast('Room updated successfully!');
      } else {
        await api.post('/admin/rooms', {
          buildingId: parseInt(roomForm.buildingId),
          roomNumber: roomForm.roomNumber,
          capacity: parseInt(roomForm.capacity)
        });
        showToast('Room created successfully!');
      }

      setRoomForm({ buildingId: '', roomNumber: '', capacity: '' });
      setEditingRoomId(null);
      setShowRoomForm(false);
      await fetchRooms();
    } catch (error) {
      setRoomError(error.response?.data?.message || 'Error saving room');
    }
  };

  const handleEditRoom = (room) => {
    setRoomForm({
      buildingId: room.building_id,
      roomNumber: room.room_number,
      capacity: room.capacity
    });
    setEditingRoomId(room.id);
    setShowRoomForm(true);
  };

  const handleDeleteRoom = async (id) => {
    if (window.confirm('Delete this room? This will also delete all beds and tenants in this room.')) {
      try {
        await api.delete(`/admin/rooms/${id}`);
        showToast('Room deleted successfully!');
        await refreshAllData();
      } catch (error) {
        showToast(error.response?.data?.message || 'Error deleting room', 'error');
      }
    }
  };

  // Bed functions
  const getBedsInRoom = (roomId) => {
    return beds.filter(bed => bed.room_id === parseInt(roomId)).length;
  };

  const getRoomCapacity = (roomId) => {
    const room = rooms.find(r => r.id === parseInt(roomId));
    return room ? room.capacity : 0;
  };

  const isRoomAtCapacity = (roomId) => {
    const bedsCount = getBedsInRoom(roomId);
    const capacity = getRoomCapacity(roomId);
    return bedsCount >= capacity;
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    setBedError('');
    try {
      if (!bedForm.roomId || !bedForm.bedIdentifier) {
        setBedError('Room and bed identifier are required');
        return;
      }

      if (editingBedId) {
        await api.put(`/admin/beds/${editingBedId}`, {
          roomId: parseInt(bedForm.roomId),
          bedIdentifier: bedForm.bedIdentifier,
          status: bedForm.status
        });
        showToast('Bed updated successfully!');
      } else {
        await api.post('/admin/beds', {
          roomId: parseInt(bedForm.roomId),
          bedIdentifier: bedForm.bedIdentifier,
          status: bedForm.status
        });
        showToast('Bed created successfully!');
      }

      setBedForm({ roomId: '', bedIdentifier: '', status: 'vacant' });
      setEditingBedId(null);
      setShowBedForm(false);
      await fetchBeds();
    } catch (error) {
      setBedError(error.response?.data?.message || 'Error saving bed');
    }
  };

  const handleEditBed = (bed) => {
    setBedForm({ roomId: bed.room_id, bedIdentifier: bed.bed_identifier, status: bed.status });
    setEditingBedId(bed.id);
    setShowBedForm(true);
  };

  const handleDeleteBed = async (id) => {
    if (window.confirm('Delete this bed?')) {
      try {
        await api.delete(`/admin/beds/${id}`);
        showToast('Bed deleted successfully!');
        await fetchBeds();
      } catch (error) {
        showToast(error.response?.data?.message || 'Error deleting bed', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="text-center">
        <h1 className="mb-2 flex items-center justify-center gap-3 text-3xl font-bold text-slate-800 dark:text-slate-100">
          <Cog6ToothIcon className="h-8 w-8 text-brand-500" />
          <FormattedMessage id="property.propertyManagement" defaultMessage="Property Management" />
        </h1>
        <p className="text-slate-600 dark:text-slate-400"><FormattedMessage id="property.manageBuildings" defaultMessage="Manage buildings, rooms, and beds" /></p>
      </div>

      {/* Loading */}
      {loading && <div className="flex justify-center py-4"><Spinner size="lg" /></div>}
      
      {/* Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center justify-between rounded-xl bg-slate-100 p-3.5 dark:bg-slate-800">
        <Button variant="secondary" onClick={() => navigate('/admin')} iconLeft={<span>←</span>}>
          <FormattedMessage id="property.backToDashboard" defaultMessage="Back to Admin Dashboard" />
        </Button>
        
        <Button variant="outline" onClick={refreshAllData} iconLeft={<ArrowPathIcon className="h-4 w-4" />}>
          Refresh All
        </Button>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto-refresh (30s)</span>
          </label>
          {lastRefreshTime && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Last: {lastRefreshTime}</span>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { id: 'buildings', label: 'Buildings', icon: BuildingOffice2Icon, active: 'bg-blue-500 text-white shadow-md shadow-blue-500/20', idle: 'bg-white text-slate-700 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-900/20' },
          { id: 'rooms', label: 'Rooms', icon: HomeIcon, active: 'bg-purple-500 text-white shadow-md shadow-purple-500/20', idle: 'bg-white text-slate-700 hover:bg-purple-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-purple-900/20' },
          { id: 'beds', label: 'Beds', icon: HomeIcon, active: 'bg-green-500 text-white shadow-md shadow-green-500/20', idle: 'bg-white text-slate-700 hover:bg-green-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-green-900/20' },
        ].map(({ id, label, icon: Icon, active, idle }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeSection === id
                ? `border-transparent ${active}`
                : `border-slate-200 dark:border-slate-700 ${idle}`
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Buildings Table */}
      {activeSection === 'buildings' && (
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BuildingOffice2Icon className="h-6 w-6 text-blue-600" />
            <FormattedMessage id="property.buildings" defaultMessage="Buildings" />
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setBuildingForm({ name: '', location: '' });
                setEditingBuildingId(null);
                setShowBuildingForm(!showBuildingForm);
              }}
              iconLeft={showBuildingForm ? null : <PlusIcon className="h-4 w-4" />}
            >
              {showBuildingForm ? 'Close' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={fetchBuildings} iconLeft={<ArrowPathIcon className="h-4 w-4" />} />
          </div>
        </div>

        {showBuildingForm && (
          <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            {buildingError && <p className="text-red-600 dark:text-red-400 mb-3">{buildingError}</p>}
            <form onSubmit={handleAddBuilding} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="Building Name"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
              />
              <Input
                type="text"
                placeholder="Location"
                value={buildingForm.location}
                onChange={(e) => setBuildingForm({ ...buildingForm, location: e.target.value })}
              />
              <Button type="submit" variant="success">
                {editingBuildingId ? 'Update' : 'Add'}
              </Button>
              {editingBuildingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setBuildingForm({ name: '', location: '' });
                    setEditingBuildingId(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {buildings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Location</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building, idx) => (
                  <tr key={building.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{building.name}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{building.location || '-'}</td>
                    <td className="px-6 py-3 text-center flex justify-center gap-2">
                      <Button size="xs" variant="outline" onClick={() => handleEditBuilding(building)} iconLeft={<PencilIcon className="h-3 w-3" />}>Edit</Button>
                      <Button size="xs" variant="danger" onClick={() => handleDeleteBuilding(building.id)} iconLeft={<TrashIcon className="h-3 w-3" />}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400">No buildings found</p>
          )}
        </div>
      </Card>
      )}

      {/* Rooms Table */}
      {activeSection === 'rooms' && (
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-purple-600" />
            <FormattedMessage id="property.rooms" defaultMessage="Rooms" />
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="!bg-purple-500 hover:!bg-purple-600 !text-white"
              onClick={() => {
                setRoomForm({ buildingId: '', roomNumber: '', capacity: '' });
                setEditingRoomId(null);
                setShowRoomForm(!showRoomForm);
              }}
              iconLeft={showRoomForm ? null : <PlusIcon className="h-4 w-4" />}
            >
              {showRoomForm ? 'Close' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={fetchRooms} iconLeft={<ArrowPathIcon className="h-4 w-4" />} />
          </div>
        </div>

        {showRoomForm && (
          <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 mb-3 rounded text-sm text-blue-800 dark:text-blue-300">
              <strong><FormattedMessage id="property.roomHintTitle" defaultMessage="Tip:" /></strong>{' '}
              <FormattedMessage id="property.roomHintBody" defaultMessage="The first digit of the room number determines the floor. For example: {ex1} = Ground Floor, Room 01 | {ex2} = 1st Floor, Room 01 | {ex3} = 2nd Floor, Room 03. No need to create floors separately." values={{ ex1: <strong>001</strong>, ex2: <strong>101</strong>, ex3: <strong>203</strong> }} />
            </div>
            {roomError && <p className="text-red-600 dark:text-red-400 mb-3">{roomError}</p>}
            <form onSubmit={handleAddRoom} className="flex gap-2 flex-wrap">
              <select
                value={roomForm.buildingId}
                onChange={(e) => setRoomForm({ ...roomForm, buildingId: e.target.value })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <Input
                type="text"
                placeholder="Room Number"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Capacity"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              />
              <Button type="submit" variant="success">
                {editingRoomId ? 'Update' : 'Add'}
              </Button>
              {editingRoomId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRoomForm({ buildingId: '', roomNumber: '', capacity: '' });
                    setEditingRoomId(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {rooms.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Room Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Capacity</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, idx) => (
                  <tr key={room.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.building_name}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.room_number}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{room.capacity}</td>
                    <td className="px-6 py-3 text-center flex justify-center gap-2">
                      <Button size="xs" variant="outline" onClick={() => handleEditRoom(room)} iconLeft={<PencilIcon className="h-3 w-3" />}>Edit</Button>
                      <Button size="xs" variant="danger" onClick={() => handleDeleteRoom(room.id)} iconLeft={<TrashIcon className="h-3 w-3" />}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400">No rooms found</p>
          )}
        </div>
      </Card>
      )}

      {/* Beds Table */}
      {activeSection === 'beds' && (
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-green-600" />
            <FormattedMessage id="property.beds" defaultMessage="Beds" />
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                setBedForm({ roomId: '', status: 'vacant' });
                setEditingBedId(null);
                setShowBedForm(!showBedForm);
              }}
              iconLeft={showBedForm ? null : <PlusIcon className="h-4 w-4" />}
            >
              {showBedForm ? 'Close' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={fetchBeds} iconLeft={<ArrowPathIcon className="h-4 w-4" />} />
          </div>
        </div>

        {showBedForm && (
          <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
            {bedError && <p className="text-red-600 dark:text-red-400 mb-3">{bedError}</p>}
            {bedForm.roomId && !editingBedId && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Room Capacity:</strong> {getBedsInRoom(bedForm.roomId)} / {getRoomCapacity(bedForm.roomId)} beds
                  {isRoomAtCapacity(bedForm.roomId) && <span className="ml-2 text-red-600 dark:text-red-400"> Room is at full capacity</span>}
                </p>
              </div>
            )}
            <form onSubmit={handleAddBed} className="flex gap-2 flex-wrap">
              <select
                value={bedForm.roomId}
                onChange={(e) => setBedForm({ ...bedForm, roomId: e.target.value })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">Select Room</option>
                {rooms.map((r) => {
                  const bedsInRoom = getBedsInRoom(r.id);
                  const atCapacity = bedsInRoom >= r.capacity;
                  return (
                    <option key={r.id} value={r.id} disabled={atCapacity && !editingBedId}>
                      {r.building_name} - Room {r.room_number} ({bedsInRoom}/{r.capacity})
                      {atCapacity && !editingBedId ? ' [FULL]' : ''}
                    </option>
                  );
                })}
              </select>
              <Input
                type="text"
                placeholder="Bed ID (A, B, C...)"
                value={bedForm.bedIdentifier}
                onChange={(e) => setBedForm({ ...bedForm, bedIdentifier: e.target.value.toUpperCase() })}
                maxLength="5"
              />
              <select
                value={bedForm.status}
                onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
              <Button
                type="submit"
                variant="success"
                disabled={!editingBedId && bedForm.roomId && isRoomAtCapacity(bedForm.roomId)}
              >
                {editingBedId ? 'Update' : 'Add'}
              </Button>
              {editingBedId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setBedForm({ roomId: '', bedIdentifier: '', status: 'vacant' });
                    setEditingBedId(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {beds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Room</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Bed</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed, idx) => (
                  <tr key={bed.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{idx + 1}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{bed.building_name}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">Room {bed.room_number}</td>
                    <td className="px-6 py-3 font-semibold text-brand-600 dark:text-brand-400">{bed.bed_identifier || '-'}</td>
                    <td className="px-6 py-3">
                      <Badge variant={bed.status === 'occupied' ? 'danger' : 'success'}>
                        {bed.status === 'occupied' ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-center flex justify-center gap-2">
                      <Button size="xs" variant="outline" onClick={() => handleEditBed(bed)} iconLeft={<PencilIcon className="h-3 w-3" />}>Edit</Button>
                      <Button size="xs" variant="danger" onClick={() => handleDeleteBed(bed.id)} iconLeft={<TrashIcon className="h-3 w-3" />}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400">No beds found</p>
          )}
        </div>
      </Card>
      )}
    </div>
  );
};

export default PropertyManagement;
