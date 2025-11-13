import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceProviders } from '../../services/userService';
import { getOrCreateConversation } from '../../services/messageService';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { FiUsers, FiMessageSquare, FiEye, FiMapPin, FiTag, FiSearch } from 'react-icons/fi';

const Providers = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getServiceProviders();
        setProviders(list || []);
      } catch (e) {
        console.error('Failed to load providers:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => {
      const name = (p.displayName || p.companyName || '').toLowerCase();
      const type = (p.serviceType || '').toLowerCase();
      const area = (p.serviceArea || p.city || '').toLowerCase();
      return (
        name.includes(q) || type.includes(q) || area.includes(q)
      );
    });
  }, [search, providers]);

  const handleViewServices = (providerId) => {
    navigate(`/providers/${providerId}/services`);
  };

  const handleMessage = async (providerId) => {
    try {
      // Ensure a conversation exists, then navigate
      await getOrCreateConversation(providerId).catch(() => {});
      navigate(`/messages?providerId=${providerId}`);
    } catch (e) {
      console.error('Could not open conversation:', e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FiUsers className="text-gray-700" />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-dark)' }}>Service Providers</h1>
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search providers by name, type, or area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading providers…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">No providers found</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const name = p.displayName || p.companyName || 'Unnamed Provider';
            const initials = String(name).charAt(0).toUpperCase();
            const area = p.serviceArea || p.city || '';
            const type = p.serviceType || (Array.isArray(p.services) ? p.services.join(', ') : '');
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center">
                    <span className="font-semibold">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{name}</CardTitle>
                    <div className="text-xs text-gray-500 truncate">{p.companyName || p.displayName}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {type && (
                    <div className="flex items-center text-sm text-gray-700">
                      <FiTag className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{type}</span>
                    </div>
                  )}
                  {area && (
                    <div className="flex items-center text-sm text-gray-700">
                      <FiMapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{area}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="secondary" className="text-xs">Role: {(p.role || 'provider').replace('_', ' ')}</Badge>
                    {p.verified && <Badge className="text-xs">Verified</Badge>}
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Button onClick={() => handleViewServices(p.id)}>
                      <FiEye className="h-4 w-4 mr-1" /> View Services
                    </Button>
                    <Button variant="outline" onClick={() => handleMessage(p.id)}>
                      <FiMessageSquare className="h-4 w-4 mr-1" /> Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Providers;