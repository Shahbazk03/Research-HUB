import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(env.port, () => {
            console.log(`🚀 Research Hub API running on http://localhost:${env.port}`);
            console.log(`🏥 Health check: http://localhost:${env.port}/api/health`);
            console.log(`🌍 Environment: ${env.nodeEnv}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};
void startServer();
//# sourceMappingURL=server.js.map