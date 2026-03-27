import { useState, useEffect } from 'react';
import api from '../services/api';

const AvailabilityModal = ({ isOpen, onClose }) => {
  const [occupancy, setOccupancy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchOccupancy();
    }
  }, [isOpen]);

  const fetchOccupancy = async () => {
    setLoading(true);
    try {
      const response = await api.get('/guest/occupancy');
      setOccupancy(response.data);
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Bed Availability</h2>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : occupancy ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-2 border-orange-500">
              <p className="text-sm font-semibold text-orange-700 mb-1">TOTAL BEDS</p>
              <p className="text-4xl font-bold text-orange-600">{occupancy.total || 0}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-500">
                <p className="text-sm font-semibold text-green-700 mb-1">OCCUPIED</p>
                <p className="text-3xl font-bold text-green-600">{occupancy.occupied || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-500">
                <p className="text-sm font-semibold text-blue-700 mb-1">VACANT</p>
                <p className="text-3xl font-bold text-blue-600">{(occupancy.total || 0) - (occupancy.occupied || 0)}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Our hostels have {(occupancy.total || 0) - (occupancy.occupied || 0)} beds available for immediate occupancy.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Unable to load availability data</p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AvailabilityModal;
