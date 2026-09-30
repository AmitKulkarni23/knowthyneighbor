import { createSupabaseClient } from '@/config/supabase';
import { geocodeLocation, geocodeZip } from '@/lib/geocode';
import { isUuid } from '@/lib/uuid';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';
import type { Couple, CoupleProfile, HostingPreference } from '@/types/database';

type CreateCoupleData = {
  couple_name: string | null;
  bio: string | null;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  hosting_preference: HostingPreference;
  partner_name: string;
  partner_age: number;
};

// Location fields and membership are fixed after creation (enforced by column grants)
type UpdateCoupleData = Partial<Pick<Couple, 'couple_name' | 'bio' | 'hosting_preference'>>;

export async function createCouple(
  data: CreateCoupleData
): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { couple: null, error: 'Not authenticated' };

  const geo =
    (data.zip_code ? await geocodeZip(data.zip_code) : null) ??
    (await geocodeLocation([data.city, data.state, data.country].filter(Boolean).join(', ')));
  if (!geo) {
    return { couple: null, error: "We couldn't find that location. Check the city and zip code." };
  }
  const point = `POINT(${geo.lng} ${geo.lat})`;

  const { data: couple, error } = await supabase
    .from('couples')
    .insert({
      partner_1_id: user.user.id,
      couple_name: data.couple_name,
      bio: data.bio,
      zip_code: data.zip_code,
      city: data.city,
      state: data.state,
      country: data.country,
      location: point,
      hosting_preference: data.hosting_preference,
    })
    .select()
    .single();

  if (error || !couple) {
    logger.error('createCouple failed', { code: error?.code, message: error?.message, hint: error?.details });
    return { couple: null, error: toUserMessage(error) ?? 'Failed to create couple' };
  }

  // Create pending partner row
  const { error: partnerError } = await supabase
    .from('pending_partners')
    .insert({
      couple_id: couple.id,
      full_name: data.partner_name,
      age: data.partner_age,
    });

  if (partnerError) {
    logger.error('createCouple: pending partner insert failed', { coupleId: couple.id, code: partnerError.code, message: partnerError.message });
    return { couple, error: toUserMessage(partnerError) };
  }

  return { couple, error: null };
}

// Another couple's public-facing profile (the couples row itself is private to its members)
export async function getCoupleProfile(
  id: string
): Promise<{ profile: CoupleProfile | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .rpc('get_couple_profile', { p_couple_id: id })
    .maybeSingle<CoupleProfile>();

  if (error) logger.error('getCoupleProfile failed', { coupleId: id, code: error.code, message: error.message });
  return { profile: data ?? null, error: toUserMessage(error) };
}

export async function updateCouple(
  id: string,
  data: UpdateCoupleData
): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: couple, error } = await supabase
    .from('couples')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) logger.error('updateCouple failed', { coupleId: id, code: error.code, message: error.message });
  return { couple, error: toUserMessage(error) };
}

export async function getCoupleByMember(
  userId: string
): Promise<{ couple: Couple | null; error: string | null }> {
  if (!isUuid(userId)) return { couple: null, error: 'Invalid user id' };
  const supabase = createSupabaseClient();
  const { data: couple, error } = await supabase
    .from('couples')
    .select('*')
    .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
    .maybeSingle();

  // No couple yet is not an error (data is null); anything else is a real failure
  if (error) logger.error('getCoupleByMember failed', { userId, code: error.code, message: error.message });
  return { couple, error: toUserMessage(error) };
}

export async function claimPartnerInvite(
  coupleId: string,
  inviteCode: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc('claim_partner_invite', {
    p_couple_id: coupleId,
    p_invite_code: inviteCode,
  });

  if (error) logger.error('claimPartnerInvite failed', { coupleId, code: error.code, message: error.message });
  return { success: !error, error: toUserMessage(error) };
}
