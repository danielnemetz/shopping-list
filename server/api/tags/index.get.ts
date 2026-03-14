import { sqlite } from '../../utils/db';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const allTags = sqlite.prepare('SELECT * FROM tags ORDER BY name ASC').all() as any[];

  return { success: true, tags: allTags };
});
