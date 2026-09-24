import { createSupabaseClient } from '@/config/supabase';
import type { Meal, MealSlot, MealStatus } from '@/types/database';

type CreateMealData = {
  conversation_id: string;
  host_couple_id: string;
  guest_couple_id: string;
  meal_type: MealSlot;
  scheduled_at: string;
};

export async function createMeal(
  data: CreateMealData
): Promise<{ meal: Meal | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: meal, error } = await supabase
    .from('meals')
    .insert(data)
    .select()
    .single();

  return { meal, error: error?.message ?? null };
}

export async function updateMealStatus(
  id: string,
  status: MealStatus
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('meals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function getMeals(
  conversationId: string
): Promise<{ meals: Meal[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('scheduled_at', { ascending: true });

  return { meals: data ?? [], error: error?.message ?? null };
}
