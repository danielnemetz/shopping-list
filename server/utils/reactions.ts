import { eq, and } from 'drizzle-orm';
import { db, sqlite } from './db';
import { reactions } from '../database/schema';

export type EntityType = 'comment' | 'item';

export function getReactionsForEntities(
  entityType: EntityType,
  entityIds: string[],
  userId: string,
): Map<string, { emoji: string; count: number; userReacted: boolean }[]> {
  if (entityIds.length === 0) {
    return new Map();
  }
  try {
    const placeholders = entityIds.map(() => '?').join(',');
    const stmt = sqlite.prepare(`
      SELECT r.entity_id as entityId, r.emoji, COUNT(*) as count,
             SUM(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) as userReacted
      FROM reactions r
      WHERE r.entity_type = ? AND r.entity_id IN (${placeholders})
      GROUP BY r.entity_id, r.emoji
    `);
    const rows = stmt.all(userId, entityType, ...entityIds) as {
      entityId: string;
      emoji: string;
      count: number;
      userReacted: number;
    }[];
    const map = new Map<string, { emoji: string; count: number; userReacted: boolean }[]>();
    for (const r of rows) {
      const list = map.get(r.entityId) ?? [];
      list.push({ emoji: r.emoji, count: r.count, userReacted: r.userReacted > 0 });
      map.set(r.entityId, list);
    }
    return map;
  } catch (e) {
    // e.g. "no such table: reactions" if migration 0003 has not run yet
    return new Map();
  }
}

export function toggleReaction(
  entityType: EntityType,
  entityId: string,
  userId: string,
  emoji: string,
): { added: boolean } {
  const existing = db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.entityType, entityType),
        eq(reactions.entityId, entityId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji),
      ),
    )
    .get();

  if (existing) {
    db.delete(reactions).where(eq(reactions.id, existing.id)).run();
    return { added: false };
  }
  db.insert(reactions).values({
    entityType,
    entityId,
    userId,
    emoji,
  }).run();
  return { added: true };
}
