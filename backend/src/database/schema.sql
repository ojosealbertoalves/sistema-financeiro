CREATE TABLE IF NOT EXISTS contas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  banco TEXT,
  numero_conta TEXT,
  ativa BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subcategoria TEXT NOT NULL,
  classificacao TEXT,
  nivel1 TEXT,
  nivel2 TEXT
);

CREATE TABLE IF NOT EXISTS saldos_iniciais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conta_id INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  saldo_inicial REAL NOT NULL DEFAULT 0,
  UNIQUE(conta_id, mes, ano),
  FOREIGN KEY (conta_id) REFERENCES contas(id)
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
  data_vencimento DATE,
  data_pagamento DATE,
  valor REAL,
  valor_pago REAL,
  valor_desconto REAL DEFAULT 0,
  status TEXT DEFAULT 'em_aberto',
  descricao TEXT,
  recorrencia TEXT,
  parcela TEXT,
  forma_pagamento TEXT,
  conta_id INTEGER,
  fornecedor_id INTEGER,
  categoria_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conta_id) REFERENCES contas(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
