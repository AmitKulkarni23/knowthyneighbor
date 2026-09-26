import { http, HttpResponse } from 'msw';
import {
  mockUser,
  mockCouple,
  mockDiscoveryCouples,
  mockReceivedRequests,
  mockSentRequests,
  mockConversations,
  mockMeals,
  mockAvailability,
} from './data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const rest = (path: string) => `${SUPABASE_URL}/rest/v1/${path}`;
const auth = (path: string) => `${SUPABASE_URL}/auth/v1/${path}`;

export const handlers = [
  // Auth: getUser
  http.get(auth('user'), () => {
    return HttpResponse.json(mockUser);
  }),

  // Auth: token refresh (keep session alive)
  http.post(auth('token'), () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    });
  }),

  // Auth: session endpoint
  http.get(auth('session'), () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    });
  }),

  // Couples: getCoupleByMember (or-filter query)
  http.get(rest('couples'), ({ request }) => {
    const url = new URL(request.url);
    const orFilter = url.searchParams.get('or');
    if (orFilter && orFilter.includes(mockUser.id)) {
      return HttpResponse.json(mockCouple, {
        headers: { 'Content-Range': '0-0/1' },
      });
    }
    return HttpResponse.json([]);
  }),

  // Discovery: RPC call
  http.post(rest('rpc/discover_couples'), () => {
    return HttpResponse.json(mockDiscoveryCouples);
  }),

  // Join requests
  http.get(rest('join_requests'), ({ request }) => {
    const url = new URL(request.url);
    const hostFilter = url.searchParams.get('host_couple_id');
    const requesterFilter = url.searchParams.get('requester_couple_id');

    if (hostFilter) {
      return HttpResponse.json(mockReceivedRequests);
    }
    if (requesterFilter) {
      return HttpResponse.json(mockSentRequests);
    }
    return HttpResponse.json([]);
  }),

  // Conversations
  http.get(rest('conversations'), ({ request }) => {
    const url = new URL(request.url);
    const orFilter = url.searchParams.get('or');
    if (orFilter && orFilter.includes(mockCouple.id)) {
      return HttpResponse.json(mockConversations);
    }
    return HttpResponse.json([]);
  }),

  // Meals
  http.get(rest('meals'), ({ request }) => {
    const url = new URL(request.url);
    const convFilter = url.searchParams.get('conversation_id');
    if (convFilter) {
      const filtered = mockMeals.filter(
        (m) => m.conversation_id === `eq.${convFilter}`.replace('eq.', '') || m.conversation_id === convFilter
      );
      return HttpResponse.json(filtered.length > 0 ? filtered : mockMeals);
    }
    return HttpResponse.json(mockMeals);
  }),

  // Availability
  http.get(rest('availability'), () => {
    return HttpResponse.json(mockAvailability);
  }),

  // Profiles (for AppProvider / nav)
  http.get(rest('profiles'), () => {
    return HttpResponse.json({
      id: mockUser.id,
      full_name: 'Pat Delgado',
      age: 34,
      ethnicity: null,
      avatar_url: null,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    });
  }),

  // Catch-all for any write operations so they don't error out
  http.post(rest('*'), () => {
    return HttpResponse.json({});
  }),
  http.patch(rest('*'), () => {
    return HttpResponse.json({});
  }),
];
