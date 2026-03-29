import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';

const GuestView = () => {
  const { orgSlug } = useParams();
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [orgInfo, setOrgInfo] = useState(null);

  // If no orgSlug, show landing page
  if (!orgSlug) {
    return (
      <div className="bg-gradient-to-b from-white to-gray-50 rounded-lg p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">🏢 <FormattedMessage id="guest.pageTitle" defaultMessage="PG Stay" /></h1>
          <p className="text-xl text-gray-600 mb-2"><FormattedMessage id="guest.tagline" defaultMessage="The easiest way to manage your PG & Hostel business" /></p>
          <p className="text-gray-500"><FormattedMessage id="guest.taglineSub" defaultMessage="Multi-tenant SaaS platform for PG owners and hostel managers" /></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2"><FormattedMessage id="guest.propertyMgmt" defaultMessage="Property Management" /></h3>
            <p className="text-gray-600"><FormattedMessage id="guest.propertyMgmtDesc" defaultMessage="Manage buildings, rooms, and beds with real-time occupancy tracking" /></p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2"><FormattedMessage id="guest.tenantMgmt" defaultMessage="Tenant Management" /></h3>
            <p className="text-gray-600"><FormattedMessage id="guest.tenantMgmtDesc" defaultMessage="Onboard tenants, track stays, and manage check-ins/check-outs" /></p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2"><FormattedMessage id="guest.paymentTracking" defaultMessage="Payment Tracking" /></h3>
            <p className="text-gray-600"><FormattedMessage id="guest.paymentTrackingDesc" defaultMessage="Integrated Razorpay payments with automatic rent collection" /></p>
          </div>
        </div>

        <div className="text-center bg-orange-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4"><FormattedMessage id="guest.startManaging" defaultMessage="Start managing your PG today" /></h3>
          <div className="flex gap-4 justify-center">
            <Link to="/onboarding" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition">
              <FormattedMessage id="guest.registerBusiness" defaultMessage="Register Your Business" />
            </Link>
            <Link to="/login" className="bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-bold py-3 px-8 rounded-lg transition">
              <FormattedMessage id="auth.login" defaultMessage="Login" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchBuildings();
  }, [orgSlug]);

  const fetchBuildings = async () => {
    try {
      const res = await api.get(`/guest/${orgSlug}/buildings`);
      setBuildings(res.data || []);
      // Get org name from first building if available, or use slug
      if (res.data && res.data.length > 0) {
        setOrgInfo({ name: orgSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) });
      }
    } catch (error) {
      console.log('Buildings not yet available');
    }
  };

  const fetchRooms = async (buildingId) => {
    try {
      setSelectedBuilding(buildingId);
      setSelectedRoom(null);
      setVacancies([]);
      const res = await api.get(`/guest/${orgSlug}/rooms/${buildingId}`);
      setRooms(res.data || []);
    } catch (error) {
      console.log('Rooms not yet available');
    }
  };

  const fetchVacancies = async (roomId) => {
    try {
      setSelectedRoom(roomId);
      const res = await api.get(`/guest/${orgSlug}/vacancies/${roomId}`);
      setVacancies(res.data || []);
    } catch (error) {
      console.log('Vacancies not yet available');
    }
  };

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 rounded-lg p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          <FormattedMessage id="guest.welcomeTo" defaultMessage="Welcome to" /> {orgInfo?.name || orgSlug}
        </h1>
        <p className="text-lg text-gray-600"><FormattedMessage id="guest.findAccommodation" defaultMessage="Find your perfect accommodation" /></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Buildings Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🏢 <FormattedMessage id="guest.buildings" defaultMessage="Buildings" /></h2>
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
              <p className="text-gray-400 text-center py-4"><FormattedMessage id="guest.noBuildingsAvailable" defaultMessage="No buildings available" /></p>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🚪 <FormattedMessage id="guest.rooms" defaultMessage="Rooms" /></h2>
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
                <p className="text-gray-400 text-center py-4"><FormattedMessage id="guest.noRoomsAvailable" defaultMessage="No rooms available" /></p>
              )
            ) : (
              <p className="text-gray-400 text-center py-4"><FormattedMessage id="guest.selectBuilding" defaultMessage="Select a building" /></p>
            )}
          </div>
        </div>

        {/* Vacant Beds Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-orange-500 mb-4 pb-2 border-b-2 border-orange-500">🛏️ <FormattedMessage id="guest.vacantBeds" defaultMessage="Vacant Beds" /></h2>
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
                <p className="text-gray-400 text-center py-4"><FormattedMessage id="guest.noVacantBeds" defaultMessage="No vacant beds" /></p>
              )
            ) : (
              <p className="text-gray-400 text-center py-4"><FormattedMessage id="guest.selectRoom" defaultMessage="Select a room" /></p>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 bg-orange-50 rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4"><FormattedMessage id="guest.readyToBook" defaultMessage="Ready to book?" /></h3>
        <Link
          to="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition inline-block"
        >
          <FormattedMessage id="guest.signInToBook" defaultMessage="Sign In to Book Now" />
        </Link>
      </div>
    </div>
  );
};

export default GuestView;