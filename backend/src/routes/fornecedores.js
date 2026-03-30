const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM fornecedores ORDER BY nome').all([]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare('SELECT * FROM fornecedores WHERE id = ?').get([req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.post('/', (req, res) => {
  try {
    const { nome, cnpj_cpf, telefone, email } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome é obrigatório' });
    const result = req.db.prepare(
      'INSERT INTO fornecedores (nome, cnpj_cpf, telefone, email) VALUES (?, ?, ?, ?)'
    ).run([nome, cnpj_cpf || null, telefone || null, email || null]);
    const created = req.db.prepare('SELECT * FROM fornecedores WHERE id = ?').get([result.lastInsertRowid]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { nome, cnpj_cpf, telefone, email } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome é obrigatório' });
    const existing = req.db.prepare('SELECT id FROM fornecedores WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare(
      'UPDATE fornecedores SET nome = ?, cnpj_cpf = ?, telefone = ?, email = ? WHERE id = ?'
    ).run([nome, cnpj_cpf || null, telefone || null, email || null, req.params.id]);
    const updated = req.db.prepare('SELECT * FROM fornecedores WHERE id = ?').get([req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM fornecedores WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare('DELETE FROM fornecedores WHERE id = ?').run([req.params.id]);
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
