import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebaseConfig';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import { createService, getProviderServices, updateService, deleteServiceById, publishService, unpublishService } from '../../services/providerservices/serviceCatalogService';
import { uploadProviderFile } from '../../services/providerservices/providerService';
import { CheckCircle2 } from 'lucide-react';
import { t } from '../../lib/i18n';

const Services = () => {
  const providerId = auth.currentUser?.uid || '';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    currency: 'USD',
    status: 'draft',
    images: [],
    tags: ''
  });

  const load = async () => {
    if (!providerId) return;
    setLoading(true);
    const list = await getProviderServices(providerId);
    setServices(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [providerId]);

  const resetForm = () => {
    setForm({ title: '', category: '', description: '', price: '', currency: 'USD', status: 'draft', images: [], tags: '' });
    setFiles([]);
  };

  const startCreate = () => { resetForm(); setSelected(null); setShowCreate(true); };
  const startEdit = (svc) => {
    setSelected(svc);
    setForm({
      title: svc.title || '',
      category: svc.category || '',
      description: svc.description || '',
      price: String(svc.price || ''),
      currency: svc.currency || 'USD',
      status: svc.status || 'draft',
      images: Array.isArray(svc.images) ? svc.images : [],
      tags: (Array.isArray(svc.tags) ? svc.tags.join(', ') : '')
    });
    setShowEdit(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    let uploaded = [];
    if (files.length) {
      uploaded = await Promise.all(files.map(f => uploadProviderFile(f, `service_images/${providerId}`)));
    }
    const payload = {
      ...form,
      providerId,
      ownerId: providerId,
      price: Number(form.price || 0),
      images: [...form.images, ...uploaded.map(u => u.url)],
      tags: String(form.tags || '').split(',').map(t => t.trim()).filter(Boolean)
    };
    const created = await createService(providerId, payload);
    setSuccessInfo({ title: created.title, status: created.status });
    setSuccessOpen(true);
    setShowCreate(false);
    await load();
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    let uploaded = [];
    if (files.length) {
      uploaded = await Promise.all(files.map(f => uploadProviderFile(f, `service_images/${providerId}`)));
    }
    const updates = {
      ...form,
      providerId,
      ownerId: providerId,
      price: Number(form.price || 0),
      images: [...(form.images || []), ...uploaded.map(u => u.url)],
      tags: String(form.tags || '').split(',').map(t => t.trim()).filter(Boolean)
    };
    const updated = await updateService(selected.id, updates);
    setSuccessInfo({ title: updated.title, status: updated.status });
    setSuccessOpen(true);
    setShowEdit(false);
    await load();
  };

  const handleDelete = async (svcId) => {
    if (!window.confirm(t('Delete this service? This action cannot be undone.'))) return;
    await deleteServiceById(svcId);
    await load();
  };

  const togglePublish = async (svc) => {
    if (svc.status === 'published') {
      await unpublishService(svc.id);
    } else {
      await publishService(svc.id);
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Your Services')}</h2>
        <p className="text-gray-600 mt-2">{t('Publish and manage your service offerings.')}</p>
        <div className="mt-4">
          <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">{t('New Service')}</Button>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">{t('Published & Draft Services')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600">{t('Loading...')}</div>
          ) : services.length === 0 ? (
            <div className="text-sm text-gray-600">{t('No services yet. Click "New Service" to add one.')}</div>
          ) : (
            <div className="divide-y">
              {services.map(svc => (
                <div key={svc.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{svc.title}</div>
                    <div className="text-sm text-gray-600">{svc.category} • {svc.currency}{svc.price}</div>
                    <div className="text-xs text-gray-500">{svc.status === 'published' ? t('Published') : t('Draft')}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => startEdit(svc)}>{t('Edit')}</Button>
                    <Button variant="outline" onClick={() => togglePublish(svc)}>
                      {svc.status === 'published' ? t('Unpublish') : t('Publish')}
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(svc.id)}>{t('Delete')}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('Create Service')}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
            <Button type="submit" form="svc-create-form">{t('Save')}</Button>
          </>
        )}
      >
        <form id="svc-create-form" onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Title')}</label>
              <input className="border rounded-md p-2 w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Category')}</label>
              <input className="border rounded-md p-2 w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Price')}</label>
              <input className="border rounded-md p-2 w-full" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Currency')}</label>
              <select className="border rounded-md p-2 w-full" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Description')}</label>
              <textarea className="border rounded-md p-2 w-full" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Images')}</label>
              <input className="border rounded-md p-2 w-full text-sm" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Tags (comma-separated)')}</label>
              <input className="border rounded-md p-2 w-full" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Status')}</label>
              <select className="border rounded-md p-2 w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="draft">{t('Draft')}</option>
                <option value="published">{t('Published')}</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={t('Edit Service')}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowEdit(false)}>{t('Cancel')}</Button>
            <Button type="submit" form="svc-edit-form">{t('Save Changes')}</Button>
          </>
        )}
      >
        <form id="svc-edit-form" onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Title')}</label>
              <input className="border rounded-md p-2 w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Category')}</label>
              <input className="border rounded-md p-2 w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Price')}</label>
              <input className="border rounded-md p-2 w-full" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Currency')}</label>
              <select className="border rounded-md p-2 w-full" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Description')}</label>
              <textarea className="border rounded-md p-2 w-full" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Add Images')}</label>
              <input className="border rounded-md p-2 w-full text-sm" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">{t('Tags (comma-separated)')}</label>
              <input className="border rounded-md p-2 w-full" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('Status')}</label>
              <select className="border rounded-md p-2 w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="draft">{t('Draft')}</option>
                <option value="published">{t('Published')}</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t('Service Saved')}
        icon={<CheckCircle2 className="text-emerald-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setSuccessOpen(false)}>{t('Close')}</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">{t('Your service has been saved.')}</p>
          {successInfo && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Title')}</span>
                <span className="font-medium text-gray-900">{successInfo.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Status')}</span>
                <span className="text-gray-900">{successInfo.status}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Services;