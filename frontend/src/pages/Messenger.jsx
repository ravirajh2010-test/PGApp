import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import api from '../services/api';

const MESSAGE_TEMPLATES = [
  {
    id: 'maintenance',
    labelKey: 'messenger.templateMaintenance',
    defaultLabel: 'Maintenance Notice',
    subjectKey: 'messenger.templateMaintenanceSubject',
    defaultSubject: 'Scheduled Maintenance Notice',
    body: 'Dear Residents,\n\nWe would like to inform you about a scheduled maintenance activity.\n\nDate: [Date]\nTime: [Time]\nArea: [Area]\n\nDuring this period, [describe impact]. We apologize for any inconvenience.\n\nThank you for your cooperation.\n\nRegards,\nManagement'
  },
  {
    id: 'rent_reminder',
    labelKey: 'messenger.templateRentReminder',
    defaultLabel: 'Rent Reminder',
    subjectKey: 'messenger.templateRentReminderSubject',
    defaultSubject: 'Monthly Rent Reminder',
    body: 'Dear Residents,\n\nThis is a friendly reminder that your monthly rent is due.\n\nPlease ensure your payment is completed by [due date]. You can pay online through your tenant portal.\n\nIf you have already made the payment, please ignore this message.\n\nThank you.\n\nRegards,\nManagement'
  },
  {
    id: 'rules',
    labelKey: 'messenger.templateRules',
    defaultLabel: 'Rules & Guidelines',
    subjectKey: 'messenger.templateRulesSubject',
    defaultSubject: 'Important Rules & Guidelines',
    body: 'Dear Residents,\n\nWe would like to remind everyone about the following rules and guidelines:\n\n1. [Rule 1]\n2. [Rule 2]\n3. [Rule 3]\n\nYour cooperation in maintaining a pleasant living environment is highly appreciated.\n\nRegards,\nManagement'
  },
  {
    id: 'event',
    labelKey: 'messenger.templateEvent',
    defaultLabel: 'Event Announcement',
    subjectKey: 'messenger.templateEventSubject',
    defaultSubject: 'Upcoming Event Announcement',
    body: 'Dear Residents,\n\nWe are pleased to announce an upcoming event!\n\nEvent: [Event Name]\nDate: [Date]\nTime: [Time]\nVenue: [Location]\n\nAll residents are welcome to join. Looking forward to seeing you there!\n\nRegards,\nManagement'
  },
  {
    id: 'water_electricity',
    labelKey: 'messenger.templateUtility',
    defaultLabel: 'Water/Electricity Notice',
    subjectKey: 'messenger.templateUtilitySubject',
    defaultSubject: 'Water/Electricity Supply Notice',
    body: 'Dear Residents,\n\nPlease be informed that the [water/electricity] supply will be temporarily interrupted.\n\nDate: [Date]\nTime: [Start Time] to [End Time]\nReason: [Reason]\n\nPlease plan accordingly. We will restore the supply as soon as possible.\n\nRegards,\nManagement'
  },
  {
    id: 'general',
    labelKey: 'messenger.templateGeneral',
    defaultLabel: 'General Announcement',
    subjectKey: 'messenger.templateGeneralSubject',
    defaultSubject: 'Important Announcement',
    body: 'Dear Residents,\n\n[Your message here]\n\nRegards,\nManagement'
  }
];

