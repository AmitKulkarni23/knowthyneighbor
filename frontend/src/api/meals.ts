import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
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

  if (error) logger.error('createMeal failed', { conversationId: data.conversation_id, code: error.code, message: error.message });
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

  if (error) logger.error('updateMealStatus failed', { mealId: id, status, code: error.code, message: error.message });
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

  if (error) logger.error('getMeals failed', { conversationId, code: error.code, message: error.message });
  return { meals: data ?? [], error: error?.message ?? null };
}
