export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'client' | 'contractor';
  rating: number;
  created_at: string;
  contractor_profile?: ContractorProfile;
}

export interface ContractorProfile {
  user_id: string;
  bio?: string;
  categories: string;
  has_own_tools: boolean;
  is_verified: boolean;
  completed_tasks_count: number;
}

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  urgency: 'today' | 'week' | 'flexible';
  location: { lat: number; lng: number };
  address_name: string;
  status: 'open' | 'in_progress' | 'in-progress' | 'completed' | 'cancelled';
  assigned_contractor_id?: string;
  assigned_contractor?: User;
  created_at: string;
  client?: User;
  proposals?: TaskProposal[];
}

export interface TaskProposal {
  id: string;
  task_id: string;
  contractor_id: string;
  offered_price: number;
  eta_minutes: number;
  cover_letter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  contractor?: User;
}

export interface ChatMessage {
  id: string;
  task_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
}

export interface EscrowTransaction {
  id: string;
  task_id: string;
  amount: number;
  fee_amount: number;
  status: 'hold' | 'released' | 'refunded';
  hold_at: string;
  released_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'client' | 'contractor';
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  urgency: 'today' | 'week' | 'flexible';
  latitude: number;
  longitude: number;
  address_name: string;
}

export interface CreateProposalRequest {
  offered_price: number;
  eta_minutes: number;
  cover_letter?: string;
}