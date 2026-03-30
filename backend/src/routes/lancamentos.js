const { Router } = require('express');
const router = Router();

const TIPOS_VALIDOS = ['receita', 'despesa'];
const STATUS_DESPESA = ['em_aberto', 'pago', 'agendado'];
const STATUS_RECEITA = ['pago', 'transferencia', 'previsto'];

const SELECT_BASE = `
  SELECT
    l.*,
    c.nome AS conta_nome,
    f.nome AS fornecedor_nome,
    cat.subcategoria AS categoria_subcategoria,
    cat.classificacao AS categoria_classificacao,
    cat.nivel1 AS categoria_nivel1,
    co.nome AS conta_origem_nome
  FROM lancamentos l
  LEFT JOIN contas c ON l.conta_id = c.id
  LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
  LEFT JOIN categorias cat ON l.categoria_id = cat.id
  LEFT JOIN contas co ON l.conta_origem_id = co.id
`;

function isValidDate(str) {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function validarCampos(body, db) {
  const { tipo, valor, data_vencimento, conta_id, status } = body;

  if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
    return 'tipo deve ser "receita" ou "despesa"';
  }
  if (valor !== undefined) {
    if (typeof valor !== 'number' || valor <= 0) {
      return 'valor deve ser um número positivo';
    }
  }
  if (data_vencimento !== undefined && !isValidDate(data_vencimento)) {
    return 'data_vencimento inválida';
  }
  if (conta_id !== undefined) {
    const conta = db.prepare('SELECT id FROM contas WHERE id = ?').get([conta_id]);
    if (!conta) return 'conta_id não encontrada';
  }
  if (status !== undefined && tipo) {
    const statusValidos = tipo === 'despesa' ? STATUS_DESPESA : STATUS_RECEITA;
    if (!statusValidos.includes(status)) {
      return `status inválido para ${tipo}`;
    }
  }

  return null;
}

