require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./src/database/db');
const { runMigrations } = require('./src/database/migrations');
const fornecedoresRouter = require('./src/routes/fornecedores');
const contasRouter = require('./src/routes/contas');
const categoriasRouter = require('./src/routes/categorias');
const saldosRouter = require('./src/routes/saldos');
const lancamentosRouter = require('./src/routes/lancamentos');

async function start() {
  const db = await initDb();
  runMigrations(db);

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json());

  // Disponibiliza o db para as rotas via req
  app.use((req, _res, next) => {
    req.db = db;
    next();
  });

  app.use('/api/fornecedores', fornecedoresRouter);
  app.use('/api/contas', contasRouter);
  app.use('/api/categorias', categoriasRouter);
  app.use('/api/saldos', saldosRouter);
  app.use('/api/lancamentos', lancamentosRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date() });
  });

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

start().catch(err => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
