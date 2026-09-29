import { createSupabaseClient } from '@/config/supabase';
import { geocodeZip } from '@/lib/geocode';
import { logger } from '@/lib/logger';
import type { Couple, HostingPreference } from '@/types/database';

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

type UpdateCoupleData = Partial<Pick<Couple, 'couple_name' | 'bio' | 'zip_code' | 'hosting_preference'>>;

export async function createCouple(
  data: CreateCoupleData
): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { couple: null, error: 'Not authenticated' };

  const geo = data.zip_code ? await geocodeZip(data.zip_code) : null;
  const point = geo
    ? `POINT(${geo.lng} ${geo.lat})`
    : `POINT(0 0)`;

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
    return { couple: null, error: error?.message ?? 'Failed to create couple' };
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
    return { couple, error: partnerError.message };
  }

  return { couple, error: null };
}

export async function getCouple(id: string): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: couple, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', id)
    .single();

  if (error) logger.error('getCouple failed', { coupleId: id, code: error.code, message: error.message });
  return { couple, error: error?.message ?? null };
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
  return { couple, error: error?.message ?? null };
}

export async function getCoupleByMember(
  userId: string
): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: couple, error } = await supabase
    .from('couples')
    .select('*')
    .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
    .single();

  if (error && error.code !== 'PGRST116') logger.error('getCoupleByMember failed', { userId, code: error.code, message: error.message });
  return { couple, error: error?.message ?? null };
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
  return { success: !error, error: error?.message ?? null };
}
