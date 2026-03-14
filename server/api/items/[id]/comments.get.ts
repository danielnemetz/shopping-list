import { sqlite } from '../../../utils/db';
import { requireUserSession } from '../../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const itemId = getRouterParam(event, 'id');
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  const stmt = sqlite.prepare(`
    SELECT c.*, u.name as userName
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.item_id = ?
    ORDER BY c.created_at ASC
  `);

  const rawComments = stmt.all(itemId) as any[];

  return {
    success: true,
    comments: rawComments.map(row => ({
      id: row.id,
      text: row.text,
      createdAt: (() => {
        const ts = row.created_at ?? row.createdAt;
        if (ts === undefined || ts === null) return new Date();
        return new Date(ts < 10000000000 ? ts * 1000 : ts);
      })(),
      user: {
        id: row.user_id,
        name: row.userName,
      }
    })),
  };
});
