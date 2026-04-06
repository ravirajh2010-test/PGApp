import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';

const PropertyManagement = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
      } else {
        await api.post('/admin/buildings', buildingForm);
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
        await fetchBuildings();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting building');
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
      } else {
        await api.post('/admin/rooms', {
          buildingId: parseInt(roomForm.buildingId),
          roomNumber: roomForm.roomNumber,
          capacity: parseInt(roomForm.capacity)
        });
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
        await refreshAllData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting room');
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
      } else {
        await api.post('/admin/beds', {
          roomId: parseInt(bedForm.roomId),
          bedIdentifier: bedForm.bedIdentifier,
          status: bedForm.status
        });
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
        await fetchBeds();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting bed');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">⚙️ <FormattedMessage id="property.propertyManagement" defaultMessage="Property Management" /></h1>
        <p className="text-gray-600"><FormattedMessage id="property.manageBuildings" defaultMessage="Manage buildings, rooms, and beds" /></p>
      </div>

      {/* Debug Info */}
      {loading && <div className="bg-blue-100 border border-blue-500 p-4 rounded-lg text-blue-800">Loading data...</div>}
      
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-gray-50 p-4 rounded-lg">
        <button
          onClick={() => navigate('/admin')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
        >
          <FormattedMessage id="property.backToDashboard" defaultMessage="← Back to Admin Dashboard" />
        </button>
        
        <button
          onClick={refreshAllData}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2"
        >
          🔄 Refresh All
        </button>

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

      {/* Buildings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b-2 border-blue-500 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">🏢 <FormattedMessage id="property.buildings" defaultMessage="Buildings" /></h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBuildingForm({ name: '', location: '' });
                setEditingBuildingId(null);
                setShowBuildingForm(!showBuildingForm);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {showBuildingForm ? '✕' : '➕'}
            </button>
            <button
              onClick={fetchBuildings}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔄
            </button>
          </div>
        </div>

        {showBuildingForm && (
          <div className="px-6 py-4 bg-blue-100 border-b">
            {buildingError && <p className="text-red-600 mb-3">⚠️ {buildingError}</p>}
            <form onSubmit={handleAddBuilding} className="flex gap-2">
              <input
                type="text"
                placeholder="Building Name"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Location"
                value={buildingForm.location}
                onChange={(e) => setBuildingForm({ ...buildingForm, location: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">
                {editingBuildingId ? 'Update' : 'Add'}
              </button>
              {editingBuildingId && (
                <button
                  type="button"
                  onClick={() => {
                    setBuildingForm({ name: '', location: '' });
                    setEditingBuildingId(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {buildings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building, idx) => (
                  <tr key={building.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{building.name}</td>
                    <td className="px-6 py-3">{building.location || '-'}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleEditBuilding(building)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBuilding(building.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No buildings found</p>
          )}
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-purple-50 border-b-2 border-purple-500 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">🚪 <FormattedMessage id="property.rooms" defaultMessage="Rooms" /></h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRoomForm({ buildingId: '', roomNumber: '', capacity: '' });
                setEditingRoomId(null);
                setShowRoomForm(!showRoomForm);
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {showRoomForm ? '✕' : '➕'}
            </button>
            <button
              onClick={fetchRooms}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔄
            </button>
          </div>
        </div>

        {showRoomForm && (
          <div className="px-6 py-4 bg-purple-100 border-b">
            {roomError && <p className="text-red-600 mb-3">⚠️ {roomError}</p>}
            <form onSubmit={handleAddRoom} className="flex gap-2 flex-wrap">
              <select
                value={roomForm.buildingId}
                onChange={(e) => setRoomForm({ ...roomForm, buildingId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Room Number"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                placeholder="Capacity"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">
                {editingRoomId ? 'Update' : 'Add'}
              </button>
              {editingRoomId && (
                <button
                  type="button"
                  onClick={() => {
                    setRoomForm({ buildingId: '', roomNumber: '', capacity: '' });
                    setEditingRoomId(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {rooms.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Room Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Capacity</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, idx) => (
                  <tr key={room.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{room.building_name}</td>
                    <td className="px-6 py-3">{room.room_number}</td>
                    <td className="px-6 py-3">{room.capacity}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleEditRoom(room)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-500">No rooms found</p>
          )}
        </div>
      </div>

      {/* Beds Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-green-50 border-b-2 border-green-500 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">🛏️ <FormattedMessage id="property.beds" defaultMessage="Beds" /></h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBedForm({ roomId: '', status: 'vacant' });
                setEditingBedId(null);
                setShowBedForm(!showBedForm);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {showBedForm ? '✕' : '➕'}
            </button>
            <button
              onClick={fetchBeds}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔄
            </button>
          </div>
        </div>

        {showBedForm && (
          <div className="px-6 py-4 bg-green-100 border-b">
            {bedError && <p className="text-red-600 mb-3">⚠️ {bedError}</p>}
            {bedForm.roomId && !editingBedId && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Room Capacity:</strong> {getBedsInRoom(bedForm.roomId)} / {getRoomCapacity(bedForm.roomId)} beds
                  {isRoomAtCapacity(bedForm.roomId) && <span className="ml-2 text-red-600">⚠️ Room is at full capacity</span>}
                </p>
              </div>
            )}
            <form onSubmit={handleAddBed} className="flex gap-2 flex-wrap">
              <select
                value={bedForm.roomId}
                onChange={(e) => setBedForm({ ...bedForm, roomId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
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
              <input
                type="text"
                placeholder="Bed ID (A, B, C...)"
                value={bedForm.bedIdentifier}
                onChange={(e) => setBedForm({ ...bedForm, bedIdentifier: e.target.value.toUpperCase() })}
                className="px-3 py-2 border border-gray-300 rounded"
                maxLength="5"
              />
              <select
                value={bedForm.status}
                onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
              <button 
                type="submit" 
                disabled={!editingBedId && bedForm.roomId && isRoomAtCapacity(bedForm.roomId)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {editingBedId ? 'Update' : 'Add'}
              </button>
              {editingBedId && (
                <button
                  type="button"
                  onClick={() => {
                    setBedForm({ roomId: '', bedIdentifier: '', status: 'vacant' });
                    setEditingBedId(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          {beds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Building</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Room</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Bed</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed, idx) => (
                  <tr key={bed.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3">{bed.building_name}</td>
                    <td className="px-6 py-3">Room {bed.room_number}</td>
                    <td className="px-6 py-3 font-semibold text-blue-600">{bed.bed_identifier || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bed.status === 'occupied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {bed.status === 'occupied' ? '🔴 Occupied' : '🟢 Vacant'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleEditBed(bed)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBed(bed.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
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

export default PropertyManagement;
