const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM contas WHERE ativa = 1 ORDER BY nome').all([]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare('SELECT * FROM contas WHERE id = ?').get([req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.post('/', (req, res) => {
  try {
    const { nome, banco, numero_conta } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome é obrigatório' });
    const result = req.db.prepare(
      'INSERT INTO contas (nome, banco, numero_conta, ativa) VALUES (?, ?, ?, 1)'
    ).run([nome, banco || null, numero_conta || null]);
    const created = req.db.prepare('SELECT * FROM contas WHERE id = ?').get([result.lastInsertRowid]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { nome, banco, numero_conta, ativa } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome é obrigatório' });
    const existing = req.db.prepare('SELECT id FROM contas WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare(
      'UPDATE contas SET nome = ?, banco = ?, numero_conta = ?, ativa = ? WHERE id = ?'
    ).run([nome, banco || null, numero_conta || null, ativa !== undefined ? ativa : 1, req.params.id]);
    const updated = req.db.prepare('SELECT * FROM contas WHERE id = ?').get([req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Soft delete — seta ativa = 0
router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM contas WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare('UPDATE contas SET ativa = 0 WHERE id = ?').run([req.params.id]);
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
