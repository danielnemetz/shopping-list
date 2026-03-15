import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const action = typeof query.action === 'string' && query.action.trim() ? query.action.trim() : null;
  const userId = typeof query.userId === 'string' && query.userId.trim() ? query.userId.trim() : null;
  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : null;

  const whereConditions: string[] = [];
  const params: (string | number)[] = [];
  if (action) {
    whereConditions.push('a.action = ?');
    params.push(action);
  }
  if (userId) {
    whereConditions.push('a.user_id = ?');
    params.push(userId);
  }
  if (search) {
    whereConditions.push('a.item_name LIKE ?');
    params.push(`%${search}%`);
  }
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const stmt = sqlite.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `);

  const rawActivities = stmt.all(...params, limit, offset) as any[];

  const countStmt = sqlite.prepare(`
    SELECT COUNT(*) as count FROM activities a ${whereClause}
  `);
  const countResult = countStmt.get(...params) as { count: number };
  const count = countResult.count;

  const usersStmt = sqlite.prepare(`
    SELECT DISTINCT a.user_id, u.name as user_name
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY u.name ASC
  `);
  const availableUsers = usersStmt.all() as { user_id: string; user_name: string | null }[];

  return {
    success: true,
    filterOptions: {
      users: availableUsers.map((r) => ({ id: r.user_id, name: r.user_name || '?' })),
    },
    activities: rawActivities.map(row => ({
      id: row.id,
      action: row.action,
      itemName: row.item_name,
      createdAt: (() => {
        const rawTs = row.created_at ?? row.createdAt ?? row.CREATED_AT ?? row.Created_At;
        if (rawTs === undefined || rawTs === null) return new Date();
        const ts = Number(rawTs);
        if (isNaN(ts)) return new Date();
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
