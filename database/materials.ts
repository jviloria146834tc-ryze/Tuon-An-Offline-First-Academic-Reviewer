import { getDatabase } from './database';
import { createLocalId } from './ids';
import { queueMutation } from './sync_queue';

export type SQLiteMaterial = {
  material_id: string;
  reviewer_id: string;
  title: string;
  type: string;
  info: string | null;
  content: string | null;
  attachments?: string | null;
  mastery: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  synced_at?: string | null;
};

export type MaterialInput = {
  reviewer_id: string;
  title: string;
  type?: string;
  info?: string | null;
  content?: string | null;
  attachments?: string | null;
  mastery?: number;
};

export async function getMaterials(): Promise<SQLiteMaterial[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
}

export async function getMaterialsByReviewer(reviewerId: string): Promise<SQLiteMaterial[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE reviewer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
    reviewerId
  );
}

export async function getMaterialById(materialId: string): Promise<SQLiteMaterial | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE material_id = ? AND deleted_at IS NULL', materialId
  );
}

export async function createMaterial(input: MaterialInput): Promise<string> {
  const db = await getDatabase();
  const id = createLocalId('material');
  const title = input.title.trim();
  const type = input.type ?? 'Study Material';
  const info = input.info ?? null;
  const content = input.content ?? null;
  const attachments = input.attachments ?? null;
  const mastery = input.mastery ?? 0;

  await db.runAsync(
    `INSERT INTO materials (material_id, reviewer_id, title, type, info, content, attachments, mastery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.reviewer_id, title, type, info, content, attachments, mastery
  );

  await queueMutation('materials', id, 'UPSERT', {
    material_id: id,
    reviewer_id: input.reviewer_id,
    title,
    type,
    info,
    content,
    attachments,
    mastery,
  });

  return id;
}

export async function updateMaterial(materialId: string, input: Partial<Omit<MaterialInput, 'reviewer_id'>>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE materials SET
       title = COALESCE(?, title), type = COALESCE(?, type),
       info = COALESCE(?, info), content = COALESCE(?, content),
       attachments = COALESCE(?, attachments),
       mastery = COALESCE(?, mastery), updated_at = CURRENT_TIMESTAMP
     WHERE material_id = ?`,
    input.title?.trim() ?? null, input.type ?? null, input.info ?? null,
    input.content ?? null, input.attachments ?? null, input.mastery ?? null, materialId
  );

  const updated = await db.getFirstAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE material_id = ?',
    materialId
  );
  if (updated) {
    await queueMutation('materials', materialId, 'UPSERT', updated as unknown as Record<string, unknown>);
  }
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE materials SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE material_id = ?',
    materialId
  );
  await queueMutation('materials', materialId, 'DELETE', { material_id: materialId });
}
