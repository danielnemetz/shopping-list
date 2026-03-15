import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';
import { getReactionsForEntities, type ReactionWithUsers } from '../../utils/reactions';

const mapRow = (
  row: any,
  tagsByItem: Map<string, { id: number; name: string }[]>,
  reactionsByItem: Map<string, ReactionWithUsers[]>,
) => ({
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
  tags: tagsByItem.get(row.id) || [],
  reactions: reactionsByItem.get(row.id) ?? [],
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.userId;

  const query = getQuery(event);
  const completedOnly = query.completed === '1' || query.completed === 'true';
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const commentCountStmt = sqlite.prepare(`
    SELECT item_id, COUNT(*) as cnt FROM comments GROUP BY item_id
  `);
  const commentCounts = (commentCountStmt.all() as { item_id: string; cnt: number }[]).reduce(
    (acc, r) => {
      acc[r.item_id] = r.cnt;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (completedOnly) {
    const stmt = sqlite.prepare(`
      SELECT i.*, u.name as creatorName
      FROM items i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.is_completed = 1
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rawItems = stmt.all(limit, offset) as any[];
    const countStmt = sqlite.prepare(
      'SELECT COUNT(*) as total FROM items WHERE is_completed = 1',
    );
    const { total } = (countStmt.get() as { total: number }) ?? { total: 0 };

    let tagRows: any[] = [];
    if (rawItems.length > 0) {
      const tagStmt = sqlite.prepare(`
        SELECT it.item_id, t.id as tagId, t.name as tagName
        FROM item_tags it
        JOIN tags t ON it.tag_id = t.id
        WHERE it.item_id IN (${rawItems.map(() => '?').join(',')})
      `);
      tagRows = tagStmt.all(...rawItems.map((r: any) => r.id)) as any[];
    }
    const tagsByItem = new Map<string, { id: number; name: string }[]>();
    for (const row of tagRows) {
      if (!tagsByItem.has(row.item_id)) tagsByItem.set(row.item_id, []);
      tagsByItem.get(row.item_id)!.push({ id: row.tagId, name: row.tagName });
    }
    const itemIds = rawItems.map((r: any) => r.id);
    const reactionsByItem = getReactionsForEntities('item', itemIds, userId);

    const items = rawItems.map((row: any) => {
      const r = { ...row, commentCount: commentCounts[row.id] ?? 0 };
      return mapRow(r, tagsByItem, reactionsByItem);
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Active items only (default)
  const stmt = sqlite.prepare(`
    SELECT i.*, u.name as creatorName
    FROM items i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.is_completed = 0
    ORDER BY i.position ASC
  `);
  const rawItems = stmt.all() as any[];

  const tagStmt = sqlite.prepare(`
    SELECT it.item_id, t.id as tagId, t.name as tagName
    FROM item_tags it
    JOIN tags t ON it.tag_id = t.id
  `);
  const allItemTags = tagStmt.all() as any[];
  const tagsByItem = new Map<string, { id: number; name: string }[]>();
  for (const row of allItemTags) {
    if (!tagsByItem.has(row.item_id)) tagsByItem.set(row.item_id, []);
    tagsByItem.get(row.item_id)!.push({ id: row.tagId, name: row.tagName });
  }

  const itemIds = rawItems.map((r: any) => r.id);
  const reactionsByItem = getReactionsForEntities('item', itemIds, userId);

  return rawItems.map((row: any) => {
    const r = { ...row, commentCount: commentCounts[row.id] ?? 0 };
    return mapRow(r, tagsByItem, reactionsByItem);
  });
});
