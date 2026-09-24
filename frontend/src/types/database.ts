export type HostingPreference = 'host' | 'visit' | 'both';
export type MealSlot = 'brunch' | 'lunch' | 'dinner';
export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type MealStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled';

export type Profile = {
  id: string;
  full_name: string;
  age: number;
  ethnicity: string | null;
  has_kids: boolean;
  num_kids: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Couple = {
  id: string;
  partner_1_id: string;
  partner_2_id: string | null;
  couple_name: string | null;
  bio: string | null;
  zip_code: string;
  location: unknown;
  hosting_preference: HostingPreference;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type PendingPartner = {
  id: string;
  couple_id: string;
  full_name: string;
  age: number;
  has_kids: boolean;
  num_kids: number;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
};

export type Availability = {
  id: string;
  couple_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  time_slot: MealSlot;
  recurring: boolean;
  created_at: string;
};

export type JoinRequest = {
  id: string;
  requester_couple_id: string;
  host_couple_id: string;
  meal_type: MealSlot;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
};

export type Conversation = {
  id: string;
  couple_1_id: string;
  couple_2_id: string;
  created_at: string;
  last_message_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

export type Meal = {
  id: string;
  conversation_id: string;
  host_couple_id: string;
  guest_couple_id: string;
  meal_type: MealSlot;
  scheduled_at: string;
  status: MealStatus;
  created_at: string;
  updated_at: string;
};

export type DiscoveryCouple = {
  id: string;
  couple_name: string | null;
  bio: string | null;
  hosting_preference: HostingPreference;
  has_kids: boolean;
  num_kids: number;
  distance_miles: number;
};
