export default {
  async fetch(request) {
    const url = new URL(request.url);

    return new Response(
      JSON.stringify({
        status: 'ok',
        worker: 'cf-workers-actions-e2e',
        path: url.pathname,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
