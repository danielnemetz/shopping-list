import { db, sqlite } from '../../utils/db';
import { items, activities } from '../../database/schema';
import { requireUserSession } from '../../utils/auth';
import crypto from 'node:crypto';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);
  const body = await readBody(event);
  
  if (!body?.text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Item text is required' });
  }

  // Find max position to append to the end
  const allItems = await db.select({ position: items.position }).from(items).all();
  let maxPosition = 0;
  if (allItems.length > 0) {
    maxPosition = Math.max(...allItems.map(i => i.position));
  }

  const newId = crypto.randomUUID();
  const newItem = {
    id: newId,
    text: body.text.trim(),
    isCompleted: false,
    createdBy: user.userId,
    position: maxPosition + 1000,
    createdAt: new Date(),
  };

  await db.insert(items).values(newItem).run();

  // Handle tags: body.tags can be an array of tag names (strings)
  const tagNames: string[] = body.tags || [];
  const itemTags: { id: number; name: string }[] = [];

  for (const tagName of tagNames) {
    const trimmed = tagName.trim();
    if (!trimmed) continue;

    // Find or create tag
    let tag = sqlite.prepare('SELECT * FROM tags WHERE LOWER(name) = LOWER(?)').get(trimmed) as any;
    if (!tag) {
      const result = sqlite.prepare('INSERT INTO tags (name) VALUES (?)').run(trimmed);
      tag = { id: result.lastInsertRowid, name: trimmed };
    }

    // Link tag to item
    sqlite.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(newId, tag.id);
    itemTags.push({ id: tag.id, name: tag.name });
  }

  const tagSuffix = itemTags.length > 0 ? ` (Tags: ${itemTags.map(t => t.name).join(', ')})` : '';

  await db.insert(activities).values({
    userId: user.userId,
    action: 'added',
    itemName: newItem.text + tagSuffix,
    createdAt: new Date(),
  }).run();

  return {
    ...newItem,
    creatorName: user.name,
    commentCount: 0,
    tags: itemTags,
  };
});
