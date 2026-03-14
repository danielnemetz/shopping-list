import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const stmt = sqlite.prepare(`
    SELECT a.*, u.name as userName, u.email as userEmail
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rawActivities = stmt.all(limit, offset) as any[];

  const countStmt = sqlite.prepare('SELECT COUNT(*) as count FROM activities');
  const countResult = countStmt.get() as { count: number };
  const count = countResult.count;

  return {
    success: true,
    activities: rawActivities.map(row => ({
      id: row.id,
      action: row.action,
      itemName: row.item_name,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        name: row.userName,
        email: row.userEmail
      }
    })),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
});
