import 'dotenv/config';
import { app } from './app';
import { LogEvent } from './constants/logging';
import { sequelize } from './config/database';
import { logError, logInfo } from './utils/logger';

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => logInfo(LogEvent.ServerStarted, {
      port,
    }));
  } catch (error) {
    logError(LogEvent.DatabaseConnectionFailed, error);
    process.exitCode = 1;
    await sequelize.close();
  }
}

void start();
