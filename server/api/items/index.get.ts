import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const stmt = sqlite.prepare(`
    SELECT 
      i.*,
      u.name as creatorName,
      (SELECT COUNT(*) FROM comments c WHERE c.item_id = i.id) as commentCount
    FROM items i
    LEFT JOIN users u ON i.created_by = u.id
    ORDER BY i.position ASC
  `);

  const rawItems = stmt.all() as any[];

  // Fetch tags for all items in one query
  const tagStmt = sqlite.prepare(`
    SELECT it.item_id, t.id as tagId, t.name as tagName
    FROM item_tags it
    JOIN tags t ON it.tag_id = t.id
  `);
  const allItemTags = tagStmt.all() as any[];

  // Group tags by item_id
  const tagsByItem = new Map<string, { id: number; name: string }[]>();
  for (const row of allItemTags) {
    if (!tagsByItem.has(row.item_id)) {
      tagsByItem.set(row.item_id, []);
    }
    tagsByItem.get(row.item_id)!.push({ id: row.tagId, name: row.tagName });
  }

  return rawItems.map(row => ({
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
    commentCount: row.commentCount,
    tags: tagsByItem.get(row.id) || [],
  }));
});
