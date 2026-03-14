import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';
import { eventHub } from '../../utils/events';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const body = await readBody(event);
  const name = body?.name?.trim();

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Tag name is required' });
  }

  // Check if tag already exists (case-insensitive)
  const existing = sqlite.prepare('SELECT * FROM tags WHERE LOWER(name) = LOWER(?)').get(name) as any;
  if (existing) {
    return { success: true, tag: existing };
  }

  const result = sqlite.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
  
  // Log activity
  sqlite.prepare('INSERT INTO activities (user_id, action, item_name, created_at) VALUES (?, ?, ?, ?)').run(
    session.userId,
    'tag_created',
    name,
    Math.floor(Date.now() / 1000)
  );

  // Broadcast the change for real-time sync
  eventHub.broadcast('tags:updated');

  return {
    success: true,
    tag: { id: result.lastInsertRowid, name },
  };
});
