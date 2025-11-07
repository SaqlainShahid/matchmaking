import React, { useEffect, useState } from 'react';
import { getPlatformConfig, updatePlatformConfig } from '../../services/adminService';

const Config = () => {
  const [config, setConfig] = useState({ maintenanceMode: false, categories: [], minRates: {}, templates: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformConfig().then(c => { setConfig(c || { maintenanceMode: false, categories: [], minRates: {}, templates: {} }); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    await updatePlatformConfig(config);
    alert('Configuration saved');
  };

  const addCategory = () => setConfig(prev => ({ ...prev, categories: [...(prev.categories || []), 'New Category'] }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">Platform Configuration</h3>
        <p className="text-sm text-gray-600">Manage categories, rates, templates, and maintenance mode.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={config.maintenanceMode || false} onChange={e => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))} />
          <span className="text-sm text-gray-700">Maintenance Mode</span>
        </label>

        <div>
          <h4 className="font-medium text-gray-900">Service Categories</h4>
          <ul className="mt-2 text-sm">
            {(config.categories || []).map((c, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <input className="border rounded-md px-2 py-1" value={c} onChange={e => setConfig(prev => ({ ...prev, categories: prev.categories.map((x, i) => i === idx ? e.target.value : x) }))} />
                <button className="text-red-700 hover:underline" onClick={() => setConfig(prev => ({ ...prev, categories: prev.categories.filter((_, i) => i !== idx) }))}>Remove</button>
              </li>
            ))}
          </ul>
          <button className="text-blue-700 hover:underline mt-2" onClick={addCategory}>Add Category</button>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Notification Templates</h4>
          <textarea className="border rounded-md w-full px-3 py-2 text-sm" rows={4} placeholder="JSON templates" value={JSON.stringify(config.templates || {}, null, 2)} onChange={e => { try { const obj = JSON.parse(e.target.value); setConfig(prev => ({ ...prev, templates: obj })); } catch { /* ignore parse errors */ } }} />
        </div>

        <div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default Config;