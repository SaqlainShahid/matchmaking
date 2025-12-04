import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUserRole, suspendUser, deleteUser, verifyProvider, setUserVerification, deleteUserAndData } from '../../services/adminService';
import { t } from '../../lib/i18n';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const isProviderRole = (role) => ['service_provider', 'provider', 'serviceProvider'].includes(role);
  const normalizeRole = (role) => (role === 'provider' || role === 'serviceProvider') ? 'service_provider' : role;
  const getUserId = (u) => u.uid || u.id;

  const filtered = users.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'provider') return isProviderRole(u.role);
    if (filter === 'pending_approvals') return (isProviderRole(u.role) || u.role === 'order_giver') && (u.verified !== true) && (u.verificationStatus !== 'approved');
    return u.role === filter;
  });

  const handleRoleChange = async (uid, role) => {
    await updateUserRole(uid, role);
  };
  const handleSuspend = async (uid) => { await suspendUser(uid); };
  const handleDelete = async (uid) => { if (window.confirm(t('Delete user?'))) { await deleteUser(uid); setUsers(prev => prev.filter(u => u.uid !== uid)); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">{t('Users')}</h3>
        <select className="border rounded-md px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">{t('All')}</option>
          <option value="order_giver">{t('Order Givers')}</option>
          <option value="provider">{t('Providers')}</option>
          <option value="pending_approvals">{t('Pending Approvals')}</option>
          <option value="admin">{t('Admins')}</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">{t('Name')}</th>
              <th className="text-left px-4 py-2">{t('Email')}</th>
              <th className="text-left px-4 py-2">{t('Role')}</th>
              <th className="text-left px-4 py-2">{t('Verification')}</th>
              <th className="text-left px-4 py-2">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={4}>{t('Loading...')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={4}>{t('No users found.')}</td></tr>
            ) : filtered.map(u => (
              <tr key={u.uid || u.id} className="border-t">
                <td className="px-4 py-2">{u.displayName || '—'}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <select
                    className="border rounded-md px-2 py-1"
                    value={normalizeRole(u.role)}
                    onChange={e => handleRoleChange(getUserId(u), e.target.value)}
                  >
                    <option value="order_giver">{t('Order Giver')}</option>
                    <option value="service_provider">{t('Provider')}</option>
                    <option value="admin">{t('Admin')}</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${u.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {u.verified ? t('Approved') : t('Pending')}
                    </span>
                    {!u.verified && (
                      <>
                        <button className="text-green-700 hover:underline" onClick={async () => {
                          const id = getUserId(u);
                          if (isProviderRole(u.role)) {
                            await verifyProvider(id);
                          } else {
                            await setUserVerification(id, 'approved');
                          }
                          setUsers(prev => prev.map(x => (getUserId(x) === id) ? { ...x, verified: true, verificationStatus: 'approved' } : x));
                        }}>{t('Approve')}</button>
                        <button className="text-red-700 hover:underline" onClick={async () => {
                          if (window.confirm(t('Reject and delete all data for this user?'))) {
                            const id = getUserId(u);
                            await deleteUserAndData(id);
                            setUsers(prev => prev.filter(x => getUserId(x) !== id));
                          }
                        }}>{t('Reject')}</button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 space-x-2">
                  {isProviderRole(u.role) && (
                    <Link className="text-blue-700 hover:underline" to={`/admin/providers/${u.uid}/services`}>
                      {t('View Services')}
                    </Link>
                  )}
                  <button className="text-yellow-700 hover:underline" onClick={() => handleSuspend(u.uid)}>{t('Suspend')}</button>
                  <button className="text-red-700 hover:underline" onClick={() => handleDelete(u.uid)}>{t('Delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
