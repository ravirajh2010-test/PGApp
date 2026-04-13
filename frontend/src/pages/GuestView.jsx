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
      <div className="-mx-4 -mt-8">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-dark-900 via-dark-800 to-brand-950 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-brand-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-600 rounded-full blur-3xl"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                  <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-14 w-14" />
                  <span className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    Roomi<span className="text-brand-400">Pilot</span>
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  <FormattedMessage id="guest.tagline" defaultMessage="The smartest way to manage your PG & Hostel business" />
                </h1>
                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg">
                  <FormattedMessage id="guest.taglineSub" defaultMessage="Multi-tenant SaaS platform for PG owners and hostel managers. Scale effortlessly with separate databases per organization." />
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link to="/onboarding" className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-brand-500/30 text-center">
                    <FormattedMessage id="guest.registerBusiness" defaultMessage="Get Started Free" />
                  </Link>
                  <Link to="/login" className="border-2 border-brand-400 text-brand-400 hover:bg-brand-400/10 font-bold py-3 px-8 rounded-xl transition text-center">
                    <FormattedMessage id="auth.login" defaultMessage="Login" />
                  </Link>
                </div>
              </div>
              <div className="flex-1 hidden md:flex justify-center">
                <div className="relative">
                  <div className="w-80 h-80 bg-gradient-to-br from-brand-400/20 to-brand-600/20 rounded-3xl backdrop-blur-sm border border-brand-400/20 p-8 flex items-center justify-center">
                    <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="w-48 h-48 drop-shadow-2xl" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">ðŸ¢</span>
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">ðŸ”’</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Everything you need to manage your PG</h2>
            <p className="text-gray-500 text-lg">Powerful tools designed for hostel & PG operators</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl p-8 text-center transition border border-gray-100 hover:border-brand-200">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-brand-100 transition">
                <span className="text-3xl">ðŸ </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3"><FormattedMessage id="guest.propertyMgmt" defaultMessage="Property Management" /></h3>
              <p className="text-gray-500"><FormattedMessage id="guest.propertyMgmtDesc" defaultMessage="Manage buildings, rooms, and beds with real-time occupancy tracking" /></p>
            </div>
            <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl p-8 text-center transition border border-gray-100 hover:border-brand-200">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-brand-100 transition">
                <span className="text-3xl">ðŸ‘¥</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3"><FormattedMessage id="guest.tenantMgmt" defaultMessage="Tenant Management" /></h3>
              <p className="text-gray-500"><FormattedMessage id="guest.tenantMgmtDesc" defaultMessage="Onboard tenants, track stays, and manage check-ins/check-outs" /></p>
            </div>
            <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl p-8 text-center transition border border-gray-100 hover:border-brand-200">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-brand-100 transition">
                <span className="text-3xl">ðŸ’°</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3"><FormattedMessage id="guest.paymentTracking" defaultMessage="Payment Tracking" /></h3>
              <p className="text-gray-500"><FormattedMessage id="guest.paymentTrackingDesc" defaultMessage="Integrated Razorpay payments with automatic rent collection" /></p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-gradient-to-r from-brand-600 to-brand-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-extrabold mb-1">100%</div>
                <div className="text-brand-200 text-sm">Data Isolation</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-1">âˆž</div>
                <div className="text-brand-200 text-sm">Organizations</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-1">24/7</div>
                <div className="text-brand-200 text-sm">Availability</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-1">Free</div>
                <div className="text-brand-200 text-sm">To Get Started</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="bg-gradient-to-br from-dark-800 to-brand-950 rounded-3xl p-12 text-center text-white">
            <h3 className="text-3xl font-bold mb-4"><FormattedMessage id="guest.startManaging" defaultMessage="Start managing your PG today" /></h3>
            <p className="text-gray-300 mb-8 text-lg">Get your own dedicated database. Zero setup fees.</p>
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              <Link to="/onboarding" className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-10 rounded-xl transition shadow-lg shadow-brand-500/30">
                <FormattedMessage id="guest.registerBusiness" defaultMessage="Register Your Business" />
              </Link>
              <Link to="/login" className="border-2 border-white/30 text-white hover:bg-white/10 font-bold py-3 px-10 rounded-xl transition">
                <FormattedMessage id="auth.login" defaultMessage="Login" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-dark-900 text-gray-400 py-8">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-8 w-8" />
              <span className="text-white font-bold text-lg">RoomiPilot</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} RoomiPilot. All rights reserved.</p>
          </div>
        </footer>
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
          <h2 className="text-2xl font-bold text-brand-600 mb-4 pb-2 border-b-2 border-brand-500">ðŸ¢ <FormattedMessage id="guest.buildings" defaultMessage="Buildings" /></h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {buildings.length > 0 ? (
              buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => fetchRooms(b.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    selectedBuilding === b.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 hover:bg-brand-50 text-gray-800'
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
          <h2 className="text-2xl font-bold text-brand-600 mb-4 pb-2 border-b-2 border-brand-500">ðŸšª <FormattedMessage id="guest.rooms" defaultMessage="Rooms" /></h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedBuilding ? (
              rooms.length > 0 ? (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => fetchVacancies(r.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedRoom === r.id
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 hover:bg-brand-50 text-gray-800'
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
          <h2 className="text-2xl font-bold text-brand-600 mb-4 pb-2 border-b-2 border-brand-500">ðŸ›ï¸ <FormattedMessage id="guest.vacantBeds" defaultMessage="Vacant Beds" /></h2>
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
      <div className="mt-12 bg-brand-50 rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4"><FormattedMessage id="guest.readyToBook" defaultMessage="Ready to book?" /></h3>
        <Link
          to="/login"
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-lg transition inline-block"
        >
          <FormattedMessage id="guest.signInToBook" defaultMessage="Sign In to Book Now" />
        </Link>
      </div>
    </div>
  );
};

export default GuestView;