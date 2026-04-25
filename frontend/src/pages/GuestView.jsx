import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { BuildingOffice2Icon, HomeModernIcon, UsersIcon, CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';
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
      <div className="-mx-4 -mt-5">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-dark-900 via-dark-800 to-brand-950 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-brand-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-600 rounded-full blur-3xl"></div>
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-20">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
                  <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-12 w-12" />
                  <span className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Roomi<span className="text-brand-400">Pilot</span>
                  </span>
                </div>
                <h1 className="mb-4 text-3xl font-bold leading-tight md:text-5xl">
                  <FormattedMessage id="guest.tagline" defaultMessage="The smartest way to manage your PG & Hostel business" />
                </h1>
                <p className="mb-6 max-w-lg text-base text-gray-300 md:text-lg">
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
                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-400/20 to-brand-600/20 p-6 backdrop-blur-sm">
                    <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-36 w-36 drop-shadow-2xl" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <BuildingOffice2Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <LockClosedIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-14">
          <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">Everything you need to manage your PG</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Powerful tools designed for hostel & PG operators</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="group border border-slate-100 bg-white p-6 text-center transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover dark:border-slate-600 dark:bg-dark-700 dark:hover:border-brand-600 rounded-2xl shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 transition group-hover:bg-brand-100 dark:bg-brand-900/20 dark:group-hover:bg-brand-900/30">
                <HomeModernIcon className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3"><FormattedMessage id="guest.propertyMgmt" defaultMessage="Property Management" /></h3>
              <p className="text-slate-500 dark:text-slate-400"><FormattedMessage id="guest.propertyMgmtDesc" defaultMessage="Manage buildings, rooms, and beds with real-time occupancy tracking" /></p>
            </div>
            <div className="group border border-slate-100 bg-white p-6 text-center transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover dark:border-slate-600 dark:bg-dark-700 dark:hover:border-brand-600 rounded-2xl shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 transition group-hover:bg-brand-100 dark:bg-brand-900/20 dark:group-hover:bg-brand-900/30">
                <UsersIcon className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3"><FormattedMessage id="guest.tenantMgmt" defaultMessage="Tenant Management" /></h3>
              <p className="text-slate-500 dark:text-slate-400"><FormattedMessage id="guest.tenantMgmtDesc" defaultMessage="Onboard tenants, track stays, and manage check-ins/check-outs" /></p>
            </div>
            <div className="group border border-slate-100 bg-white p-6 text-center transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover dark:border-slate-600 dark:bg-dark-700 dark:hover:border-brand-600 rounded-2xl shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 transition group-hover:bg-brand-100 dark:bg-brand-900/20 dark:group-hover:bg-brand-900/30">
                <CreditCardIcon className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3"><FormattedMessage id="guest.paymentTracking" defaultMessage="Payment Tracking" /></h3>
              <p className="text-slate-500 dark:text-slate-400"><FormattedMessage id="guest.paymentTrackingDesc" defaultMessage="Integrated Razorpay payments with automatic rent collection" /></p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-gradient-to-r from-brand-600 to-brand-800 py-12 text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div>
                <div className="text-4xl font-extrabold mb-1">100%</div>
                <div className="text-brand-200 text-sm">Data Isolation</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-1">∞</div>
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
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-14">
          <div className="rounded-3xl bg-gradient-to-br from-dark-800 to-brand-950 p-8 text-center text-white md:p-10">
            <h3 className="text-3xl font-bold mb-4"><FormattedMessage id="guest.startManaging" defaultMessage="Start managing your PG today" /></h3>
            <p className="mb-6 text-base text-gray-300 md:text-lg">Get your own dedicated database. Zero setup fees.</p>
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
    <div className="rounded-xl bg-gradient-to-b from-white to-slate-50 p-5 dark:from-dark-700 dark:to-slate-900 sm:p-6">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          <FormattedMessage id="guest.welcomeTo" defaultMessage="Welcome to" /> {orgInfo?.name || orgSlug}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400"><FormattedMessage id="guest.findAccommodation" defaultMessage="Find your perfect accommodation" /></p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Buildings Section */}
<div className="bg-white dark:bg-dark-700 rounded-xl shadow-card p-5 border border-slate-100 dark:border-slate-600">
          <h2 className="text-2xl font-bold text-brand-600 dark:text-brand-400 mb-4 pb-2 border-b-2 border-brand-500 flex items-center gap-2">
            <BuildingOffice2Icon className="w-6 h-6" />
            <FormattedMessage id="guest.buildings" defaultMessage="Buildings" />
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {buildings.length > 0 ? (
              buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => fetchRooms(b.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                    selectedBuilding === b.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {b.name}
                </button>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4"><FormattedMessage id="guest.noBuildingsAvailable" defaultMessage="No buildings available" /></p>
            )}
          </div>
        </div>

        {/* Rooms Section */}
<div className="bg-white dark:bg-dark-700 rounded-xl shadow-card p-5 border border-slate-100 dark:border-slate-600">
          <h2 className="text-2xl font-bold text-brand-600 dark:text-brand-400 mb-4 pb-2 border-b-2 border-brand-500">
            <FormattedMessage id="guest.rooms" defaultMessage="Rooms" />
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedBuilding ? (
              rooms.length > 0 ? (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => fetchVacancies(r.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                      selectedRoom === r.id
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    Room {r.room_number} (Capacity: {r.capacity})
                  </button>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4"><FormattedMessage id="guest.noRoomsAvailable" defaultMessage="No rooms available" /></p>
              )
            ) : (
              <p className="text-slate-400 text-center py-4"><FormattedMessage id="guest.selectBuilding" defaultMessage="Select a building" /></p>
            )}
          </div>
        </div>

        {/* Vacant Beds Section */}
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-card p-5 border border-slate-100 dark:border-slate-600">
          <h2 className="text-2xl font-bold text-brand-600 dark:text-brand-400 mb-4 pb-2 border-b-2 border-brand-500">
            <FormattedMessage id="guest.vacantBeds" defaultMessage="Vacant Beds" />
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedRoom ? (
              vacancies.length > 0 ? (
                vacancies.map((b) => (
                  <div key={b.id} className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-lg">
                    <p className="font-semibold text-green-700 dark:text-green-400">Bed {b.id}</p>
                    <p className="text-sm text-green-600 dark:text-green-500">Status: {b.status}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4"><FormattedMessage id="guest.noVacantBeds" defaultMessage="No vacant beds" /></p>
              )
            ) : (
              <p className="text-slate-400 text-center py-4"><FormattedMessage id="guest.selectRoom" defaultMessage="Select a room" /></p>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-700 dark:bg-brand-900/20">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4"><FormattedMessage id="guest.readyToBook" defaultMessage="Ready to book?" /></h3>
        <Link
          to="/login"
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-xl transition-colors inline-block"
        >
          <FormattedMessage id="guest.signInToBook" defaultMessage="Sign In to Book Now" />
        </Link>
      </div>
    </div>
  );
};

export default GuestView;