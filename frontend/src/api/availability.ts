import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';
import type { Availability, AvailableSlot, MealSlot } from '@/types/database';

type AvailabilitySlot = {
  day_of_week: number | null;
  specific_date: string | null;
  time_slot: MealSlot;
  recurring: boolean;
};

export async function getAvailability(
  coupleId: string
): Promise<{ slots: Availability[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('couple_id', coupleId)
    .order('specific_date', { ascending: true });

  if (error) logger.error('getAvailability failed', { coupleId, code: error.code, message: error.message });
  return { slots: data ?? [], error: toUserMessage(error) };
}

export async function getAvailabilityForWeek(
  coupleId: string,
  startDate: string,
  endDate: string
): Promise<{ slots: Availability[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('couple_id', coupleId)
    .gte('specific_date', startDate)
    .lte('specific_date', endDate)
    .order('specific_date', { ascending: true });

  if (error) logger.error('getAvailabilityForWeek failed', { coupleId, startDate, endDate, code: error.code, message: error.message });
  return { slots: data ?? [], error: toUserMessage(error) };
}

export async function setAvailability(
  coupleId: string,
  slots: AvailabilitySlot[]
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();

  // Clear existing availability, then insert new slots
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('couple_id', coupleId);

  if (deleteError) {
    logger.error('setAvailability: delete failed', { coupleId, code: deleteError.code, message: deleteError.message });
    return { error: toUserMessage(deleteError) };
  }

  if (slots.length === 0) return { error: null };

  const rows = slots.map((slot) => ({ couple_id: coupleId, ...slot }));
  const { error: insertError } = await supabase
    .from('availability')
    .insert(rows);

  if (insertError) logger.error('setAvailability: insert failed', { coupleId, code: insertError.code, message: insertError.message });
  return { error: toUserMessage(insertError) };
}

// Another couple's upcoming open slots (their availability table rows are private)
export async function getCoupleAvailability(
  coupleId: string
): Promise<{ slots: AvailableSlot[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc('get_couple_availability', { p_couple_id: coupleId });

  if (error) logger.error('getCoupleAvailability failed', { coupleId, code: error.code, message: error.message });
  return { slots: data ?? [], error: toUserMessage(error) };
}

export async function setAvailabilityForWeek(
  coupleId: string,
  startDate: string,
  endDate: string,
  slots: AvailabilitySlot[]
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();

  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('couple_id', coupleId)
    .gte('specific_date', startDate)
    .lte('specific_date', endDate);

  if (deleteError) {
    logger.error('setAvailabilityForWeek: delete failed', { coupleId, startDate, endDate, code: deleteError.code, message: deleteError.message });
    return { error: toUserMessage(deleteError) };
  }

  if (slots.length === 0) return { error: null };

  const rows = slots.map((slot) => ({ couple_id: coupleId, ...slot }));
  const { error: insertError } = await supabase
    .from('availability')
    .insert(rows);

  if (insertError) logger.error('setAvailabilityForWeek: insert failed', { coupleId, code: insertError.code, message: insertError.message });
  return { error: toUserMessage(insertError) };
}
