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
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        name: row.userName,
      }
    })),
  };
});
