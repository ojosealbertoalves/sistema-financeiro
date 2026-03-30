# Sistema Financeiro

Aplicação fullstack com Node.js + Express + SQLite no backend e React + Vite no frontend.

## Pré-requisitos

- Node.js 18+

## Como rodar

### Backend

```bash
cd backend
npm install
npm run dev
```

O servidor iniciará em http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend iniciará em http://localhost:5173

## Variáveis de ambiente (backend)

Copie o `.env.example` para `.env` e ajuste conforme necessário:

```bash
cp .env.example .env
```

## Estrutura

```
backend/
  src/
    database/
      db.js          # Conexão e inicialização do SQLite
      schema.sql     # Definição das tabelas
    routes/          # Rotas da API
    middleware/      # Middlewares Express
  server.js          # Ponto de entrada
frontend/
  src/
    components/      # Componentes reutilizáveis
    pages/           # Páginas da aplicação
    services/
      api.js         # Instância do axios
    App.jsx
    main.jsx
  index.html
  vite.config.js     # Proxy /api -> backend
```