const Messenger = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  
  const [groups, setGroups] = useState({ buildings: [], rooms: [], floors: [] });
  const [groupType, setGroupType] = useState('all');
  const [groupId, setGroupId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/admin/messenger/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const handleGroupTypeChange = (type) => {
    setGroupType(type);
    setGroupId('');
    setSelectedBuilding('');
  };

  const handleTemplateSelect = (template) => {
    setSubject(intl.formatMessage({ id: template.subjectKey, defaultMessage: template.defaultSubject }));
    setMessage(template.body);
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setError(intl.formatMessage({ id: 'messenger.fillRequired', defaultMessage: 'Please fill in both subject and message' }));
      return;
    }
    if (groupType !== 'all' && !groupId) {
      setError(intl.formatMessage({ id: 'messenger.selectGroup', defaultMessage: 'Please select a group' }));
      return;
    }

    setSending(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/admin/messenger/send', {
        groupType,
        groupId: groupType === 'all' ? null : groupId,
        subject: subject.trim(),
        message: message.trim()
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setSubject('');
    setMessage('');
    setGroupType('all');
    setGroupId('');
    setSelectedBuilding('');
    setResult(null);
    setError('');
  };

  // Get filtered floors for selected building
  const filteredFloors = selectedBuilding
    ? groups.floors.filter(f => String(f.building_id) === String(selectedBuilding))
    : groups.floors;

  // Get filtered rooms for selected building
  const filteredRooms = selectedBuilding
    ? groups.rooms.filter(r => String(r.building_id) === String(selectedBuilding))
    : groups.rooms;

  const getFloorLabel = (floorNumber) => {
    if (floorNumber === 0) return intl.formatMessage({ id: 'dashboard.groundFloor', defaultMessage: 'Ground Floor' });
    if (floorNumber === 1) return intl.formatMessage({ id: 'dashboard.firstFloor', defaultMessage: '1st Floor' });
    if (floorNumber === 2) return intl.formatMessage({ id: 'dashboard.secondFloor', defaultMessage: '2nd Floor' });
    if (floorNumber === 3) return intl.formatMessage({ id: 'dashboard.thirdFloor', defaultMessage: '3rd Floor' });
    return intl.formatMessage({ id: 'dashboard.nthFloor', defaultMessage: '{number}th Floor' }, { number: floorNumber });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            💬 <FormattedMessage id="messenger.title" defaultMessage="Messenger" />
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            <FormattedMessage id="messenger.subtitle" defaultMessage="Send communications to your tenants" />
          </p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="text-brand-600 hover:text-brand-700 font-semibold text-sm shrink-0"
        >
          <FormattedMessage id="messenger.backToDashboard" defaultMessage="← Back to Dashboard" />
        </button>
      </div>

      {/* Group Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          <FormattedMessage id="messenger.selectRecipients" defaultMessage="Select Recipients" />
        </h2>

        {/* Group type buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { type: 'all', labelKey: 'messenger.allTenants', defaultLabel: 'All Tenants', icon: '👥' },
            { type: 'building', labelKey: 'messenger.byBuilding', defaultLabel: 'By Building', icon: '🏢' },
            { type: 'floor', labelKey: 'messenger.byFloor', defaultLabel: 'By Floor', icon: '🏗️' },
            { type: 'room', labelKey: 'messenger.byRoom', defaultLabel: 'By Room', icon: '🚪' }
          ].map(({ type, labelKey, defaultLabel, icon }) => (
            <button
              key={type}
              onClick={() => handleGroupTypeChange(type)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                groupType === type
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {icon} <FormattedMessage id={labelKey} defaultMessage={defaultLabel} />
            </button>
          ))}
        </div>

        {/* Building filter for floor/room */}
        {(groupType === 'floor' || groupType === 'room') && (
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <FormattedMessage id="messenger.filterByBuilding" defaultMessage="Filter by Building" />
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value);
                setGroupId('');
              }}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
            >
              <option value="">
                {intl.formatMessage({ id: 'messenger.allBuildings', defaultMessage: 'All Buildings' })}
              </option>
              {groups.buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Group ID selection */}
        {groupType === 'building' && (
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
          >
            <option value="">
              {intl.formatMessage({ id: 'messenger.selectBuilding', defaultMessage: 'Select a building...' })}
            </option>
            {groups.buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {groupType === 'floor' && (
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
          >
            <option value="">
              {intl.formatMessage({ id: 'messenger.selectFloor', defaultMessage: 'Select a floor...' })}
            </option>
            {filteredFloors.map(f => (
              <option key={`${f.building_id}-${f.floor_number}`} value={`${f.building_id}-${f.floor_number}`}>
                {f.building_name} - {getFloorLabel(f.floor_number)}
              </option>
            ))}
          </select>
        )}

        {groupType === 'room' && (
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
          >
            <option value="">
              {intl.formatMessage({ id: 'messenger.selectRoom', defaultMessage: 'Select a room...' })}
            </option>
            {filteredRooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.building_name} - Room {r.room_number}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Templates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            <FormattedMessage id="messenger.composeMessage" defaultMessage="Compose Message" />
          </h2>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg font-medium transition"
          >
            📋 <FormattedMessage id="messenger.templates" defaultMessage="Templates" />
          </button>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div className="mb-4 bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-sm font-semibold text-purple-800 mb-3">
              <FormattedMessage id="messenger.selectTemplate" defaultMessage="Select a template to get started:" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {MESSAGE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-sm transition"
                >
                  <span className="font-medium text-gray-800">
                    <FormattedMessage id={template.labelKey} defaultMessage={template.defaultLabel} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            <FormattedMessage id="messenger.subject" defaultMessage="Subject" />
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={intl.formatMessage({ id: 'messenger.subjectPlaceholder', defaultMessage: 'Enter email subject...' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Message body */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            <FormattedMessage id="messenger.message" defaultMessage="Message" />
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={intl.formatMessage({ id: 'messenger.messagePlaceholder', defaultMessage: 'Type your message here...' })}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-500 resize-y"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded">
            <p className="text-red-800 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <p className="text-green-800 font-medium">
              ✅ {result.message}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-wait text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            {sending ? (
              <FormattedMessage id="messenger.sending" defaultMessage="Sending..." />
            ) : (
              <>📤 <FormattedMessage id="messenger.send" defaultMessage="Send Message" /></>
            )}
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messenger;
