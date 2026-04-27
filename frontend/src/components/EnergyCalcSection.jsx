import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { BoltIcon, CalculatorIcon, ChatBubbleLeftRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { Button, Card, Badge, Spinner } from './ui';

const monthOptions = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
];

const getFloorLabel = (floorNumber) => {
  const n = Number(floorNumber);
  const floor = Number.isFinite(n) ? n : 0;
  if (floor === 0) return 'Ground Floor';
  if (floor === 1) return '1st Floor';
  if (floor === 2) return '2nd Floor';
  if (floor === 3) return '3rd Floor';
  return `${floor}th Floor`;
};

/** API floorNumber may be 0 for ground — never treat 0 as falsy. */
const effectiveFloor = (room) => {
  const n = Number(room.floorNumber);
  return Number.isFinite(n) ? n : 0;
};

/** Stable key for grouping: real id or sentinel for unassigned building */
const buildingKeyOf = (room) => (room.buildingId != null ? String(room.buildingId) : 'u');

const EnergyCalcSection = ({ currencySymbol = '₹' }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [defaultRate, setDefaultRate] = useState(8);
  const [rooms, setRooms] = useState([]);
  const [drafts, setDrafts] = useState({});

  /** '' = none; 'u' = no building; else building id string */
  const [selBuildingKey, setSelBuildingKey] = useState('');
  /** '' = none; else floor number string */
  const [selFloor, setSelFloor] = useState('');
  /** '' = none; else room id string */
  const [selRoomId, setSelRoomId] = useState('');

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  const buildingOptions = useMemo(() => {
    const map = new Map();
    for (const r of rooms) {
      const key = buildingKeyOf(r);
      const name = r.buildingName || 'Unassigned';
      if (!map.has(key)) map.set(key, { key, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const floorsForBuilding = useMemo(() => {
    if (!selBuildingKey) return [];
    const floors = new Set();
    for (const r of rooms) {
      if (buildingKeyOf(r) === selBuildingKey) {
        floors.add(effectiveFloor(r));
      }
    }
    return Array.from(floors).sort((a, b) => a - b);
  }, [rooms, selBuildingKey]);

  const roomsForFloor = useMemo(() => {
    if (!selBuildingKey || selFloor === '') return [];
    const f = Number(selFloor);
    return rooms
      .filter((r) => buildingKeyOf(r) === selBuildingKey && effectiveFloor(r) === f)
      .slice()
      .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  }, [rooms, selBuildingKey, selFloor]);

  const selectedRoom = useMemo(() => {
    if (!selRoomId) return null;
    const id = Number(selRoomId);
    return rooms.find((r) => r.roomId === id) || null;
  }, [rooms, selRoomId]);

  const fetchRooms = async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await api.get('/admin/energy/rooms');
      const fetchedRooms = res.data?.rooms || [];
      const fetchedRate = Number(res.data?.defaultRate || 8);
      setDefaultRate(fetchedRate);
      setRooms(fetchedRooms);
      setLoadError(null);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const r of fetchedRooms) {
          if (!next[r.roomId]) {
            next[r.roomId] = {
              currentReading: '',
              sharingCount: r.suggestedSharingCount,
              billingMonth: defaultMonth,
              billingYear: defaultYear,
              notify: true,
            };
          }
        }
        return next;
      });
    } catch (err) {
      console.error('[EnergyCalc] fetchRooms error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load rooms';
      setLoadError(msg);
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = (roomId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [roomId]: { ...(prev[roomId] || {}), ...patch },
    }));
  };

  const computePreview = (room) => {
    const draft = drafts[room.roomId] || {};
    const previous = Number(room.lastReading?.currentReading ?? 0);
    const current = Number(draft.currentReading);
    if (Number.isNaN(current) || draft.currentReading === '' || draft.currentReading === undefined) return null;
    const units = Math.max(0, current - previous);
    const rate = Number(defaultRate) || 8;
    const sharing = Math.max(1, Number(draft.sharingCount || room.suggestedSharingCount || 1));
    const total = Number((units * rate).toFixed(2));
    const perPerson = Number((total / sharing).toFixed(2));
    return { previous, current, units, rate, sharing, total, perPerson };
  };

  const handleSaveReading = async (room) => {
    const draft = drafts[room.roomId] || {};
    if (
      draft.currentReading === '' ||
      draft.currentReading === undefined ||
      Number.isNaN(Number(draft.currentReading))
    ) {
      alert('Enter the current meter reading first.');
      return;
    }
    updateDraft(room.roomId, { savingState: 'saving' });
    try {
      const res = await api.post('/admin/energy/readings', {
        roomId: room.roomId,
        currentReading: Number(draft.currentReading),
        sharingCount: Number(draft.sharingCount || room.suggestedSharingCount),
        billingMonth: Number(draft.billingMonth || defaultMonth),
        billingYear: Number(draft.billingYear || defaultYear),
      });
      const reading = res.data?.reading;
      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === room.roomId
            ? {
                ...r,
                lastReading: {
                  id: reading.id,
                  previousReading: reading.previousReading,
                  currentReading: reading.currentReading,
                  unitsConsumed: reading.unitsConsumed,
                  ratePerUnit: reading.ratePerUnit,
                  totalAmount: reading.totalAmount,
                  sharingCount: reading.sharingCount,
                  perPersonAmount: reading.perPersonAmount,
                  billingMonth: reading.billingMonth,
                  billingYear: reading.billingYear,
                  billed: reading.billed,
                },
              }
            : r
        )
      );
      updateDraft(room.roomId, { savingState: 'saved', currentReading: '' });
      setTimeout(() => updateDraft(room.roomId, { savingState: null }), 1500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save reading');
      updateDraft(room.roomId, { savingState: null });
    }
  };

  const handleBillTenants = async (room) => {
    const draft = drafts[room.roomId] || {};
    if (!room.lastReading?.id) {
      alert('Save a reading first.');
      return;
    }
    if (room.lastReading.billed) {
      if (!window.confirm('This reading has already been billed. Bill again only if needed.')) return;
    }
    if (!window.confirm(`Add ${currencySymbol}${room.lastReading.perPersonAmount} to ${room.currentTenants.length} tenant(s) in Room ${room.roomNumber}?`)) {
      return;
    }
    updateDraft(room.roomId, { savingState: 'billing' });
    try {
      const res = await api.post(`/admin/energy/bill-tenants/${room.lastReading.id}`, {
        notify: !!draft.notify,
        status: 'pending',
      });
      const inserted = res.data?.inserted?.length || 0;
      const skipped = res.data?.skipped?.length || 0;
      const whatsappList = res.data?.whatsappMessages || [];
      let summary = `Billed ${inserted} tenant(s).`;
      if (skipped > 0) summary += ` Skipped ${skipped}.`;
      alert(summary);
      whatsappList.forEach((m) => {
        window.open(m.whatsappUrl, '_blank', 'noopener,noreferrer');
      });
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to bill tenants');
      updateDraft(room.roomId, { savingState: null });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-amber-500" />
              <FormattedMessage id="energy.title" defaultMessage="Energy Calculator" />
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <FormattedMessage
                id="energy.subtitle"
                defaultMessage="Choose building, floor, and room. Rate per unit is fixed from Organization Settings ({currencySymbol}{rate})."
                values={{ currencySymbol, rate: defaultRate }}
              />
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchRooms} loading={refreshing} iconLeft={<ArrowPathIcon className="h-4 w-4" />}>
            <FormattedMessage id="common.refresh" defaultMessage="Refresh" />
          </Button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            <FormattedMessage id="energy.firstMonthTitle" defaultMessage="First month (baseline reading)" />
          </p>
          <p className="mt-1.5 leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            <FormattedMessage
              id="energy.firstMonthBody"
              defaultMessage="For a room’s first month, only save the current meter reading as a baseline — consumption and amounts are based on the difference from the previous month. From the second month onward, units and bills are calculated automatically from the last saved reading."
            />
          </p>
        </div>
      </Card>

      {loadError ? (
        <Card className="border border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-center text-sm font-medium text-red-800 dark:text-red-200 py-2">
            <FormattedMessage id="energy.loadFailed" defaultMessage="Could not load Energy Calc data." />
          </p>
          <p className="text-center text-xs text-red-700/90 dark:text-red-300/90 font-mono break-words px-2 pb-2">
            {loadError}
          </p>
          <div className="flex justify-center pb-4">
            <Button variant="secondary" size="sm" onClick={fetchRooms} loading={refreshing}>
              <FormattedMessage id="common.retry" defaultMessage="Retry" />
            </Button>
          </div>
        </Card>
      ) : rooms.length === 0 ? (
        <Card>
          <p className="text-center text-slate-500 dark:text-slate-400 py-6">
            <FormattedMessage id="energy.noRooms" defaultMessage="No rooms found. Create rooms first." />
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  <FormattedMessage id="energy.selectBuilding" defaultMessage="Building" />
                </span>
                <select
                  value={selBuildingKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelBuildingKey(v);
                    setSelFloor('');
                    setSelRoomId('');
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">
                    {intl.formatMessage({ id: 'energy.buildingPlaceholder', defaultMessage: 'Select building…' })}
                  </option>
                  {buildingOptions.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  <FormattedMessage id="energy.selectFloor" defaultMessage="Floor" />
                </span>
                <select
                  value={selFloor}
                  onChange={(e) => {
                    setSelFloor(e.target.value);
                    setSelRoomId('');
                  }}
                  disabled={!selBuildingKey}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                >
                  <option value="">
                    {intl.formatMessage({ id: 'energy.floorPlaceholder', defaultMessage: 'Select floor…' })}
                  </option>
                  {floorsForBuilding.map((f) => (
                    <option key={f} value={String(f)}>
                      {f === 0
                        ? intl.formatMessage({ id: 'energy.floorOptionGround', defaultMessage: 'G — Ground Floor' })
                        : `${f} — ${getFloorLabel(f)}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  <FormattedMessage id="energy.selectRoom" defaultMessage="Room" />
                </span>
                <select
                  value={selRoomId}
                  onChange={(e) => setSelRoomId(e.target.value)}
                  disabled={!selBuildingKey || selFloor === ''}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                >
                  <option value="">
                    {intl.formatMessage({ id: 'energy.roomPlaceholder', defaultMessage: 'Select room…' })}
                  </option>
                  {roomsForFloor.map((r) => (
                    <option key={r.roomId} value={String(r.roomId)}>
                      Room {r.roomNumber}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          {!selectedRoom ? (
            <Card>
              <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                <FormattedMessage
                  id="energy.pickRoomHint"
                  defaultMessage="Select a building, floor, and room to enter meter readings."
                />
              </p>
            </Card>
          ) : (
            (() => {
              const room = selectedRoom;
              const draft = drafts[room.roomId] || {};
              const preview = computePreview(room);
              const hasReading = !!room.lastReading;
              const isBilled = !!room.lastReading?.billed;
              return (
                <Card key={room.roomId}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                    <div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {room.buildingName || 'Unassigned'} · {getFloorLabel(room.floorNumber)} ·{' '}
                        <FormattedMessage id="energy.roomLabel" defaultMessage="Room {n}" values={{ n: room.roomNumber }} />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <FormattedMessage
                          id="energy.tenantsCount"
                          defaultMessage="{count, plural, =0 {No tenants} one {1 tenant} other {# tenants}}"
                          values={{ count: room.currentTenants.length }}
                        />
                        {' · '}
                        <FormattedMessage id="energy.capacity" defaultMessage="Capacity {n}" values={{ n: room.capacity }} />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isBilled && <Badge variant="success">Billed</Badge>}
                      {!isBilled && hasReading && <Badge variant="info">Draft</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        <FormattedMessage id="energy.previousReading" defaultMessage="Previous reading" />
                      </div>
                      <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {hasReading ? Number(room.lastReading.currentReading).toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        <FormattedMessage id="energy.rateFromOrg" defaultMessage="Rate / unit (organization)" />
                      </div>
                      <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                        {currencySymbol}
                        {Number(defaultRate).toFixed(2)}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        <FormattedMessage id="energy.rateFromOrgHint" defaultMessage="Change in Organization Settings." />
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        <FormattedMessage id="energy.lastShareLine" defaultMessage="Last saved share" />
                      </div>
                      <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {hasReading
                          ? `${currencySymbol}${Number(room.lastReading.perPersonAmount).toFixed(2)} × ${room.lastReading.sharingCount}`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        <FormattedMessage id="energy.currentReading" defaultMessage="Current reading" />
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={draft.currentReading ?? ''}
                        placeholder="e.g. 1240"
                        onChange={(e) => updateDraft(room.roomId, { currentReading: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        <FormattedMessage id="energy.sharingCount" defaultMessage="Sharing" />
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="1"
                        value={draft.sharingCount ?? room.suggestedSharingCount}
                        onChange={(e) => updateDraft(room.roomId, { sharingCount: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        <FormattedMessage id="energy.month" defaultMessage="Month" />
                      </span>
                      <select
                        value={draft.billingMonth ?? defaultMonth}
                        onChange={(e) => updateDraft(room.roomId, { billingMonth: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        {monthOptions.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        <FormattedMessage id="energy.year" defaultMessage="Year" />
                      </span>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        step="1"
                        value={draft.billingYear ?? defaultYear}
                        onChange={(e) => updateDraft(room.roomId, { billingYear: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                  </div>

                  {preview != null && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3 text-sm space-y-1 mt-4">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">
                          <FormattedMessage id="energy.unitsConsumed" defaultMessage="Units consumed" />
                        </span>
                        <span className="font-semibold">{preview.units.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">
                          <FormattedMessage id="energy.totalBill" defaultMessage="Total bill" />
                        </span>
                        <span className="font-semibold">
                          {currencySymbol}
                          {preview.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">
                          <FormattedMessage id="energy.perPerson" defaultMessage="Per person ({n})" values={{ n: preview.sharing }} />
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {currencySymbol}
                          {preview.perPerson.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-4">
                    <input
                      type="checkbox"
                      checked={!!draft.notify}
                      onChange={(e) => updateDraft(room.roomId, { notify: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <FormattedMessage id="energy.notifyWhatsapp" defaultMessage="Open WhatsApp links after billing" />
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSaveReading(room)}
                      loading={draft.savingState === 'saving'}
                      iconLeft={<CalculatorIcon className="h-4 w-4" />}
                      fullWidth
                    >
                      {draft.savingState === 'saved' ? (
                        <FormattedMessage id="energy.saved" defaultMessage="Saved" />
                      ) : (
                        <FormattedMessage id="energy.saveReading" defaultMessage="Save Reading" />
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!hasReading || room.currentTenants.length === 0}
                      onClick={() => handleBillTenants(room)}
                      loading={draft.savingState === 'billing'}
                      iconLeft={<BoltIcon className="h-4 w-4" />}
                      fullWidth
                    >
                      <FormattedMessage id="energy.billTenants" defaultMessage="Bill Tenants" />
                    </Button>
                  </div>
                </Card>
              );
            })()
          )}
        </>
      )}
    </div>
  );
};

export default EnergyCalcSection;
