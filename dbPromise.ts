import mysql, { Connection, Pool, PoolConnection } from 'mysql2/promise';

// Create a MySQL connection pool
export const pool: Pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'events_db',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function createTable() {
  let connection: PoolConnection | undefined;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    // Define the SQL query to create the table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS events_tracker (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        address VARCHAR(255) NOT NULL,
        chain VARCHAR(255) NOT NULL,
        lastBlock BIGINT,
        UNIQUE (address, chain)
      );
    `;

    // Execute the SQL query to create the table
    await connection.query(createTableQuery);

    console.log('Table created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
}

async function dropTable() {
  let connection: PoolConnection | undefined;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    // Define the SQL query to drop the table
    const dropTableQuery = `DROP TABLE IF EXISTS events_tracker;`;

    // Execute the SQL query to drop the table
    await connection.query(dropTableQuery);

    console.log('Table dropped successfully.');
  } catch (error) {
    console.error('Error dropping table:', error);
  } finally {
    if (connection) {
      connection.end(); // Release the connection back to the pool
    }
  }
}

if (require.main === module) {
  // This script is the main file
  if (process.argv[2] === 'create_table') {
    createTable();
  } else if (process.argv[2] === 'drop') {
    dropTable();
  }
}
