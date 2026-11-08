import { publishPost } from './publishers';
import { getSettings, listPosts, logActivity, updatePost } from './store';

type SchedulerGlobal = typeof globalThis & { __summitScheduler?: ReturnType<typeof setInterval> };

export async function runDuePosts(): Promise<{ published: number; ids: string[] }> {
  const settings = await getSettings();
  const posts = await listPosts();
  const due = posts.filter(
    (post) => post.status === 'scheduled' && post.scheduleAt && new Date(post.scheduleAt).getTime() <= Date.now(),
  );

  const ids: string[] = [];
  for (const post of due) {
    try {
      const { results, status } = await publishPost(post, settings);
      await updatePost(post.id, { status, results, publishedAt: new Date().toISOString() });
      await logActivity({
        type: 'publish',
        message: `Scheduled publish ran for "${post.title}" → ${results.map((r) => r.platform).join(', ')}`,
        postId: post.id,
      });
      ids.push(post.id);
    } catch (error) {
      await updatePost(post.id, {
        status: 'failed',
        results: [{ platform: post.platforms[0], status: 'error', message: error instanceof Error ? error.message : 'Publish failed', at: new Date().toISOString() }],
      });
      await logActivity({ type: 'publish', message: `Scheduled publish failed for "${post.title}"`, postId: post.id });
    }
  }
  return { published: ids.length, ids };
}

export function startScheduler(intervalMs = 20000): void {
  const g = globalThis as SchedulerGlobal;
  if (g.__summitScheduler) return;
  g.__summitScheduler = setInterval(() => {
    runDuePosts().catch((error) => console.error('[summitpost:scheduler]', error));
  }, intervalMs);
  console.log('[summitpost] scheduler running every 20s');
}
