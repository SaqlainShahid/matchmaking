import { useState, useRef, useEffect } from 'react';
import { countryCodes } from './countryCodes';
import { getCountryISO } from './getCountryISO';
import { useNavigate } from 'react-router-dom';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { createRequest, updateRequest, getRequestById } from '../services/ordergiverservices/orderGiverService';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Building2, Clock, MapPin, Calendar, Upload, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { Modal } from "./ui/modal";
import { sendNotification } from '../services/notificationService';
import { getMatchingProviders } from '../services/userService';
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { t } from '../lib/i18n';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for enterprise
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const serviceCategories = [
  {
    category: t('Main Trades'),
    services: [
      { value: 'plomberie_chauffage', label: 'Plomberie & Chauffage' },
      { value: 'electricite_domotique', label: 'Électricité & Domotique' },
      { value: 'menuiserie_amenagement', label: 'Menuiserie & Aménagement' },
      { value: 'maconnerie_gros_oeuvre', label: 'Maçonnerie & Gros Œuvre' },
      { value: 'peinture_finitions', label: 'Peinture & Finitions' },
      { value: 'sols_revetements', label: 'Sols & Revêtements' },
      { value: 'chauffage_ventilation_climatisation', label: 'Chauffage, Ventilation & Climatisation' },
      { value: 'serrurerie_securite', label: 'Serrurerie & Sécurité' },
      { value: 'toiture_couverture', label: 'Toiture & Couverture' },
      { value: 'jardin_exterieur', label: 'Jardin & Extérieur' },
      { value: 'renovation_energetique_isolation', label: 'Rénovation Énergétique & Isolation' },
      { value: 'services_complementaires_coordination', label: 'Services Complémentaires & Coordination' }
    ]
  }
];

const priorityLevels = [
  {
    value: 'urgence_depannage',
    label: t('Urgence / Dépannage'),
    description: t('Intervention dans les 24 heures'),
    color: 'text-red-600 bg-red-50 border-red-200',
    sla: t('24 heures')
  },
  {
    value: 'urgent_sur_devis',
    label: t('Urgent sur devis'),
    description: t('Intervention planifiée dans la semaine'),
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    sla: t('Dans la semaine')
  },
  {
    value: 'travaux_importants',
    label: t('Travaux plus importants'),
    description: t('Nécessite une demande de devis préalable'),
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    sla: t('Selon devis')
  },
];

