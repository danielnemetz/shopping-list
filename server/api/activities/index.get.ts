import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const stmt = sqlite.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rawActivities = stmt.all(limit, offset) as any[];
  
  // Debug logging to help diagnose the date issue
  if (rawActivities.length > 0) {
    console.log('DEBUG: First activity row keys:', Object.keys(rawActivities[0]));
    console.log('DEBUG: First activity row values:', JSON.stringify(rawActivities[0]));
    console.log('DEBUG: created_at value:', rawActivities[0].created_at);
    console.log('DEBUG: createdAt value:', rawActivities[0].createdAt);
    console.log('DEBUG: type of created_at:', typeof rawActivities[0].created_at);
  }

  const countStmt = sqlite.prepare('SELECT COUNT(*) as count FROM activities');
  const countResult = countStmt.get() as { count: number };
  const count = countResult.count;

  return {
    success: true,
    activities: rawActivities.map(row => ({
      id: row.id,
      action: row.action,
      itemName: row.item_name,
      createdAt: (() => {
        const ts = row.created_at ?? row.createdAt;
        if (ts === undefined || ts === null) return new Date();
        return new Date(ts < 10000000000 ? ts * 1000 : ts);
      })(),
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
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
