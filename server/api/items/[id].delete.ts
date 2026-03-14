import { db } from '../../utils/db';
import { items, activities } from '../../database/schema';
import { requireUserSession } from '../../utils/auth';
import { eventHub } from '../../utils/events';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);
  
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  // Fetch the item so we can log its name
  const currentItem = await db.select().from(items).where(eq(items.id, id)).get();
  if (!currentItem) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' });
  }

  await db.delete(items)
    .where(eq(items.id, id))
    .run();

  await db.insert(activities).values({
    userId: user.userId,
    action: 'deleted',
    itemName: currentItem.text,
    createdAt: new Date(),
  }).run();

  // Broadcast the change for real-time sync
  eventHub.broadcast('items:updated');

  return { success: true };
});