export default function EnterpriseRequestForm({ initialData = null, requestId = null }) {
    // --- Country dropdown state for phone input ---
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    // Close dropdown on outside click
    useEffect(() => {
      if (!showCountryDropdown) return;
      const handler = (e) => {
        if (!e.target.closest('.country-dropdown-root')) setShowCountryDropdown(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [showCountryDropdown]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceType: '',
    priority: 'urgent_sur_devis',
    location: '',
    scheduledDate: '',
    budget: '',
    contactPerson: '',
    contactPhone: '',
    contactCountryCode: '+33',
  });
  
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const fileInputRef = useRef(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(initialData || requestId);

  // Load initial data when editing
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (initialData) {
          const data = initialData;
          setFormData({
            title: data.title || '',
            description: data.description || '',
            serviceType: data.serviceType || '',
            priority: data.priority || 'urgent_sur_devis',
            location: data.location?.address || data.location || '',
            // costCenter removed
            scheduledDate: data.scheduledDate || '',
            budget: data.budget ? String(data.budget) : '',
            contactPerson: data.contact?.person || '',
            contactPhone: data.contact?.phone || '',
          });
          // When editing an existing request, show the Location & Contact step so that contact fields are visible for edits
          setCurrentStep(2);
          setFiles((data.files || []).map((url) => ({ id: url, name: url, preview: '', progress: 100, url })));
        } else if (requestId) {
          const req = await getRequestById(requestId);
          if (!mounted) return;
          setFormData({
            title: req.title || '',
            description: req.description || '',
            serviceType: req.serviceType || '',
            priority: req.priority || 'urgent_sur_devis',
            location: req.location?.address || req.location || '',
            // costCenter removed
            scheduledDate: req.scheduledDate || '',
            budget: req.budget ? String(req.budget) : '',
            contactPerson: req.contact?.person || '',
            contactPhone: req.contact?.phone || '',
          });
          // When editing an existing request, show the Location & Contact step so that contact fields are visible for edits
          setCurrentStep(2);
          setFiles((req.files || []).map((url) => ({ id: url, name: url, preview: '', progress: 100, url })));
        }
      } catch (err) {
        console.error('Failed to load request for editing:', err);
      }
    };
    if (isEditing) load();
    return () => { mounted = false; };
  }, [initialData, requestId, isEditing]);

  const validateStep = (step) => {
    const errors = {};
    
    if (step === 1) {
      if (!formData.title.trim()) errors.title = t('Project title is required');
      if (!formData.serviceType) errors.serviceType = t('Please select a service type');
      if (!formData.description.trim()) {
        errors.description = t('Please provide a detailed description');
      } else if (formData.description.trim().length < 30) {
        errors.description = t('Description should be at least 30 characters for proper assessment');
      }
      
    }

    if (step === 2) {
      if (!formData.location) errors.location = t('Service location is required');
      if (!formData.contactPerson) errors.contactPerson = t('Contact person is required');
      if (!formData.contactPhone) {
        errors.contactPhone = t('Contact phone is required');
      } else {
        // Validate phone: use min/max for selected country
        const selectedCountry = countryCodes.find(c => c.code === formData.contactCountryCode);
        const cleaned = formData.contactPhone.replace(/[^0-9]/g, '');
        if (selectedCountry) {
          if (cleaned.length < selectedCountry.min || cleaned.length > selectedCountry.max) {
            errors.contactPhone = t(`Phone number must be between ${selectedCountry.min} and ${selectedCountry.max} digits for ${selectedCountry.name}`);
          }
        } else {
          if (cleaned.length < 6 || cleaned.length > 15) {
            errors.contactPhone = t('Invalid phone number format');
          }
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactPhone') {
      // Prevent entering more digits than allowed for selected country
      const selectedCountry = countryCodes.find(c => c.code === formData.contactCountryCode);
      let cleaned = value.replace(/[^0-9]/g, '');
      if (selectedCountry && cleaned.length > selectedCountry.max) {
        cleaned = cleaned.slice(0, selectedCountry.max);
      }
      setFormData(prev => ({ ...prev, contactPhone: cleaned }));
    } else if (name === 'contactCountryCode') {
      setFormData(prev => ({ ...prev, contactCountryCode: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files).map(file => ({
      id: uuidv4(),
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      progress: 0,
      fileObj: file,
      ...file
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setFiles(files.filter(f => f.id !== id));
  };

  const uploadFile = async (file) => {
    try {
      const url = await uploadToCloudinary(file.fileObj || file, {
        folder: `requests/${currentUser?.uid || 'anonymous'}`,
        onProgress: (percent) => {
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: percent } : f));
        }
      });
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: 100 } : f));
      return url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, error: error.message || t('Upload failed'), progress: 0 } : f));
      throw error;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload all files
      const uploadPromises = files
        .filter(file => !file.error && file.progress < 100)
        .map(file => uploadFile(file));
      
      const fileUrls = await Promise.all(uploadPromises);
      
      // Build a single normalized request document in the `requests` collection.
      // Preserve enterprise fields inside the document for compatibility with existing dashboards.
      const requestPayload = {
        title: formData.title,
        description: formData.description,
        serviceType: formData.serviceType,
        priority: formData.priority,
        // costCenter removed
        budget: formData.budget ? parseFloat(formData.budget) : null,
        currency: 'EUR',
        // location as a normalized object
        location: { address: formData.location },
        contact: {
          person: formData.contactPerson,
          phone: `${formData.contactCountryCode} ${formData.contactPhone}`.trim(),
          email: currentUser.email,
        },
        files: fileUrls,
      };

      // Create the request using central service helper so all dashboards stay consistent
      if (isEditing) {
        const targetId = requestId || (initialData && initialData.id);
        const updated = await updateRequest(targetId, requestPayload);
        try {
          await sendNotification(currentUser.uid, 'REQUEST_UPDATED', {
            requestId: updated.id,
            requestTitle: formData.title || t('Service Request')
          });
        } catch (notifyErr) {
          console.warn('Request updated, but notification failed:', notifyErr);
        }
        setSubmittedRequest({ id: updated.id, title: formData.title });
        setShowSuccessModal(true);
      } else {
        const newRequest = await createRequest(currentUser.uid, requestPayload);

        // Fire-and-forget: notify current user about request creation
        try {
          await sendNotification(currentUser.uid, 'REQUEST_CREATED', {
            requestId: newRequest.id,
            requestTitle: formData.title || t('Service Request')
          });
        } catch (notifyErr) {
          console.warn('Request created, but notification failed:', notifyErr);
        }

        // Broadcast to all providers (not just matching service type)
        try {
          const providers = await getServiceProviders();
          const notifyId = newRequest.id;

          toast({
            title: t('Providers Found'),
            description: `${providers.length} ${t('providers will see this request.')}`,
            duration: 4000
          });

          if (providers.length === 0) {
            console.warn('No providers found for broadcast');
          }

          await Promise.all(
            providers.map((p) =>
              sendNotification(p.id, 'NEW_REQUEST_AVAILABLE', {
                requestId: notifyId,
                requestTitle: formData.title || t('Service Request'),
                serviceType: formData.serviceType
              }).catch((err) => {
                console.warn('Failed sending provider notification to', p.id, err);
              })
            )
          );
        } catch (err) {
          console.warn('Provider broadcast failed:', err);
        }

        setSubmittedRequest({ id: newRequest.id, title: formData.title });
        setShowSuccessModal(true);
      }
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: t('Submission Failed'),
        description: error.message || t('An error occurred while submitting your request. Please try again.'),
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { number: 1, label: t('Project Details') },
        { number: 2, label: t('Location & Contact') },
        { number: 3, label: t('Attachments') }
      ].map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                currentStep === step.number 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : currentStep > step.number 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
              }`}
            >
              {currentStep > step.number ? <CheckIcon className="h-5 w-5" /> : step.number}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              currentStep === step.number ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
          {index < 2 && (
            <div className={`w-24 h-0.5 mx-4 transition-colors duration-300 ${
              currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
            }`}></div>
          )}
        </div>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">{t('Service Title *')}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder={t('Brief description of the service needed')}
                      className={`pl-10 h-11 ${formErrors.title ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    />
                  </div>
                  {formErrors.title && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.title}
                    </p>
                  )}
                </div>

                
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceType" className="text-sm font-semibold">{t('Service Type *')}</Label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={(e) => handleSelectChange('serviceType', e.target.value)}
                    className={`border rounded-lg p-3 w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 ${
                      formErrors.serviceType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="" disabled>{t('Select Service Type')}</option>
                    {serviceCategories.map(category => (
                      <optgroup key={category.category} label={category.category}>
                        {category.services.map(service => (
                          <option key={service.value} value={service.value}>
                            {service.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {formErrors.serviceType && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.serviceType}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-sm font-semibold">{t('Estimated Budget (Optional)')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{t('$')}</span>
                    <Input
                      id="budget"
                      name="budget"
                      type="number"
                      value={formData.budget}
                      onChange={handleInputChange}
                      placeholder={t('0.00')}
                      className="pl-8 h-11 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="description" className="text-sm font-semibold">{t('Service Description *')}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('Please provide detailed information about the service you need, including specific requirements, scope of work, and any relevant details...')}
                rows={5}
                className={`focus:ring-blue-500 ${formErrors.description ? 'border-red-500' : ''}`}
              />
              {formErrors.description ? (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {formErrors.description}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('Minimum 30 characters. Provide enough detail for service providers to understand your needs.')}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold">{t('Priority Level')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {priorityLevels.map((level) => (
                  <div 
                    key={level.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      formData.priority === level.value 
                        ? level.color
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectChange('priority', level.value)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{level.label}</p>
                        <p className="text-xs text-gray-600 mt-1">{level.description}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {t('SLA')}: {level.sla}
                        </Badge>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-2 ${
                        formData.priority === level.value 
                          ? 'border-current bg-current' 
                          : 'border-gray-300'
                      }`}>
                        {formData.priority === level.value && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {t('Service Location')}
                  </h4>
                  <p className="text-sm text-blue-700">{t('Specify where the service needs to be performed')}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-semibold">{t('Service Address *')}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="location"
                        name="location"
                        type="text"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder={t('Enter full service address')}
                        className={`pl-10 h-11 ${formErrors.location ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      />
                    </div>
                    {formErrors.location && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.location}
                      </p>
                    )}
                  </div>

                  {/* Cost Center removed */}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {t('Contact Information')}
                  </h4>
                  <p className="text-sm text-green-700">{t('Primary contact for this service request')}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-sm font-semibold">{t('Contact Person *')}</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      placeholder={t('Full name of primary contact')}
                      className={`h-11 ${formErrors.contactPerson ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    />
                    {formErrors.contactPerson && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.contactPerson}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-sm font-semibold">{t('Contact Phone *')}</Label>
                    <div className="flex items-center gap-2 country-dropdown-root">
                      {/* Custom searchable dropdown for country codes */}
                      <div className="relative" style={{ minWidth: 180 }}>
                        <button
                          type="button"
                          className="h-11 border border-gray-300 rounded-md px-3 bg-white text-base w-full flex items-center justify-between font-medium focus:outline-none"
                          onClick={() => setShowCountryDropdown(v => !v)}
                          style={{ minWidth: 180 }}
                        >
                          <span className="flex items-center gap-2">
                            {(() => {
                              const iso = getCountryISO(formData.contactCountryCode);
                              return iso ? (
                                <img src={`https://flagcdn.com/24x18/${iso}.png`} alt="flag" style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', border: '1px solid #eee' }} />
                              ) : null;
                            })()}
                            <span style={{ fontWeight: 600 }}>{countryCodes.find(c => c.code === formData.contactCountryCode)?.name}</span>
                            <span className="text-gray-500">{countryCodes.find(c => c.code === formData.contactCountryCode)?.code}</span>
                          </span>
                          <span className="ml-2">▼</span>
                        </button>
                        {showCountryDropdown && (
                          <div className="absolute z-20 bg-white border border-gray-300 rounded-md mt-1 w-full max-h-60 overflow-y-auto shadow-lg" style={{ minWidth: 220 }}>
                            <input
                              type="text"
                              className="w-full p-2 border-b border-gray-200 focus:outline-none"
                              placeholder="Search country..."
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              autoFocus
                            />
                            {countryCodes.filter(c =>
                              c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                              c.code.includes(countrySearch)
                            ).map(c => (
                              <div
                                key={c.code}
                                className="px-2 py-2 hover:bg-blue-100 cursor-pointer flex items-center gap-2"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, contactCountryCode: c.code }));
                                  setShowCountryDropdown(false);
                                  setCountrySearch('');
                                }}
                              >
                                {(() => {
                                  const iso = getCountryISO(c.code);
                                  return iso ? (
                                    <img src={`https://flagcdn.com/24x18/${iso}.png`} alt="flag" style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', border: '1px solid #eee' }} />
                                  ) : null;
                                })()}
                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                <span className="text-gray-500">{c.code}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.contactCountryCode}
                        onChange={e => setFormData(prev => ({ ...prev, contactCountryCode: e.target.value }))}
                        className="h-11 px-2 text-lg w-20 text-center font-semibold text-gray-700 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:outline-none"
                        style={{ minWidth: 60, maxWidth: 80 }}
                        aria-label="Country code"
                      />
                      <Input
                        id="contactPhone"
                        name="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        placeholder={
                          countryCodes.find(c => c.code === formData.contactCountryCode)
                            ? t(`e.g. ${countryCodes.find(c => c.code === formData.contactCountryCode).example}`)
                            : t('e.g. 612345678')
                        }
                        className={`h-11 border border-gray-300 rounded-md bg-white flex-1 ${formErrors.contactPhone ? 'ring-2 ring-red-500' : ''}`}
                        style={{ minHeight: 44 }}
                        autoComplete="tel"
                      />
                    </div>
                    {formErrors.contactPhone && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.contactPhone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate" className="text-sm font-semibold">{t('Preferred Service Date (Optional)')}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="scheduledDate"
                        name="scheduledDate"
                        type="datetime-local"
                        value={formData.scheduledDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().slice(0, 16)}
                        className="pl-10 h-11 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {t('Supporting Documentation')}
              </h4>
              <p className="text-sm text-gray-600">
                {t('Upload relevant documents, photos, or specifications to help service providers understand your requirements better.')}
                {t('Maximum file size: 10MB per file.')}
              </p>
            </div>

            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-all duration-200 bg-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{t('Upload Supporting Files')}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('Drag and drop files here or click to browse')}
                  </p>
              <p className="text-xs text-gray-400 mt-2">
                {t('Supports: Images (Cloudinary), PDF/Docs as links')}
              </p>
                </div>
                <Button type="button" variant="outline" className="mt-4 border-blue-600 text-blue-600 hover:bg-blue-50">
                  {t('Select Files')}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">{t('Selected Files')} ({files.length})</h4>
                <div className="space-y-3">
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt="Preview" 
                              className="h-12 w-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.name}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <span className="text-gray-300">•</span>
                            <p className="text-sm text-gray-500 capitalize">
                              {(file.type && file.type.split ? (file.type.split('/')[1] || file.type) : '')}
                            </p>
                          </div>
                          {file.error && (
                            <p className="text-sm text-red-600 flex items-center mt-1">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {file.error}
                            </p>
                          )}
                          {file.progress > 0 && file.progress < 100 && (
                            <div className="mt-2">
                              <Progress value={file.progress} className="h-2 bg-gray-200" />
                              <p className="text-xs text-gray-500 mt-1">
                                {t('Uploading...')} {Math.round(file.progress)}%
                              </p>
                            </div>
                          )}
                          {file.progress === 100 && (
                              <p className="text-sm text-green-600 flex items-center mt-1">
                              <CheckIcon className="h-4 w-4 mr-1" />
                              {t('Ready for submission')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Simple icon components
  const CheckIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const XIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4 border-b border-gray-200 bg-white">
              <div className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {t('New Service Request')}
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {t('Submit a detailed service request for professional service providers')}
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="pt-8">
              {renderStepIndicator()}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  {renderStepContent()}
                </div>
                
                <div className="flex justify-between items-center pt-8 border-t border-gray-200">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={currentStep === 1 ? () => setShowCancelModal(true) : handlePreviousStep}
                    disabled={isSubmitting}
                    className="px-6 py-2.5"
                  >
                    {currentStep === 1 ? t('Cancel') : t('Back')}
                  </Button>
                  
                  <div className="flex items-center space-x-4">
                    {currentStep < 3 && (
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: t('Draft Saved'),
                            description: t('Your request has been saved as a draft.'),
                          });
                        }}
                        disabled={isSubmitting}
                        className="px-6 py-2.5"
                      >
                        {t('Save Draft')}
                      </Button>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {currentStep === 3 ? t('Submitting...') : t('Processing...')}
                        </>
                      ) : currentStep === 3 ? (
                        t('Submit Request')
                      ) : (
                        t('Continue')
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
            
            <CardFooter className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="text-sm text-gray-600 text-center w-full">
                <p className="font-medium">{t('Professional Service Portal')}</p>
                <p className="mt-1">{t('Your request will be visible to qualified service providers who can submit quotes.')}</p>
                <p className="text-xs mt-2">{t('Request ID will be generated upon submission')} • {t('You can track progress in your dashboard')}</p>
              </div>
            </CardFooter>
          </Card>
          {/* Cancel Confirmation Modal */}
          <Modal
            open={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            title={t('Cancel Request')}
            icon={<XCircle className="h-5 w-5 text-red-600" />}
            footer={(
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                >
                  {t('Keep Editing')}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    setShowCancelModal(false);
                    navigate('/requests');
                  }}
                >
                  {t('Yes, cancel')}
                </Button>
              </>
            )}
          >
            <p className="text-sm text-gray-600">
              {t('Are you sure you want to cancel this request?')}
            </p>
          </Modal>

          {/* Success Modal after submission */}
          <Modal
            open={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            title={t('Request Submitted')}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            footer={(
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowSuccessModal(false)}
                >
                  {t('Close')}
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/requests');
                  }}
                >
                  {t('View Requests')}
                </Button>
                {submittedRequest?.id && (
                  <Button
                    className="bg-gray-900 hover:bg-black text-white"
                    onClick={() => {
                      setShowSuccessModal(false);
                      navigate(`/requests/${submittedRequest.id}`);
                    }}
                  >
                    {t('Open Details')}
                  </Button>
                )}
              </>
            )}
          >
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                {t('Your new request has been created successfully.')}
              </p>
              {submittedRequest?.title && (
                <p className="text-sm text-gray-500">
                  {t('Title:')} <span className="font-medium text-gray-900">{submittedRequest.title}</span>
                </p>
              )}
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}

// Modals
// Cancel confirmation modal
// Success submission modal