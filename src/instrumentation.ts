export async function register(): Promise<void> {
  // The positive check lets the bundler drop this branch from the edge build;
  // the scheduler imports node-only modules (fs) that edge cannot resolve.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
