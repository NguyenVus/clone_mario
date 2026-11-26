import { createApp } from './app.js';
import { createDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const db = createDatabase();
const app = createApp({ db });

const server = app.listen(port, () => {
  console.log(`[server] Pixel Hero listening on http://localhost:${port}`);
});

const shutdown = (): void => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
