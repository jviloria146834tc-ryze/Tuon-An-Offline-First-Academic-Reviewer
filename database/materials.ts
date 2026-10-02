import { getDatabase } from './database';
import { createLocalId } from './ids';

export type SQLiteMaterial = {
  material_id: string;
  reviewer_id: string;
  title: string;
  type: string;
  info: string | null;
  content: string | null;
  mastery: number;
  created_at: string;
  updated_at: string;
};

export type MaterialInput = {
  reviewer_id: string;
  title: string;
  type?: string;
  info?: string | null;
  content?: string | null;
  mastery?: number;
};

export async function getMaterials(): Promise<SQLiteMaterial[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteMaterial>(
    'SELECT * FROM materials ORDER BY created_at DESC'
  );
}

export async function getMaterialsByReviewer(reviewerId: string): Promise<SQLiteMaterial[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE reviewer_id = ? ORDER BY created_at DESC',
    reviewerId
  );
}

export async function getMaterialById(materialId: string): Promise<SQLiteMaterial | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SQLiteMaterial>(
    'SELECT * FROM materials WHERE material_id = ?', materialId
  );
}

export async function createMaterial(input: MaterialInput): Promise<string> {
  const db = await getDatabase();
  const id = createLocalId('material');
  await db.runAsync(
    `INSERT INTO materials (material_id, reviewer_id, title, type, info, content, mastery)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id, input.reviewer_id, input.title.trim(), input.type ?? 'Study Material',
    input.info ?? null, input.content ?? null, input.mastery ?? 0
  );
  return id;
}

export async function updateMaterial(materialId: string, input: Partial<Omit<MaterialInput, 'reviewer_id'>>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE materials SET
       title = COALESCE(?, title), type = COALESCE(?, type),
       info = COALESCE(?, info), content = COALESCE(?, content),
       mastery = COALESCE(?, mastery), updated_at = CURRENT_TIMESTAMP
     WHERE material_id = ?`,
    input.title?.trim() ?? null, input.type ?? null, input.info ?? null,
    input.content ?? null, input.mastery ?? null, materialId
  );
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM materials WHERE material_id = ?', materialId);
}
