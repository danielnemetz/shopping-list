import { db, sqlite } from '../../utils/db';
import { items, activities } from '../../database/schema';
import { requireUserSession } from '../../utils/auth';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);
  
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  const currentItem = await db.select().from(items).where(eq(items.id, id)).get();
  if (!currentItem) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' });
  }

  const body = await readBody(event);
  
  const updateData: Partial<typeof items.$inferInsert> = {};
  
  if (typeof body?.isCompleted === 'boolean') {
    updateData.isCompleted = body.isCompleted;
  }
  
  if (typeof body?.position === 'number') {
    updateData.position = body.position;
  }
  
  if (typeof body?.text === 'string' && body.text.trim().length > 0) {
    updateData.text = body.text.trim();
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(items)
      .set(updateData)
      .where(eq(items.id, id))
      .run();
  }

  // Fetch current tags before updating to detect changes for logging
  const oldTagsResult = sqlite.prepare(`
    SELECT t.name 
    FROM tags t 
    JOIN item_tags it ON t.id = it.tag_id 
    WHERE it.item_id = ?
  `).all(id) as { name: string }[];
  const oldTagNames = oldTagsResult.map(t => t.name).sort();

  // Handle tags update if provided
  if (Array.isArray(body?.tags)) {
    // Remove all existing tags for this item
    sqlite.prepare('DELETE FROM item_tags WHERE item_id = ?').run(id);

    // Add new tags
    for (const tagName of body.tags) {
      const trimmed = tagName.trim();
      if (!trimmed) continue;

      let tag = sqlite.prepare('SELECT * FROM tags WHERE LOWER(name) = LOWER(?)').get(trimmed) as any;
      if (!tag) {
        const result = sqlite.prepare('INSERT INTO tags (name) VALUES (?)').run(trimmed);
        tag = { id: result.lastInsertRowid, name: trimmed };
      }

      sqlite.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(id, tag.id);
    }

    // Log tag changes if any
    const uniqueOld = [...new Set(oldTagNames)].sort();
    const uniqueNew = [...new Set(body.tags.map((t: string) => t.trim()).filter(Boolean))].sort();
    
    if (JSON.stringify(uniqueOld) !== JSON.stringify(uniqueNew)) {
      await db.insert(activities).values({
        userId: user.userId,
        action: 'tags_changed',
        itemName: currentItem.text,
        createdAt: new Date(),
      }).run();
    }
  }

  // Log activity
  if (typeof updateData.isCompleted === 'boolean') {
    await db.insert(activities).values({
      userId: user.userId,
      action: updateData.isCompleted ? 'completed' : 'uncompleted',
      itemName: currentItem.text,
      createdAt: new Date(),
    }).run();
  } else if (updateData.text && updateData.text !== currentItem.text) {
     await db.insert(activities).values({
      userId: user.userId,
      action: 'renamed',
      itemName: `${currentItem.text} -> ${updateData.text}`,
      createdAt: new Date(),
    }).run();
  }

  return { success: true };
});
