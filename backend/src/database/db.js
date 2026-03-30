const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function persist(database) {
  const data = database.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs({
    locateFile: file =>
      path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });

  let database;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  database.run('PRAGMA foreign_keys = ON;');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  database.exec(schema);
  persist(database);

  return {
    prepare(sql) {
      return {
        run(params) {
          database.run(sql, params || []);
          persist(database);
        },
        all(params) {
          const stmt = database.prepare(sql);
          if (params) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
        get(params) {
          const stmt = database.prepare(sql);
          if (params) stmt.bind(params);
          let row;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.free();
          return row;
        },
      };
    },
    exec(sql) {
      database.exec(sql);
      persist(database);
    },
    close() {
      persist(database);
      database.close();
    },
  };
}

module.exports = { initDb };
