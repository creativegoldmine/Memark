import { supabase } from './supabase';

export interface Reminder {
  id: string;
  user_id: string;
  item_id: string;
  reminder_date: string;
  status: 'pending' | 'completed' | 'snoozed';
  created_at: string;
  completed_at?: string;
}

export async function createReminder(
  userId: string,
  itemId: string,
  reminderDate: Date
): Promise<{ data: Reminder | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: userId,
        item_id: itemId,
        reminder_date: reminderDate.toISOString(),
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error creating reminder:', error);
    return { data: null, error };
  }
}

export async function getRemindersByUser(
  userId: string,
  status?: 'pending' | 'completed' | 'snoozed'
): Promise<{ data: Reminder[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return { data: null, error };
  }
}

export async function getRemindersByItem(
  itemId: string
): Promise<{ data: Reminder[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('item_id', itemId)
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching item reminders:', error);
    return { data: null, error };
  }
}

export async function updateReminderStatus(
  reminderId: string,
  status: 'pending' | 'completed' | 'snoozed',
  completedAt?: Date
): Promise<{ data: Reminder | null; error: Error | null }> {
  try {
    const updateData: any = { status };

    if (status === 'completed' && completedAt) {
      updateData.completed_at = completedAt.toISOString();
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', reminderId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error updating reminder:', error);
    return { data: null, error };
  }
}

export async function deleteReminder(
  reminderId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting reminder:', error);
    return { error };
  }
}

export async function getPendingRemindersForItems(
  userId: string,
  itemIds: string[]
): Promise<{ data: Record<string, boolean>; error: Error | null }> {
  try {
    if (itemIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('item_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('item_id', itemIds);

    if (error) throw error;

    const reminderMap: Record<string, boolean> = {};
    data?.forEach((reminder) => {
      reminderMap[reminder.item_id] = true;
    });

    return { data: reminderMap, error: null };
  } catch (error: any) {
    console.error('Error fetching pending reminders:', error);
    return { data: {}, error };
  }
}
