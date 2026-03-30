function runMigrations(db) {
  try {
    db.exec('ALTER TABLE lancamentos ADD COLUMN conta_origem_id INTEGER REFERENCES contas(id)');
  } catch (err) {
    // Coluna já existe — ignorar
  }
}

module.exports = { runMigrations };
