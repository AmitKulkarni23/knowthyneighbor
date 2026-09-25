import { createSupabaseClient } from '@/config/supabase';
import type { Couple, HostingPreference } from '@/types/database';

type CreateCoupleData = {
  couple_name: string | null;
  bio: string | null;
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

  // Dummy coordinates until geocoding API is wired up
  const dummyPoint = `POINT(-73.935242 40.730610)`;

  const { data: couple, error } = await supabase
    .from('couples')
    .insert({
      partner_1_id: user.user.id,
      couple_name: data.couple_name,
      bio: data.bio,
      zip_code: data.zip_code,
      location: dummyPoint,
      hosting_preference: data.hosting_preference,
    })
    .select()
    .single();

  if (error || !couple) return { couple: null, error: error?.message ?? 'Failed to create couple' };

  // Create pending partner row
  const { error: partnerError } = await supabase
    .from('pending_partners')
    .insert({
      couple_id: couple.id,
      full_name: data.partner_name,
      age: data.partner_age,
    });

  if (partnerError) return { couple, error: partnerError.message };

  return { couple, error: null };
}

export async function getCouple(id: string): Promise<{ couple: Couple | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: couple, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', id)
    .single();

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

  return { success: !error, error: error?.message ?? null };
}
