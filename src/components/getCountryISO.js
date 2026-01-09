// Utility to get ISO country code from phone code for flag rendering
export const getCountryISO = (code) => {
  // Map phone code to ISO country code (for flag rendering)
  const map = {
    '+44': 'gb', '+33': 'fr', '+49': 'de', '+91': 'in', '+61': 'au', '+81': 'jp', '+86': 'cn', '+971': 'ae', '+92': 'pk', '+34': 'es', '+39': 'it', '+7': 'ru', '+90': 'tr', '+966': 'sa', '+20': 'eg', '+212': 'ma', '+234': 'ng', '+351': 'pt', '+380': 'ua', '+82': 'kr', '+62': 'id', '+84': 'vn', '+55': 'br', '+27': 'za', '+63': 'ph', '+64': 'nz', '+48': 'pl', '+358': 'fi', '+46': 'se', '+31': 'nl', '+41': 'ch', '+43': 'at', '+420': 'cz', '+36': 'hu', '+47': 'no', '+45': 'dk', '+52': 'mx', '+998': 'uz'
  };
  return map[code] || '';
};
