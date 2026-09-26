import type {
  Couple,
  DiscoveryCouple,
  JoinRequest,
  Conversation,
  Meal,
  Availability,
} from '@/types/database';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_COUPLE_ID = 'c0000000-0000-0000-0000-000000000001';

export const mockUser = {
  id: MOCK_USER_ID,
  email: 'demo@knowthyneighbor.com',
  app_metadata: {},
  user_metadata: { full_name: 'Pat Delgado' },
  aud: 'authenticated',
  created_at: '2026-06-01T00:00:00Z',
};

export const mockCouple: Couple = {
  id: MOCK_COUPLE_ID,
  partner_1_id: MOCK_USER_ID,
  partner_2_id: '00000000-0000-0000-0000-000000000002',
  couple_name: 'The Delgados',
  bio: 'We love hosting taco nights and trying new recipes together.',
  zip_code: '11201',
  location: 'POINT(-73.9857 40.6892)',
  hosting_preference: 'host',
  invite_code: 'abc123',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

export const mockDiscoveryCouples: DiscoveryCouple[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000010',
    couple_name: 'The Nguyens',
    bio: 'Huge fans of Sunday brunch — we make killer eggs benedict. Two kids, one golden retriever.',
    hosting_preference: 'host',
    distance_miles: 0.8,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    couple_name: 'Mike & Priya',
    bio: 'Just moved to the neighborhood! Would love to meet people over homemade curry or pizza.',
    hosting_preference: 'visit',
    distance_miles: 1.3,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000012',
    couple_name: 'The Johnsons',
    bio: 'Empty nesters with a big backyard grill. We host BBQs every other weekend in the summer.',
    hosting_preference: 'host',
    distance_miles: 2.1,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000013',
    couple_name: 'Sara & Tomoko',
    bio: 'Foodies who document every meal. Always hunting for the next great dinner conversation.',
    hosting_preference: 'both',
    distance_miles: 3.5,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000014',
    couple_name: 'The Martinezes',
    bio: null,
    hosting_preference: 'visit',
    distance_miles: 4.7,
  },
];

export const mockReceivedRequests: JoinRequest[] = [
  {
    id: 'r0000000-0000-0000-0000-000000000001',
    requester_couple_id: 'c0000000-0000-0000-0000-000000000011',
    host_couple_id: MOCK_COUPLE_ID,
    meal_type: 'dinner',
    message: "Hey! We'd love to come over for dinner sometime. We can bring dessert!",
    status: 'pending',
    created_at: '2026-09-24T14:30:00Z',
    responded_at: null,
  },
  {
    id: 'r0000000-0000-0000-0000-000000000002',
    requester_couple_id: 'c0000000-0000-0000-0000-000000000013',
    host_couple_id: MOCK_COUPLE_ID,
    meal_type: 'brunch',
    message: 'Sunday brunch at your place sounds amazing — we make great mimosas.',
    status: 'pending',
    created_at: '2026-09-22T09:15:00Z',
    responded_at: null,
  },
  {
    id: 'r0000000-0000-0000-0000-000000000003',
    requester_couple_id: 'c0000000-0000-0000-0000-000000000010',
    host_couple_id: MOCK_COUPLE_ID,
    meal_type: 'dinner',
    message: null,
    status: 'accepted',
    created_at: '2026-09-15T18:00:00Z',
    responded_at: '2026-09-16T10:00:00Z',
  },
];

export const mockSentRequests: JoinRequest[] = [
  {
    id: 'r0000000-0000-0000-0000-000000000010',
    requester_couple_id: MOCK_COUPLE_ID,
    host_couple_id: 'c0000000-0000-0000-0000-000000000012',
    meal_type: 'dinner',
    message: 'We heard you throw great BBQs — would love to join one!',
    status: 'accepted',
    created_at: '2026-09-20T12:00:00Z',
    responded_at: '2026-09-21T08:30:00Z',
  },
  {
    id: 'r0000000-0000-0000-0000-000000000011',
    requester_couple_id: MOCK_COUPLE_ID,
    host_couple_id: 'c0000000-0000-0000-0000-000000000014',
    meal_type: 'lunch',
    message: null,
    status: 'pending',
    created_at: '2026-09-25T16:00:00Z',
    responded_at: null,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv0000-0000-0000-0000-000000000001',
    couple_1_id: MOCK_COUPLE_ID,
    couple_2_id: 'c0000000-0000-0000-0000-000000000010',
    created_at: '2026-09-16T10:00:00Z',
    last_message_at: '2026-09-25T19:30:00Z',
  },
  {
    id: 'conv0000-0000-0000-0000-000000000002',
    couple_1_id: 'c0000000-0000-0000-0000-000000000012',
    couple_2_id: MOCK_COUPLE_ID,
    created_at: '2026-09-21T08:30:00Z',
    last_message_at: '2026-09-23T14:15:00Z',
  },
];

export const mockMeals: Meal[] = [
  {
    id: 'm0000000-0000-0000-0000-000000000001',
    conversation_id: 'conv0000-0000-0000-0000-000000000001',
    host_couple_id: MOCK_COUPLE_ID,
    guest_couple_id: 'c0000000-0000-0000-0000-000000000010',
    meal_type: 'dinner',
    scheduled_at: '2026-10-04T18:30:00Z',
    status: 'confirmed',
    created_at: '2026-09-25T19:30:00Z',
    updated_at: '2026-09-25T20:00:00Z',
  },
  {
    id: 'm0000000-0000-0000-0000-000000000002',
    conversation_id: 'conv0000-0000-0000-0000-000000000002',
    host_couple_id: 'c0000000-0000-0000-0000-000000000012',
    guest_couple_id: MOCK_COUPLE_ID,
    meal_type: 'dinner',
    scheduled_at: '2026-10-11T17:00:00Z',
    status: 'proposed',
    created_at: '2026-09-23T14:15:00Z',
    updated_at: '2026-09-23T14:15:00Z',
  },
  {
    id: 'm0000000-0000-0000-0000-000000000003',
    conversation_id: 'conv0000-0000-0000-0000-000000000001',
    host_couple_id: 'c0000000-0000-0000-0000-000000000010',
    guest_couple_id: MOCK_COUPLE_ID,
    meal_type: 'brunch',
    scheduled_at: '2026-09-14T10:00:00Z',
    status: 'completed',
    created_at: '2026-09-10T12:00:00Z',
    updated_at: '2026-09-14T14:00:00Z',
  },
];

export const mockAvailability: Availability[] = [
  { id: 'a1', couple_id: MOCK_COUPLE_ID, day_of_week: 5, specific_date: null, time_slot: 'dinner', recurring: true, created_at: '2026-06-01T00:00:00Z' },
  { id: 'a2', couple_id: MOCK_COUPLE_ID, day_of_week: 6, specific_date: null, time_slot: 'brunch', recurring: true, created_at: '2026-06-01T00:00:00Z' },
  { id: 'a3', couple_id: MOCK_COUPLE_ID, day_of_week: 6, specific_date: null, time_slot: 'dinner', recurring: true, created_at: '2026-06-01T00:00:00Z' },
  { id: 'a4', couple_id: MOCK_COUPLE_ID, day_of_week: 0, specific_date: null, time_slot: 'brunch', recurring: true, created_at: '2026-06-01T00:00:00Z' },
  { id: 'a5', couple_id: MOCK_COUPLE_ID, day_of_week: 0, specific_date: null, time_slot: 'lunch', recurring: true, created_at: '2026-06-01T00:00:00Z' },
];
