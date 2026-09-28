import { createSupabaseClient } from '@/config/supabase';
import type { Availability, MealSlot } from '@/types/database';

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

  return { slots: data ?? [], error: error?.message ?? null };
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

  return { slots: data ?? [], error: error?.message ?? null };
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

  if (deleteError) return { error: deleteError.message };

  if (slots.length === 0) return { error: null };

  const rows = slots.map((slot) => ({ couple_id: coupleId, ...slot }));
  const { error: insertError } = await supabase
    .from('availability')
    .insert(rows);

  return { error: insertError?.message ?? null };
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

  if (deleteError) return { error: deleteError.message };

  if (slots.length === 0) return { error: null };

  const rows = slots.map((slot) => ({ couple_id: coupleId, ...slot }));
  const { error: insertError } = await supabase
    .from('availability')
    .insert(rows);

  return { error: insertError?.message ?? null };
}
