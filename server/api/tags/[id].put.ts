import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';
import { eventHub } from '../../utils/events';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const name = body?.name?.trim();

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Tag-Name ist erforderlich.' });
  }

  try {
    const result = sqlite.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id);
    if (result.changes === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Tag nicht gefunden.' });
    }

    // Log activity
    sqlite.prepare('INSERT INTO activities (user_id, action, item_name, created_at) VALUES (?, ?, ?, ?)').run(
      session.userId,
      'tag_updated',
      name,
      Math.floor(Date.now() / 1000)
    );

    // Broadcast the change for real-time sync
    eventHub.broadcast('tags:updated');

    return { success: true };
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw createError({ statusCode: 409, statusMessage: 'Ein Tag mit diesem Namen existiert bereits.' });
    }
    throw err;
  }
});
