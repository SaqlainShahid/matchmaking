export type UserRole = 'order_giver' | 'service_provider' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  serviceType?: string;
  phoneNumber?: string;
  companyName?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type RequestStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  serviceType: string;
  status: RequestStatus;
  urgency: UrgencyLevel;
  createdBy: string; // User ID
  assignedTo?: string; // Provider User ID
  location?: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  attachments: string[]; // Array of file URLs
  responses: number;
  scheduledDate?: Date;
  completedDate?: Date;
  cancelledDate?: Date;
  cancellationReason?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action?: {
    type: string;
    url: string;
    label: string;
  };
  data?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Quote {
  id: string;
  requestId: string;
  providerId: string;
  amount: number;
  currency: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  estimatedCompletionTime?: string; // e.g., "3-5 business days"
  warrantyInfo?: string;
  termsAndConditions?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  requestId: string;
  providerId: string;
  orderGiverId: string;
  rating: number; // 1-5
  comment: string;
  response?: string;
  createdAt: Date;
  updatedAt: Date;
}
