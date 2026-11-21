import 'dotenv/config';
import { app } from './app';
import { sequelize } from './config/database';
import { messages } from './utils/message';

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (error) {
    console.error(messages.databaseConnectionFailed.en, error);
    process.exitCode = 1;
    await sequelize.close();
  }
}

void start();
