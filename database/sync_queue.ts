import { getDatabase } from './database';

export type MutationAction = 'UPSERT' | 'DELETE';

export type MutationRecord = {
  mutation_id: number;
  table_name: string;
  record_id: string;
  action: MutationAction;
  payload: string;
  created_at: string;
};

/**
 * Enqueue a mutation generated locally so it can be synced to Cloud Firestore.
 */
export async function queueMutation(
  tableName: string,
  recordId: string,
  action: MutationAction,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO mutation_queue (table_name, record_id, action, payload, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      tableName,
      recordId,
      action,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.warn('Failed to queue mutation for sync:', error);
  }
}

/**
 * Fetch all uncommitted mutations in chronological order.
 */
export async function getPendingMutations(): Promise<MutationRecord[]> {
  try {
    const db = await getDatabase();
    return await db.getAllAsync<MutationRecord>(
      'SELECT * FROM mutation_queue ORDER BY created_at ASC, mutation_id ASC'
    );
  } catch (error) {
    console.warn('Failed to read mutation queue:', error);
    return [];
  }
}

/**
 * Remove successfully synced mutations from the queue.
 */
export async function removeMutations(mutationIds: number[]): Promise<void> {
  if (mutationIds.length === 0) return;
  try {
    const db = await getDatabase();
    const placeholders = mutationIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM mutation_queue WHERE mutation_id IN (${placeholders})`,
      ...mutationIds
    );
  } catch (error) {
    console.warn('Failed to remove mutations:', error);
  }
}

/**
 * Count total unsynced mutations.
 */
export async function getPendingMutationCount(): Promise<number> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM mutation_queue'
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get a value from the sync_meta key-value store.
 */
export async function getSyncMeta(key: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_meta WHERE key = ?',
      key
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a key-value pair in sync_meta.
 */
export async function setSyncMeta(key: string, value: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO sync_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  } catch (error) {
    console.warn(`Failed to set sync_meta [${key}]:`, error);
  }
}
