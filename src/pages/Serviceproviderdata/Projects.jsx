import React, { useState } from 'react';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { t } from '../../lib/i18n';
import { useToast } from '../../components/ui/use-toast';

const Projects = () => {
  const ctx = useProvider();
  const projects = ctx?.projects || [];
  const updateProgress = ctx?.updateProgress || (async () => {});
  const createInvoice = ctx?.createInvoice || (async () => {});
  const uploadPhoto = ctx?.uploadPhoto || (async () => {});
  const addComment = ctx?.addComment || (async () => {});
  const [commentByProject, setCommentByProject] = useState({});
  const [fileByProject, setFileByProject] = useState({});
  const [completeModal, setCompleteModal] = useState({ open: false, projectId: null });
  const [progressDraftByProject, setProgressDraftByProject] = useState({});
  const [activeTab, setActiveTab] = useState('active');
  const toast = useToast()?.toast || (() => {});
  const [invoiceModal, setInvoiceModal] = useState({ open: false, projectId: null, amount: '', note: '' });

  const filteredProjects = activeTab === 'all' ? projects : projects.filter(p => p.status === activeTab);

  const handleUpdate = async (projectId, progress) => {
    try {
      await updateProgress(projectId, progress);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateInvoice = async (projectId) => {
    // Open invoice modal with prefilled amount from project budget
    const proj = projects.find(p => p.id === projectId) || {};
    setInvoiceModal({ open: true, projectId, amount: proj.budget ? String(proj.budget) : '', note: '' });
  };

  const handleConfirmGenerateInvoice = async () => {
    const { projectId, amount, note } = invoiceModal;
    if (!projectId) return;
    try {
      await createInvoice(projectId, { amount, note });
      toast({ title: t('Invoice Generated'), description: t('The invoice has been generated and is available in your Invoices list.') });
    } catch (e) {
      console.error(e);
      toast({ title: t('Invoice Generation Failed'), description: e.message || t('Failed to create invoice.'), variant: 'destructive' });
    } finally {
      setInvoiceModal({ open: false, projectId: null, amount: '', note: '' });
    }
  };

  const handleAddPhoto = async (projectId) => {
    const file = fileByProject[projectId];
    if (!file) return;
    try {
      await uploadPhoto(projectId, file);
      setFileByProject(prev => ({ ...prev, [projectId]: null }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (projectId) => {
    const text = commentByProject[projectId];
    if (!text) return;
    try {
      await addComment(projectId, text);
      setCommentByProject(prev => ({ ...prev, [projectId]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Projects')}</h2>
        <p className="text-gray-600 mt-2">{t('Manage accepted jobs and track progress')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">{t('Active')}</TabsTrigger>
          <TabsTrigger value="completed">{t('Completed')}</TabsTrigger>
          <TabsTrigger value="cancelled">{t('Cancelled')}</TabsTrigger>
          <TabsTrigger value="all">{t('All')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredProjects.length === 0 ? (
            <Card className="border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {activeTab === 'all' ? t('Projects') : `${t(activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} ${t('Projects')}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center text-gray-500">{t('No')} {activeTab === 'all' ? '' : t(activeTab.charAt(0).toUpperCase() + activeTab.slice(1)) + ' '} {t('Projects').toLowerCase()}</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {activeTab === 'all' ? t('Projects') : `${t(activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} ${t('Projects')}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredProjects.map((p) => (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{p.title || t('Project')}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {p.status === 'completed' ? t('Completed') : t(p.status || 'Active')}
                            </Badge>
                            <span className="text-sm text-gray-600">{Math.min(100, p.progress || 0)}% {t('complete')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={progressDraftByProject[p.id] ?? Math.min(100, p.progress || 0)}
                              onChange={(e) => setProgressDraftByProject(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                              className="w-40 accent-blue-600"
                              aria-label={t('Project progress')}
                            />
                            <div className="text-sm text-gray-700 w-12 text-right">
                              {(progressDraftByProject[p.id] ?? Math.min(100, p.progress || 0))}%
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleUpdate(p.id, progressDraftByProject[p.id] ?? Math.min(100, p.progress || 0))}
                          >
                            {t('Save')}
                          </Button>
                          <Button variant="outline" onClick={() => setCompleteModal({ open: true, projectId: p.id })}>{t('Mark Completed')}</Button>
                          <Button onClick={() => handleGenerateInvoice(p.id)}>{t('Generate Invoice')}</Button>
                        </div>
                      </div>
                      <div className="mt-3 h-3 bg-gray-100 rounded overflow-hidden">
                        <div
                          className={`h-3 transition-all duration-300 ${
                            (p.status === 'completed' || (p.progress || 0) === 100)
                              ? 'bg-green-600'
                              : (p.progress || 0) >= 75
                              ? 'bg-blue-600'
                              : (p.progress || 0) >= 50
                              ? 'bg-indigo-600'
                              : (p.progress || 0) >= 25
                              ? 'bg-orange-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(100, p.progress || 0)}%` }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            className="max-w-[180px] text-sm"
                            onChange={(e) => setFileByProject(prev => ({ ...prev, [p.id]: e.target.files?.[0] || null }))}
                          />
                          {fileByProject[p.id]?.name && (
                            <span className="text-xs text-gray-500 truncate max-w-[160px]">{fileByProject[p.id].name}</span>
                          )}
                          <Button variant="outline" disabled={!fileByProject[p.id]} onClick={() => handleAddPhoto(p.id)}>{t('Add Photo')}</Button>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Input
                            placeholder={t('Add a progress comment')}
                            value={commentByProject[p.id] || ''}
                            onChange={(e) => setCommentByProject(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-full md:max-w-md"
                          />
                          <Button variant="outline" disabled={!commentByProject[p.id]} onClick={() => handleAddComment(p.id)}>{t('Add Comment')}</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {completeModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('Confirm Completion')}</h3>
            <p className="text-sm text-gray-700">{t('Please confirm you have completed all agreed-upon work according to the contract terms. Marking as completed will notify the client and finalize this project.')}</p>
            <ul className="text-sm text-gray-600 mt-3 list-disc pl-5">
              <li>{t('All deliverables are provided and verified.')}</li>
              <li>{t('Any remaining issues are documented.')}</li>
              <li>{t('You accept the service terms and warranty policies.')}</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCompleteModal({ open: false, projectId: null })}>{t('Cancel')}</Button>
              <Button onClick={async () => { try { await handleUpdate(completeModal.projectId, 100); } finally { setCompleteModal({ open: false, projectId: null }); }}}>{t('Confirm & Complete')}</Button>
            </div>
          </div>
        </div>
      )}

      {invoiceModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('Generate Invoice')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Amount')}</label>
                <Input value={invoiceModal.amount} onChange={(e) => setInvoiceModal(prev => ({ ...prev, amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Notes (optional)')}</label>
                <Input value={invoiceModal.note} onChange={(e) => setInvoiceModal(prev => ({ ...prev, note: e.target.value }))} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvoiceModal({ open: false, projectId: null, amount: '', note: '' })}>{t('Cancel')}</Button>
              <Button onClick={handleConfirmGenerateInvoice}>{t('Generate Invoice')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;