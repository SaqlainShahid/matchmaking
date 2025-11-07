import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, isAfter, isBefore } from 'date-fns';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Search, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, DollarSign, Calendar, MapPin, User, HardHat, Check, Clock as ClockIcon } from 'lucide-react';
import { Skeleton } from "../../components/ui/skeleton";

const Projects = () => {
  const navigate = useNavigate();
  const { 
    projects, 
    loading, 
    loadProjects, 
    updateProjectStatus,
    getRequestById,
    rateProvider
  } = useOrderGiver();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedProject, setSelectedProject] = useState(null);
  const [requestDetails, setRequestDetails] = useState({});
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Load projects on component mount and when activeTab changes
  useEffect(() => {
    loadProjects(activeTab);
  }, [activeTab]);

  // Load request details when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      const fetchRequestDetails = async () => {
        try {
          const request = await getRequestById(selectedProject.requestId);
          setRequestDetails(request);
        } catch (error) {
          console.error('Error fetching request details:', error);
        }
      };
      fetchRequestDetails();
    }
  }, [selectedProject]);

  // Handle project selection from URL hash
  useEffect(() => {
    if (location.hash) {
      const projectId = location.hash.replace('#', '');
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    } else if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [location.hash, projects]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && (activeTab === 'all' || project.status === activeTab);
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { 
        text: 'In Progress', 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      },
      completed: { 
        text: 'Completed', 
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      },
      cancelled: { 
        text: 'Cancelled', 
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        icon: <XCircle className="h-4 w-4 mr-1" />
      },
      pending: { 
        text: 'Pending', 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      }
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100' };
  };

  const handleMarkComplete = async (e, projectId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to mark this project as completed?')) {
      try {
        await updateProjectStatus(projectId, 'completed');
        await loadProjects(activeTab);
        // Show success message
      } catch (error) {
        console.error('Error completing project:', error);
        // Show error message
      }
    }
  };

  const handleCancelProject = async (e, projectId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to cancel this project?')) {
      try {
        await updateProjectStatus(projectId, 'cancelled');
        await loadProjects(activeTab);
        // Show success message
      } catch (error) {
        console.error('Error cancelling project:', error);
        // Show error message
      }
    }
  };

  const handleViewRequest = (requestId) => {
    navigate(`/requests/${requestId}`);
  };

  const handleMessageProvider = (providerId) => {
    navigate(`/messages?providerId=${providerId}`);
  };

  const handleRateProvider = async (e) => {
    e.stopPropagation();
    if (rating > 0) {
      try {
        await rateProvider(selectedProject.providerId, rating, review, selectedProject.id);
        setShowRatingModal(false);
        setRating(0);
        setReview('');
        await loadProjects(activeTab);
        // Show success message
      } catch (error) {
        console.error('Error rating provider:', error);
        // Show error message
      }
    }
  };

  const getProgressPercentage = (project) => {
    if (typeof project.progress === 'number') {
      return Math.max(0, Math.min(100, project.progress));
    }
    if (project.status === 'completed') return 100;
    if (project.status === 'cancelled') return 0;
    // Calculate progress based on milestones if available
    if (project.milestones && project.milestones.length > 0) {
      const completedMilestones = project.milestones.filter(m => m.completed).length;
      return Math.round((completedMilestones / project.milestones.length) * 100);
    }
    // Default progress based on status
    return project.status === 'pending' ? 10 : 50;
  };

  const isProjectDelayed = (project) => {
    if (!project.dueDate || project.status === 'completed' || project.status === 'cancelled') {
      return false;
    }
    return isAfter(new Date(), project.dueDate.toDate());
  };

  if (loading && projects.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0" style={{ color: 'var(--text-dark)' }}>Projects</h1>
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-[var(--card-white)] border border-[var(--border-gray)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <HardHat className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No {activeTab} projects found</h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'active' 
                    ? 'You don\'t have any active projects at the moment.'
                    : `You don't have any ${activeTab} projects.`}
                </p>
                <div className="mt-4">
                  <Button 
                    onClick={() => navigate('/requests/new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Create a new service request"
                  >
                    Create New Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project List */}
              <div className="lg:col-span-1 space-y-4">
                {filteredProjects.map((project) => {
                  const status = getStatusBadge(project.status);
                  const progress = getProgressPercentage(project);
                  const isDelayed = isProjectDelayed(project);
                  
                  return (
                    <Card 
                      key={project.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        selectedProject?.id === project.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex-1 truncate">
                            {project.title || 'Untitled Project'}
                          </CardTitle>
                          <Badge className={status.className}>
                            {status.icon}
                            {status.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{project.providerName || 'No provider assigned'}</span>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        {project.dueDate && (
                          <div className="mt-3 flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span>
                              Due {format(project.dueDate.toDate(), 'MMM d, yyyy')}
                              {isDelayed && (
                                <span className="ml-2 text-red-500 text-xs font-medium">
                                  (Delayed)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Project Details */}
              <div className="lg:col-span-2">
                {selectedProject ? (
                  <Card className="h-full">
                    <CardHeader className="border-b">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {selectedProject.title || 'Project Details'}
                          </CardTitle>
                          <div className="flex items-center mt-2">
                            <Badge className={getStatusBadge(selectedProject.status).className}>
                              {getStatusBadge(selectedProject.status).icon}
                              {getStatusBadge(selectedProject.status).text}
                            </Badge>
                            {isProjectDelayed(selectedProject) && (
                              <Badge variant="destructive" className="ml-2">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Delayed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3 sm:mt-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewRequest(selectedProject.requestId)}
                            className="mt-2 sm:mt-0"
                          >
                            View Request
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMessageProvider(selectedProject.providerId)}
                            className="mt-2 sm:mt-0"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {/* Project Progress */}
                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">Project Progress</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Completion</span>
                              <span className="font-medium">{getProgressPercentage(selectedProject)}%</span>
                            </div>
                            <Progress value={getProgressPercentage(selectedProject)} className="h-2" />
                            
                            {selectedProject.dueDate && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                <span>
                                  Due {(() => {
                                    const v = selectedProject?.dueDate;
                                    const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                      ? v.toDate()
                                      : (v instanceof Date ? v : null);
                                    return d ? format(d, 'MMMM d, yyyy') : '—';
                                  })()}
                                  {isProjectDelayed(selectedProject) && (
                                    <span className="ml-2 text-red-500 text-xs font-medium">
                                      (Delayed)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {selectedProject.startedAt && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                <span>Started {(() => {
                                  const v = selectedProject?.startedAt;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : '—';
                                })()}</span>
                              </div>
                            )}
                            
                            {selectedProject.completedAt && (
                              <div className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                <span>Completed {(() => {
                                  const v = selectedProject?.completedAt;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : '—';
                                })()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Project Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-500">Service Type</p>
                                <p className="text-sm font-medium">
                                  {selectedProject.serviceType || 'N/A'}
                                </p>
                              </div>
                              {selectedProject.location && (
                                <div>
                                  <p className="text-sm text-gray-500">Location</p>
                                  <p className="text-sm font-medium flex items-center">
                                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                                    {selectedProject.location.address || 'N/A'}
                                  </p>
                                </div>
                              )}
                              {selectedProject.budget && (
                                <div>
                                  <p className="text-sm text-gray-500">Budget</p>
                                  <p className="text-sm font-medium flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                                    ${selectedProject.budget.toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-medium text-gray-900 mb-3">Provider Details</h3>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-500">Provider</p>
                                <p className="text-sm font-medium">
                                  {selectedProject.providerName || 'N/A'}
                                </p>
                              </div>
                              {selectedProject.providerEmail && (
                                <div>
                                  <p className="text-sm text-gray-500">Email</p>
                                  <p className="text-sm font-medium">
                                    {selectedProject.providerEmail}
                                  </p>
                                </div>
                              )}
                              {selectedProject.providerPhone && (
                                <div>
                                  <p className="text-sm text-gray-500">Phone</p>
                                  <p className="text-sm font-medium">
                                    {selectedProject.providerPhone}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Milestones */}
                        {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                          <div>
                            <h3 className="font-medium text-gray-900 mb-3">Project Milestones</h3>
                            <div className="space-y-3">
                              {selectedProject.milestones.map((milestone, index) => (
                                <div 
                                  key={index} 
                                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start">
                                    <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                                      milestone.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {milestone.completed ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <span className="text-xs font-medium">{index + 1}</span>
                                      )}
                                    </div>
                                    <div className="ml-3">
                                      <p className="text-sm font-medium text-gray-900">
                                        {milestone.title}
                                      </p>
                                      <p className="text-sm text-gray-500 mt-1">
                                        {milestone.description}
                                      </p>
                                      {milestone.dueDate && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Due: {format(milestone.dueDate.toDate(), 'MMM d, yyyy')}
                                          {milestone.completedDate && (
                                            <span className="text-green-600 ml-2">
                                              (Completed: {format(milestone.completedDate.toDate(), 'MMM d, yyyy')})
                                            </span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Project Description */}
                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">Project Description</h3>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-gray-700">
                              {selectedProject.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>

                        {/* Attachments */}
                        {selectedProject.attachments && selectedProject.attachments.length > 0 && (
                          <div>
                            <h3 className="font-medium text-gray-900 mb-3">Attachments</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {selectedProject.attachments.map((attachment, index) => (
                                <a 
                                  key={index} 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center">
                                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                      <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="truncate">
                                      <p className="text-sm font-medium truncate">
                                        {attachment.name || `Document ${index + 1}`}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                      </p>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end space-x-3">
                      {selectedProject.status === 'active' && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={(e) => handleCancelProject(e, selectedProject.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Project
                          </Button>
                          <Button 
                            onClick={(e) => handleMarkComplete(e, selectedProject.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </Button>
                        </>
                      )}
                      
                      {selectedProject.status === 'completed' && !selectedProject.providerRated && (
                        <Button 
                          onClick={() => setShowRatingModal(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Rate Provider
                        </Button>
                      )}
                      
                      {selectedProject.status === 'completed' && selectedProject.providerRated && (
                        <div className="w-full">
                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                  You rated this provider {selectedProject.providerRating}/5
                                </h3>
                                {selectedProject.providerReview && (
                                  <p className="mt-1 text-sm text-green-700">
                                    "{selectedProject.providerReview}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center p-12">
                      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <HardHat className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No project selected</h3>
                      <p className="text-sm text-gray-500">
                        Select a project from the list to view details and take action.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Your Experience</h3>
            <p className="text-sm text-gray-500 mb-4">
              How would you rate {selectedProject?.providerName || 'the provider'}'s work?
            </p>
            
            <div className="flex justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} mx-1`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <div className="mb-4">
              <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-1">
                Leave a review (optional)
              </label>
              <textarea
                id="review"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Share your experience working with this provider..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setReview('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRateProvider}
                disabled={rating === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
