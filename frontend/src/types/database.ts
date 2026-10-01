export type HostingPreference = 'host' | 'visit' | 'both';
export type MealSlot = 'brunch' | 'lunch' | 'dinner';
export type RequestStatus = 'pending' | 'accepted' | 'declined';


export type Profile = {
  id: string;
  full_name: string;
  age: number;
  avatar_url: string | null; // storage path in the avatars bucket, e.g. `<uid>/avatar.png`
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
  city: string | null;
  state: string | null;
  country: string | null;
  hosting_preference: HostingPreference;
  created_at: string;
  updated_at: string;
};

export type PendingPartner = {
  id: string;
  couple_id: string;
  full_name: string;
  age: number;
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

export type AvailableSlot = Pick<Availability, 'specific_date' | 'time_slot'>;

export type JoinRequest = {
  id: string;
  requester_couple_id: string;
  host_couple_id: string;
  meal_type: MealSlot;
  proposed_date: string | null;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
  notified_at: string | null;
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
  sender_profile_id: string | null;
  body: string;
  created_at: string;
};

export type DiscoveryCouple = {
  couple_id: string;
  couple_name: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  hosting_preference: HostingPreference;
  distance_miles: number;
  has_availability: boolean;
  request_status: 'sent' | 'received' | 'connected' | null;
};

export type CoupleProfile = {
  couple_id: string;
  couple_name: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  hosting_preference: HostingPreference;
  partner_1_first_name: string;
  partner_1_age: number;
  partner_1_avatar: string | null;
  partner_2_first_name: string | null;
  partner_2_age: number | null;
};
