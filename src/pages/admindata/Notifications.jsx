import React, { useEffect, useState } from 'react';
import { sendBroadcastNotification, sendTargetedNotification, getNotifications } from '../../services/adminService';
import { t } from '../../lib/i18n';

const Notifications = () => {
  const [message, setMessage] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const handleBroadcast = async () => {
    if (!message) return;
    await sendBroadcastNotification({ title: t('Announcement'), body: message });
    setMessage('');
  };

  const handleTargeted = async () => {
    if (!message || !targetUid) return;
    await sendTargetedNotification(targetUid, { title: t('Message'), body: message });
    setMessage('');
    setTargetUid('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
        <h3 className="font-semibold text-gray-900">{t('Notifications')}</h3>
        <div className="flex items-center space-x-2">
          <input className="border rounded-md px-3 py-2 flex-1" placeholder={t('Type a message')} value={message} onChange={e => setMessage(e.target.value)} />
          <button className="text-blue-700 hover:underline" onClick={handleBroadcast}>{t('Broadcast')}</button>
        </div>
        <div className="flex items-center space-x-2">
          <input className="border rounded-md px-3 py-2" placeholder={t('Target UID')} value={targetUid} onChange={e => setTargetUid(e.target.value)} />
          <button className="text-blue-700 hover:underline" onClick={handleTargeted}>{t('Send Targeted')}</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900">{t('Recent Notifications')}</h4>
        <ul className="mt-2 text-sm text-gray-700">
          {notifications.map(n => (
            <li key={n.id} className="border-t py-2">
              <span className="font-medium">{n.title}:</span> {n.body}
            </li>
          ))}
          {notifications.length === 0 && <li className="py-2 text-gray-500">{t('No recent notifications.')}</li>}
        </ul>
      </div>
    </div>
  );
};

export default Notifications;