// GET /api/lancamentos
router.get('/', (req, res) => {
  try {
    const { tipo, status, conta_id, categoria_id, mes, ano, data_inicio, data_fim } = req.query;

    const conditions = [];
    const params = [];

    if (tipo) {
      conditions.push('l.tipo = ?');
      params.push(tipo);
    }
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (conta_id) {
      conditions.push('l.conta_id = ?');
      params.push(conta_id);
    }
    if (categoria_id) {
      conditions.push('l.categoria_id = ?');
      params.push(categoria_id);
    }
    if (mes) {
      conditions.push("strftime('%m', l.data_vencimento) = ?");
      params.push(String(mes).padStart(2, '0'));
    }
    if (ano) {
      conditions.push("strftime('%Y', l.data_vencimento) = ?");
      params.push(String(ano));
    }
    if (data_inicio) {
      conditions.push('l.data_vencimento >= ?');
      params.push(data_inicio);
    }
    if (data_fim) {
      conditions.push('l.data_vencimento <= ?');
      params.push(data_fim);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `${SELECT_BASE} ${where} ORDER BY l.data_vencimento ASC`;

    const rows = req.db.prepare(sql).all(params.length ? params : undefined);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/lancamentos/:id
router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare(`${SELECT_BASE} WHERE l.id = ?`).get([req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/lancamentos
router.post('/', (req, res) => {
  try {
    const {
      tipo, valor, data_vencimento, conta_id,
      data_pagamento, valor_pago, valor_desconto,
      status, descricao, recorrencia, parcela,
      forma_pagamento, fornecedor_id, categoria_id, conta_origem_id,
    } = req.body;

    if (!tipo) return res.status(400).json({ success: false, error: 'tipo é obrigatório' });
    if (valor === undefined || valor === null) return res.status(400).json({ success: false, error: 'valor é obrigatório' });
    if (!data_vencimento) return res.status(400).json({ success: false, error: 'data_vencimento é obrigatório' });
    if (!conta_id) return res.status(400).json({ success: false, error: 'conta_id é obrigatório' });

    const erro = validarCampos(req.body, req.db);
    if (erro) return res.status(400).json({ success: false, error: erro });

    const statusFinal = status || (tipo === 'despesa' ? 'em_aberto' : 'previsto');

    req.db.prepare(`
      INSERT INTO lancamentos
        (tipo, data_vencimento, data_pagamento, valor, valor_pago, valor_desconto,
         status, descricao, recorrencia, parcela, forma_pagamento,
         conta_id, fornecedor_id, categoria_id, conta_origem_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      tipo,
      data_vencimento,
      data_pagamento || null,
      valor,
      valor_pago || null,
      valor_desconto || 0,
      statusFinal,
      descricao || null,
      recorrencia || null,
      parcela || null,
      forma_pagamento || null,
      conta_id,
      fornecedor_id || null,
      categoria_id || null,
      conta_origem_id || null,
    ]);

    const { id } = req.db.prepare('SELECT id FROM lancamentos ORDER BY id DESC LIMIT 1').get([]);
    const created = req.db.prepare(`${SELECT_BASE} WHERE l.id = ?`).get([id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/lancamentos/:id
router.put('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM lancamentos WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });

    const {
      tipo, valor, data_vencimento, conta_id,
      data_pagamento, valor_pago, valor_desconto,
      status, descricao, recorrencia, parcela,
      forma_pagamento, fornecedor_id, categoria_id, conta_origem_id,
    } = req.body;

    const erro = validarCampos(req.body, req.db);
    if (erro) return res.status(400).json({ success: false, error: erro });

    req.db.prepare(`
      UPDATE lancamentos SET
        tipo = COALESCE(?, tipo),
        data_vencimento = COALESCE(?, data_vencimento),
        data_pagamento = ?,
        valor = COALESCE(?, valor),
        valor_pago = ?,
        valor_desconto = COALESCE(?, valor_desconto),
        status = COALESCE(?, status),
        descricao = ?,
        recorrencia = ?,
        parcela = ?,
        forma_pagamento = ?,
        conta_id = COALESCE(?, conta_id),
        fornecedor_id = ?,
        categoria_id = ?,
        conta_origem_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run([
      tipo || null,
      data_vencimento || null,
      data_pagamento !== undefined ? data_pagamento : undefined,
      valor !== undefined ? valor : null,
      valor_pago !== undefined ? valor_pago : undefined,
      valor_desconto !== undefined ? valor_desconto : null,
      status || null,
      descricao !== undefined ? descricao : undefined,
      recorrencia !== undefined ? recorrencia : undefined,
      parcela !== undefined ? parcela : undefined,
      forma_pagamento !== undefined ? forma_pagamento : undefined,
      conta_id || null,
      fornecedor_id !== undefined ? fornecedor_id : undefined,
      categoria_id !== undefined ? categoria_id : undefined,
      conta_origem_id !== undefined ? conta_origem_id : undefined,
      req.params.id,
    ]);

    const updated = req.db.prepare(`${SELECT_BASE} WHERE l.id = ?`).get([req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PATCH /api/lancamentos/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id, tipo FROM lancamentos WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });

    const { status, data_pagamento, valor_pago } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status é obrigatório' });

    const statusValidos = existing.tipo === 'despesa' ? STATUS_DESPESA : STATUS_RECEITA;
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ success: false, error: `status inválido para ${existing.tipo}` });
    }

    req.db.prepare(`
      UPDATE lancamentos SET
        status = ?,
        data_pagamento = COALESCE(?, data_pagamento),
        valor_pago = COALESCE(?, valor_pago),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run([
      status,
      data_pagamento || null,
      valor_pago !== undefined ? valor_pago : null,
      req.params.id,
    ]);

    const updated = req.db.prepare(`${SELECT_BASE} WHERE l.id = ?`).get([req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// DELETE /api/lancamentos/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM lancamentos WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare('DELETE FROM lancamentos WHERE id = ?').run([req.params.id]);
    res.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
