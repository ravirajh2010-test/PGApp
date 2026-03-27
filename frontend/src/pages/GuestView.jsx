import { useState, useEffect } from 'react';
import api from '../services/api';

const GuestView = () => {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/guest/buildings');
      setBuildings(res.data || []);
    } catch (error) {
      console.log('Buildings not yet available');
    }
  };

  const fetchRooms = async (buildingId) => {
    try {
      setSelectedBuilding(buildingId);
      setSelectedRoom(null);
      setVacancies([]);
      const res = await api.get(`/guest/rooms/${buildingId}`);
      setRooms(res.data || []);
    } catch (error) {
      console.log('Rooms not yet available');
    }
  };

  const fetchVacancies = async (roomId) => {
    try {
      setSelectedRoom(roomId);
      const res = await api.get(`/guest/vacancies/${roomId}`);
      setVacancies(res.data || []);
    } catch (error) {
      console.log('Vacancies not yet available');
    }
  };

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 rounded-lg p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Bajrang Hostels and PG Pvt Ltd</h1>
        <p className="text-lg text-gray-600">Find your perfect accommodation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Buildings Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🏢 Buildings</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {buildings.length > 0 ? (
              buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => fetchRooms(b.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    selectedBuilding === b.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 hover:bg-orange-100 text-gray-800'
                  }`}
                >
                  {b.name}
                </button>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No buildings available</p>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🚪 Rooms</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedBuilding ? (
              rooms.length > 0 ? (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => fetchVacancies(r.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedRoom === r.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 hover:bg-orange-100 text-gray-800'
                    }`}
                  >
                    Room {r.room_number} (Capacity: {r.capacity})
                  </button>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No rooms available</p>
              )
            ) : (
              <p className="text-gray-400 text-center py-4">Select a building</p>
            )}
          </div>
        </div>

        {/* Vacant Beds Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🛏️ Vacant Beds</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedRoom ? (
              vacancies.length > 0 ? (
                vacancies.map((b) => (
                  <div key={b.id} className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <p className="font-semibold text-green-700">Bed {b.id}</p>
                    <p className="text-sm text-green-600">Status: {b.status}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No vacant beds</p>
              )
            ) : (
              <p className="text-gray-400 text-center py-4">Select a room</p>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 bg-orange-50 rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to book?</h3>
        <a
          href="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition inline-block"
        >
          Sign In to Book Now
        </a>
      </div>
    </div>
  );
};

export default GuestView;