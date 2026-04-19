import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncProcedures() {
  console.log('Connecting to database at', process.env.DB_HOST);
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  console.log('Connected successfully!');

  const filesToSync = [
    'execute_trade.sql',
    'settle_partial_trade.sql'
  ];

  for (const filename of filesToSync) {
    const filePath = path.join(__dirname, 'sql', 'stored_procedures', filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract the PROCEDURE name
    const procNameMatch = content.match(/CREATE PROCEDURE (\w+)/);
    if (!procNameMatch) continue;
    const procName = procNameMatch[1];

    // Extract the body between DELIMITER // and END //
    const bodyMatch = content.match(/DELIMITER \/\/\s*([\s\S]*?END)\s*\/\//);
    if (!bodyMatch) {
      console.log(`Failed to parse ${filename}`);
      continue;
    }
    const createStmt = bodyMatch[1];

    console.log(`Syncing procedure: ${procName}...`);
    
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS ${procName}`);
      await connection.query(createStmt);
      console.log(`✅ ${procName} updated successfully!`);
    } catch (e) {
      console.error(`❌ Error updating ${procName}:`, e.message);
    }
  }

  await connection.end();
  console.log('Finished syncing.');
}

syncProcedures().catch(console.error);
