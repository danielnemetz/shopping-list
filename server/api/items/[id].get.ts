import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  const stmt = sqlite.prepare(`
    SELECT i.*, u.name as creatorName,
      (SELECT COUNT(*) FROM comments c WHERE c.item_id = i.id) as commentCount
    FROM items i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ?
  `);
  const row = stmt.get(id) as any;
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' });
  }

  const tagStmt = sqlite.prepare(`
    SELECT t.id as tagId, t.name as tagName
    FROM item_tags it
    JOIN tags t ON it.tag_id = t.id
    WHERE it.item_id = ?
  `);
  const tagRows = tagStmt.all(id) as any[];

  return {
    id: row.id,
    text: row.text,
    isCompleted: !!row.is_completed,
    position: row.position,
    createdAt: (() => {
      const ts = row.created_at ?? row.createdAt;
      if (ts === undefined || ts === null) return new Date();
      return new Date(ts < 10000000000 ? ts * 1000 : ts);
    })(),
    createdBy: row.created_by,
    creatorName: row.creatorName,
    commentCount: row.commentCount ?? 0,
    tags: tagRows.map((r) => ({ id: r.tagId, name: r.tagName })),
  };
});
