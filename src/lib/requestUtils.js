export const normalizeRequest = (r = {}) => {
  if (!r) return r;
  const title = r.title || r.titre || r.description || '';
  const description = r.description || r.desc || '';
  const status = r.status || r.statut || null;
  const serviceType = r.serviceType || r.typeService || null;
  const budget = (typeof r.budget === 'number') ? r.budget : (typeof r.prix === 'number' ? r.prix : null);
  const files = r.files || r.attachments || r.fichiers || [];
  const location = r.location || (r.localisation ? { address: r.localisation } : {});
  const createdByName = r.createdByName || r.entrepriseNom || r.createdBy || null;
  const priority = r.priority || r.priorite || null;

  return {
    ...r,
    title,
    description,
    status,
    serviceType,
    budget,
    files,
    location,
    createdByName,
    priority
  };
};