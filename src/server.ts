import 'dotenv/config';
import express from 'express';
import { sequelize } from './config/database';

const app = express();
app.use(express.json());

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exitCode = 1;
    await sequelize.close();
  }
}

void start();
