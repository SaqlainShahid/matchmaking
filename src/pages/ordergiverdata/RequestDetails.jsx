import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { isImageUrl, thumbnailUrl } from "../../services/cloudinaryService";
import { Button } from "../../components/ui/button";
import { t } from '../../lib/i18n';
import { normalizeRequest } from '../../lib/requestUtils';

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRequestById, loading } = useOrderGiver();
  const [request, setRequest] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchRequest = async () => {
      try {
        const data = await getRequestById(id);
        if (mounted) setRequest(normalizeRequest(data));
      } catch (error) {
        console.error('Failed to load request:', error);
      }
    };
    fetchRequest();
    return () => { mounted = false; };
  }, [id, getRequestById]);

  const formatDate = (d) => {
    try {
      if (!d) return '';
      const dateObj = typeof d.toDate === 'function' ? d.toDate() : new Date(d);
      return dateObj.toLocaleString();
    } catch {
      return '';
    }
  };

  if (loading && !request) {
    return <div className="p-6">{t('Loading')}</div>;
  }

  if (!request) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-6">
            <p className="text-gray-600">{t('Request not found.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attachments = request.files || request.attachments || request.fichiers || [];
  const currentStatus = request.status || request.statut || 'N/A';

  function statusLabel(value) {
    switch (value) {
      case 'en_attente': return 'En attente';
      case 'approuvée': return 'Approuvée';
      case 'rejetée': return 'Rejetée';
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return value || '—';
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">{t('Request Details')}</h1>
        <Button variant="outline" onClick={() => navigate('/requests')}>{t('Back to Requests')}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{request.title || t('Untitled Request')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{t('Status')}</p>
              <p className="text-gray-800">{statusLabel(currentStatus)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('Description')}</p>
              <p className="text-gray-800">{request.description || 'No description'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('Created')}</p>
              <p className="text-gray-800">{formatDate(request.createdAt)}</p>
            </div>
            {attachments.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">{t('Attachments')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group border rounded-md p-2 flex items-center gap-3 hover:bg-gray-50"
                    >
                      {isImageUrl(url) ? (
                        <img
                          src={thumbnailUrl(url, { width: 120, height: 90 })}
                          alt={`Attachment ${idx + 1}`}
                          className="h-16 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-20 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs">
                          {t('DOC')}
                        </div>
                      )}
                      <span className="text-blue-600 truncate group-hover:underline">{t('Attachment')} {idx + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div id="quotes" className="pt-2">
              <Button onClick={() => navigate('/quotes')}>{t('View Quotes')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestDetails;