import React, { useEffect, useState } from 'react';
import { auth } from '../../firebaseConfig';
import { getCurrentUserProfile, updateUserProfile as updateUserProfileService } from '../../services/userService.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { t } from '../../lib/i18n';

const Settings = () => {
  const [form, setForm] = useState({
    displayName: '',
    phoneNumber: '',
    companyName: '',
    photoURL: '',
    preferences: {
      sidebarCollapsedDefault: false,
      notificationsEnabled: true
    }
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      const profile = await getCurrentUserProfile();
      setForm(prev => ({
        ...prev,
        displayName: user?.displayName || profile?.displayName || '',
        phoneNumber: user?.phoneNumber || profile?.phoneNumber || '',
        companyName: profile?.companyName || '',
        photoURL: user?.photoURL || profile?.photoURL || '',
        preferences: {
          sidebarCollapsedDefault: profile?.preferences?.sidebarCollapsedDefault ?? false,
          notificationsEnabled: profile?.preferences?.notificationsEnabled ?? true
        }
      }));
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePrefChange = (e) => {
    const { name, checked } = e.target;
    setForm(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [name]: checked }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfileService({
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        photoURL: form.photoURL,
        companyName: form.companyName,
        preferences: form.preferences
      });
      setMessage({ type: 'success', text: t('Settings updated successfully.') });
    } catch (err) {
      setMessage({ type: 'error', text: t('Failed to update settings.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>{t('Settings')}</h1>

      {message && (
        <div className={`mb-4 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle style={{ color: 'var(--text-dark)' }}>{t('Profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">{t('Display Name')}</label>
                <Input name="displayName" value={form.displayName} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm text-gray-600">{t('Phone Number')}</label>
                <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm text-gray-600">{t('Company Name')}</label>
                <Input name="companyName" value={form.companyName} onChange={handleChange} />
              </div>
              <div>
                <label className="text-sm text-gray-600">{t('Photo URL')}</label>
                <Input name="photoURL" value={form.photoURL} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle style={{ color: 'var(--text-dark)' }}>{t('Dashboard Preferences')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input type="checkbox" name="sidebarCollapsedDefault" checked={form.preferences.sidebarCollapsedDefault} onChange={handlePrefChange} />
                <span>{t('Start with collapsed sidebar')}</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input type="checkbox" name="notificationsEnabled" checked={form.preferences.notificationsEnabled} onChange={handlePrefChange} />
                <span>{t('Enable notifications')}</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? t('Saving...') : t('Save Changes')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;