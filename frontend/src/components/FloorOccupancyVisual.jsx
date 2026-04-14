import { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import api from '../services/api';

const FloorOccupancyVisual = ({ buildings, refreshKey }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredBed, setHoveredBed] = useState(null);
  const intl = useIntl();

  useEffect(() => {
    if (selectedBuilding) {
      fetchFloorData(selectedBuilding);
    } else {
      setFloors([]);
    }
  }, [selectedBuilding, refreshKey]);

  const fetchFloorData = async (buildingId) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/floor-layout-beds?buildingId=${buildingId}`);
      setFloors(res.data);
    } catch (error) {
      console.error('Error fetching floor layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFloorLabel = (floorNumber) => {
    if (floorNumber === 0) return intl.formatMessage({ id: 'dashboard.groundFloor', defaultMessage: 'Ground Floor' });
    if (floorNumber === 1) return intl.formatMessage({ id: 'dashboard.firstFloor', defaultMessage: '1st Floor' });
    if (floorNumber === 2) return intl.formatMessage({ id: 'dashboard.secondFloor', defaultMessage: '2nd Floor' });
    if (floorNumber === 3) return intl.formatMessage({ id: 'dashboard.thirdFloor', defaultMessage: '3rd Floor' });
    return intl.formatMessage({ id: 'dashboard.nthFloor', defaultMessage: '{number}th Floor' }, { number: floorNumber });
  };

  const buildingName = buildings.find(b => b.id === parseInt(selectedBuilding))?.name || '';

  // Calculate totals
  let totalBeds = 0, occupiedBeds = 0;
  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.beds.forEach(bed => {
        totalBeds++;
        if (bed.status === 'occupied') occupiedBeds++;
      });
    });
  });
  const vacantBeds = totalBeds - occupiedBeds;

  if (buildings.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold">
            🏢 <FormattedMessage id="dashboard.floorOccupancy" defaultMessage="Floor-wise Occupancy" />
          </h2>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-4 py-2 rounded-lg text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value="">{intl.formatMessage({ id: 'dashboard.chooseBuilding', defaultMessage: 'Choose a building...' })}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend & Summary - only show when a building is selected */}
      {selectedBuilding && (
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-red-500"></div>
            <span className="text-xs sm:text-sm font-medium text-gray-700"><FormattedMessage id="dashboard.occupiedStatus" defaultMessage="Occupied" /></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-green-500"></div>
            <span className="text-xs sm:text-sm font-medium text-gray-700"><FormattedMessage id="dashboard.vacantStatus" defaultMessage="Vacant" /></span>
          </div>
        </div>
        {totalBeds > 0 && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold">
            <span className="text-gray-600"><FormattedMessage id="dashboard.totalLabel" defaultMessage="Total" />: {totalBeds}</span>
            <span className="text-red-600"><FormattedMessage id="dashboard.occupiedStatus" defaultMessage="Occupied" />: {occupiedBeds}</span>
            <span className="text-green-600"><FormattedMessage id="dashboard.vacantStatus" defaultMessage="Vacant" />: {vacantBeds}</span>
            <span className="text-indigo-600">
              <FormattedMessage id="dashboard.percentFull" defaultMessage="{percent}% Full" values={{ percent: Math.round((occupiedBeds / totalBeds) * 100) }} />
            </span>
          </div>
        )}
      </div>
      )}

      {selectedBuilding && (
      <div className="p-6">
        {loading ? (
          <p className="text-center text-gray-500 py-8"><FormattedMessage id="dashboard.loadingFloorLayout" defaultMessage="Loading floor layout..." /></p>
        ) : floors.length === 0 ? (
          <p className="text-center text-gray-500 py-8"><FormattedMessage id="dashboard.noFloorsFound" defaultMessage="No floors/rooms found for this building." /></p>
        ) : (
          <div className="space-y-6">
            {/* Building visual container */}
            <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-300 relative">
              {/* Building name header */}
              <div className="bg-amber-100 border-2 border-amber-400 rounded-t-lg px-4 py-2 text-center mb-4">
                <span className="font-bold text-amber-800 text-lg">{buildingName}</span>
              </div>

              {/* Floors - rendered top to bottom (highest floor first) */}
              <div className="space-y-4">
                {[...floors].reverse().map((floor) => {
                  const floorOccupied = floor.rooms.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'occupied').length, 0);
                  const floorTotal = floor.rooms.reduce((sum, r) => sum + r.beds.length, 0);

                  return (
                    <div key={floor.floor_number} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                      {/* Floor header */}
                      <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex items-center justify-between">
                        <span className="font-bold text-indigo-800">
                          {getFloorLabel(floor.floor_number)}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          <FormattedMessage id="dashboard.bedsOccupiedCount" defaultMessage="{occupied}/{total} beds occupied" values={{ occupied: floorOccupied, total: floorTotal }} />
                        </span>
                      </div>

                      {/* Rooms in this floor */}
                      <div className="p-3 flex flex-wrap gap-4">
                        {floor.rooms.map((room) => (
                          <div key={room.room_id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 min-w-[140px]">
                            {/* Room label */}
                            <div className="text-center mb-2">
                              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border">
                                <FormattedMessage id="dashboard.roomLabel" defaultMessage="Room {number}" values={{ number: room.room_number }} />
                              </span>
                            </div>

                            {/* Beds grid */}
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {room.beds.length > 0 ? (
                                room.beds.map((bed) => (
                                  <div
                                    key={bed.id}
                                    className="relative"
                                    onMouseEnter={() => setHoveredBed(bed.id)}
                                    onMouseLeave={() => setHoveredBed(null)}
                                  >
                                    {/* Bed icon */}
                                    <div
                                      className={`w-10 h-8 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm border ${
                                        bed.status === 'occupied'
                                          ? 'bg-red-500 border-red-600 text-white hover:bg-red-600 hover:shadow-md'
                                          : 'bg-green-500 border-green-600 text-white hover:bg-green-600 hover:shadow-md'
                                      }`}
                                      title={`${intl.formatMessage({ id: 'dashboard.bedTooltip', defaultMessage: 'Bed {identifier}' }, { identifier: bed.bed_identifier })} - ${bed.status === 'occupied' ? intl.formatMessage({ id: 'dashboard.occupiedStatus' }) : intl.formatMessage({ id: 'dashboard.vacantStatus' })}${bed.tenant_name ? ' (' + bed.tenant_name + ')' : ''}`}
                                    >
                                      <span className="text-xs font-bold">{bed.bed_identifier}</span>
                                    </div>

                                    {/* Tooltip */}
                                    {hoveredBed === bed.id && (
                                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg pointer-events-none">
                                        <div className="font-bold mb-1"><FormattedMessage id="dashboard.bedTooltip" defaultMessage="Bed {identifier}" values={{ identifier: bed.bed_identifier }} /></div>
                                        <div><FormattedMessage id="dashboard.statusColon" defaultMessage="Status" />: <span className={bed.status === 'occupied' ? 'text-red-300' : 'text-green-300'}>{bed.status === 'occupied' ? intl.formatMessage({ id: 'dashboard.occupiedStatus' }) : intl.formatMessage({ id: 'dashboard.vacantStatus' })}</span></div>
                                        {bed.tenant_name && <div><FormattedMessage id="dashboard.tenantColon" defaultMessage="Tenant" />: {bed.tenant_name}</div>}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic"><FormattedMessage id="dashboard.noBeds" defaultMessage="No beds" /></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default FloorOccupancyVisual;
