const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT s.*, c.nome AS conta_nome
      FROM saldos_iniciais s
      JOIN contas c ON c.id = s.conta_id
      ORDER BY s.ano, s.mes, c.nome
    `).all([]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.get('/:conta_id/:ano/:mes', (req, res) => {
  try {
    const { conta_id, ano, mes } = req.params;
    const row = req.db.prepare(
      'SELECT * FROM saldos_iniciais WHERE conta_id = ? AND ano = ? AND mes = ?'
    ).get([conta_id, ano, mes]);
    if (!row) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.post('/', (req, res) => {
  try {
    const { conta_id, mes, ano, saldo_inicial } = req.body;
    if (!conta_id || mes === undefined || ano === undefined || saldo_inicial === undefined) {
      return res.status(400).json({ success: false, error: 'conta_id, mes, ano e saldo_inicial são obrigatórios' });
    }
    req.db.prepare(
      'INSERT OR REPLACE INTO saldos_iniciais (conta_id, mes, ano, saldo_inicial) VALUES (?, ?, ?, ?)'
    ).run([conta_id, mes, ano, saldo_inicial]);
    const saved = req.db.prepare(
      'SELECT * FROM saldos_iniciais WHERE conta_id = ? AND ano = ? AND mes = ?'
    ).get([conta_id, ano, mes]);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT id FROM saldos_iniciais WHERE id = ?').get([req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });
    req.db.prepare('DELETE FROM saldos_iniciais WHERE id = ?').run([req.params.id]);
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
