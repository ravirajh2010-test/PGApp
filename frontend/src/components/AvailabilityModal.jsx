import { useState, useEffect } from 'react';
import api, { getOrganization } from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const StatBox = ({ label, value, colorClass }) => (
  <div className={`rounded-xl p-5 border-2 text-center ${colorClass}`}>
    <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-75">{label}</p>
    <p className="text-4xl font-extrabold">{value}</p>
  </div>
);

const AvailabilityModal = ({ isOpen, onClose, orgSlug }) => {
  const [occupancy, setOccupancy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) fetchOccupancy();
  }, [isOpen]);

  const fetchOccupancy = async () => {
    setLoading(true);
    try {
      const slug = orgSlug || getOrganization()?.slug;
      if (!slug) { setLoading(false); return; }
      const response = await api.get(`/guest/${slug}/occupancy`);
      setOccupancy(response.data);
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    } finally {
      setLoading(false);
    }
  };

  const vacant = (occupancy?.total || 0) - (occupancy?.occupied || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bed Availability">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" className="text-brand-500" />
        </div>
      ) : occupancy ? (
        <div className="space-y-4">
          <StatBox
            label="Total Beds"
            value={occupancy.total || 0}
            colorClass="bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-900/20 dark:border-brand-600 dark:text-brand-300"
          />
          <div className="grid grid-cols-2 gap-4">
            <StatBox
              label="Occupied"
              value={occupancy.occupied || 0}
              colorClass="bg-green-50 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-300"
            />
            <StatBox
              label="Vacant"
              value={vacant}
              colorClass="bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300"
            />
          </div>
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-xl p-4 text-sm text-brand-700 dark:text-brand-300">
            <strong>Note:</strong> {vacant} bed{vacant !== 1 ? 's' : ''} available for immediate occupancy.
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-500 py-8">Unable to load availability data</p>
      )}

      <div className="mt-6">
        <Button variant="primary" fullWidth onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default AvailabilityModal;

