const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = req.db.prepare(
      'SELECT * FROM categorias ORDER BY nivel1, classificacao, subcategoria'
    ).all([]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare('SELECT * FROM categorias WHERE id = ?').get([req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.post('/', (req, res) => {
  try {
    const { subcategoria, classificacao, nivel1, nivel2 } = req.body;
    if (!subcategoria) return res.status(400).json({ success: false, error: 'subcategoria é obrigatório' });
    const result = req.db.prepare(
      'INSERT INTO categorias (subcategoria, classificacao, nivel1, nivel2) VALUES (?, ?, ?, ?)'
    ).run([subcategoria, classificacao || null, nivel1 || null, nivel2 || null]);
    const created = req.db.prepare('SELECT * FROM categorias WHERE id = ?').get([result.lastInsertRowid]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { subcategoria, classificacao, nivel1, nivel2 } = req.body;
    if (!subcategoria) return res.status(400).json({ success: false, error: 'subcategoria é obrigatório' });
    const existing = req.db.prepare('SELECT id FROM categorias WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare(
      'UPDATE categorias SET subcategoria = ?, classificacao = ?, nivel1 = ?, nivel2 = ? WHERE id = ?'
    ).run([subcategoria, classificacao || null, nivel1 || null, nivel2 || null, req.params.id]);
    const updated = req.db.prepare('SELECT * FROM categorias WHERE id = ?').get([req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM categorias WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare('DELETE FROM categorias WHERE id = ?').run([req.params.id]);
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
