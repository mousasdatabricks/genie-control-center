import { createApp, analytics, lakebase, server } from '@databricks/appkit';
import { setupAdminRoutes } from './routes/admin-routes';

createApp({
  plugins: [server({ autoStart: false }), analytics(), lakebase()],
})
  .then(async (appkit) => {
    await setupAdminRoutes(appkit);
    await appkit.server.start();
  })
  .catch(console.error);
