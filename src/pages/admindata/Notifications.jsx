import React, { useEffect, useState } from 'react';
import { sendBroadcastNotification, sendTargetedNotification, getNotifications } from '../../services/adminService';

const Notifications = () => {
  const [message, setMessage] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const handleBroadcast = async () => {
    if (!message) return;
    await sendBroadcastNotification({ title: 'Announcement', body: message });
    setMessage('');
  };

  const handleTargeted = async () => {
    if (!message || !targetUid) return;
    await sendTargetedNotification(targetUid, { title: 'Message', body: message });
    setMessage('');
    setTargetUid('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          <input className="border rounded-md px-3 py-2 flex-1" placeholder="Type message" value={message} onChange={e => setMessage(e.target.value)} />
          <button className="text-blue-700 hover:underline" onClick={handleBroadcast}>Broadcast</button>
        </div>
        <div className="flex items-center space-x-2">
          <input className="border rounded-md px-3 py-2" placeholder="Target UID" value={targetUid} onChange={e => setTargetUid(e.target.value)} />
          <button className="text-blue-700 hover:underline" onClick={handleTargeted}>Send Targeted</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900">Recent Notifications</h4>
        <ul className="mt-2 text-sm text-gray-700">
          {notifications.map(n => (
            <li key={n.id} className="border-t py-2">
              <span className="font-medium">{n.title}:</span> {n.body}
            </li>
          ))}
          {notifications.length === 0 && <li className="py-2 text-gray-500">No recent notifications.</li>}
        </ul>
      </div>
    </div>
  );
};

export default Notifications;