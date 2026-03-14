import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  const id = getRouterParam(event, 'id');

  // We need the name for logging before we delete it
  const tag = sqlite.prepare('SELECT name FROM tags WHERE id = ?').get(id) as { name: string } | undefined;
  if (!tag) {
    throw createError({ statusCode: 404, statusMessage: 'Tag nicht gefunden.' });
  }

  // Perform deletion in a transaction
  const deleteTagTx = sqlite.transaction((tagId: string, userId: string, tagName: string) => {
    sqlite.prepare('DELETE FROM item_tags WHERE tag_id = ?').run(tagId);
    sqlite.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
    
    // Log activity
    sqlite.prepare('INSERT INTO activities (user_id, action, item_name, created_at) VALUES (?, ?, ?, ?)').run(
      userId,
      'tag_deleted',
      tagName,
      Date.now()
    );
  });

  deleteTagTx(id!, session.userId, tag.name);

  return { success: true };
});
