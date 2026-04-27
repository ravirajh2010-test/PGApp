import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { ChatBubbleLeftRightIcon, UsersIcon, BuildingOffice2Icon, Squares2X2Icon, HomeIcon, PaperAirplaneIcon, ClipboardDocumentListIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { Button, Card, Input } from '../components/ui';

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
  const [channel, setChannel] = useState('email');
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
    if (!message.trim()) {
      setError(intl.formatMessage({ id: 'messenger.fillMessageRequired', defaultMessage: 'Please enter a message' }));
      return;
    }
    if (channel === 'email' && !subject.trim()) {
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
        channel,
        subject: subject.trim(),
        message: message.trim()
      });
      setResult(res.data);
      if (channel === 'whatsapp' && Array.isArray(res.data?.whatsappLinks) && res.data.whatsappLinks.length > 0) {
        res.data.whatsappLinks.forEach((entry) => {
          if (entry.whatsappUrl) {
            window.open(entry.whatsappUrl, '_blank', 'noopener,noreferrer');
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setSubject('');
    setMessage('');
    setChannel('email');
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-brand-500" />
            <FormattedMessage id="messenger.title" defaultMessage="Messenger" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
            <FormattedMessage id="messenger.subtitle" defaultMessage="Send communications to your tenants" />
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/admin')} className="shrink-0">
          <FormattedMessage id="messenger.backToDashboard" defaultMessage="← Back to Dashboard" />
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
      {/* Group Selection */}
      <Card>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
          <FormattedMessage id="messenger.selectRecipients" defaultMessage="Select Recipients" />
        </h2>

        {/* Group type buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { type: 'all', labelKey: 'messenger.allTenants', defaultLabel: 'All Tenants', Icon: UsersIcon },
            { type: 'building', labelKey: 'messenger.byBuilding', defaultLabel: 'By Building', Icon: BuildingOffice2Icon },
            { type: 'floor', labelKey: 'messenger.byFloor', defaultLabel: 'By Floor', Icon: Squares2X2Icon },
            { type: 'room', labelKey: 'messenger.byRoom', defaultLabel: 'By Room', Icon: HomeIcon }
          ].map(({ type, labelKey, defaultLabel, Icon }) => (
            <button
              key={type}
              onClick={() => handleGroupTypeChange(type)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
                groupType === type
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <FormattedMessage id={labelKey} defaultMessage={defaultLabel} />
            </button>
          ))}
        </div>

        {/* Building filter for floor/room */}
        {(groupType === 'floor' || groupType === 'room') && (
          <div className="mb-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <FormattedMessage id="messenger.filterByBuilding" defaultMessage="Filter by Building" />
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value);
                setGroupId('');
              }}
              className="w-full max-w-md px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            className="w-full max-w-md px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            className="w-full max-w-md px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            className="w-full max-w-md px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
      </Card>

      {/* Templates */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            <FormattedMessage id="messenger.composeMessage" defaultMessage="Compose Message" />
          </h2>
          <Button
            variant="outline"
            size="sm"
            iconLeft={<ClipboardDocumentListIcon className="w-4 h-4" />}
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <FormattedMessage id="messenger.templates" defaultMessage="Templates" />
          </Button>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div className="mb-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg p-4 border border-brand-200 dark:border-brand-700">
            <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-3">
              <FormattedMessage id="messenger.selectTemplate" defaultMessage="Select a template to get started:" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {MESSAGE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left p-3 bg-white dark:bg-slate-800 rounded-lg border border-brand-200 dark:border-brand-700 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition-colors"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    <FormattedMessage id={template.labelKey} defaultMessage={template.defaultLabel} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delivery channel */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <FormattedMessage id="messenger.channel" defaultMessage="Delivery Channel" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                channel === 'email'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <FormattedMessage id="messenger.channelEmail" defaultMessage="Email" />
            </button>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                channel === 'whatsapp'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <FormattedMessage id="messenger.channelWhatsapp" defaultMessage="WhatsApp" />
            </button>
          </div>
          {channel === 'whatsapp' && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <FormattedMessage
                id="messenger.whatsappHint"
                defaultMessage="WhatsApp links will open for tenants with valid phone numbers. Messages are not auto-sent by server."
              />
            </p>
          )}
        </div>

        {/* Subject */}
        <div className="mb-4">
          <Input
            label={intl.formatMessage({ id: 'messenger.subject', defaultMessage: 'Subject' })}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={
              channel === 'whatsapp'
                ? intl.formatMessage({ id: 'messenger.subjectOptionalPlaceholder', defaultMessage: 'Optional title for WhatsApp message...' })
                : intl.formatMessage({ id: 'messenger.subjectPlaceholder', defaultMessage: 'Enter email subject...' })
            }
          />
        </div>

        {/* Message body */}
        <div className="mb-4">
          <Input
            as="textarea"
            label={intl.formatMessage({ id: 'messenger.message', defaultMessage: 'Message' })}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={intl.formatMessage({ id: 'messenger.messagePlaceholder', defaultMessage: 'Type your message here...' })}
            rows={10}
            className="resize-y"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 rounded">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="mb-4 flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-3 rounded">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-green-800 dark:text-green-300 font-medium">{result.message}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sending}
            iconLeft={<PaperAirplaneIcon className="w-4 h-4" />}
          >
            <FormattedMessage id="messenger.send" defaultMessage="Send Message" />
          </Button>
          <Button variant="secondary" onClick={handleCancel}>
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default Messenger;
