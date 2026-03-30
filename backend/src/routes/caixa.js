const { Router } = require('express');
const router = Router();

const QUERY_LANCAMENTOS = `
  SELECT l.*, c.nome AS conta_nome, f.nome AS fornecedor_nome, cat.subcategoria
  FROM lancamentos l
  LEFT JOIN contas c ON c.id = l.conta_id
  LEFT JOIN fornecedores f ON f.id = l.fornecedor_id
  LEFT JOIN categorias cat ON cat.id = l.categoria_id
  WHERE strftime('%m', l.data_vencimento) = ?
  AND strftime('%Y', l.data_vencimento) = ?
  ORDER BY l.data_vencimento ASC
`;

function getSaldoInicial(db, mes, ano) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(saldo_inicial), 0) AS total
    FROM saldos_iniciais
    WHERE mes = ? AND ano = ?
  `).get([mes, ano]);
  return row ? row.total : 0;
}

function parsarParametros(query) {
  const mes = parseInt(query.mes, 10);
  const ano = parseInt(query.ano, 10);
  if (!mes || !ano || mes < 1 || mes > 12) return null;
  return { mes, ano };
}

function mesPadded(mes) {
  return String(mes).padStart(2, '0');
}

// GET /api/caixa/realizado?mes=3&ano=2026
router.get('/realizado', (req, res) => {
  try {
    const params = parsarParametros(req.query);
    if (!params) return res.status(400).json({ success: false, error: 'mes e ano são obrigatórios e devem ser válidos' });

    const { mes, ano } = params;
    const saldo_inicial = getSaldoInicial(req.db, mes, ano);

    const lancamentos = req.db.prepare(QUERY_LANCAMENTOS).all([mesPadded(mes), String(ano)]);

    // Filtra apenas os efetivamente pagos/recebidos
    const pagos = lancamentos.filter(l => {
      if (l.tipo === 'despesa') return l.status === 'pago';
      if (l.tipo === 'receita') return l.status === 'pago' || l.status === 'transferencia';
      return false;
    });

    // Agrupa por data
    const porData = {};
    for (const l of pagos) {
      const data = l.data_vencimento;
      if (!porData[data]) porData[data] = [];
      porData[data].push(l);
    }

    const dias = [];
    let saldo_acumulado = saldo_inicial;

    for (const data of Object.keys(porData).sort()) {
      const items = porData[data];
      const movimentacoes_por_conta = {};

      for (const l of items) {
        const conta = l.conta_nome || 'Sem conta';
        if (!movimentacoes_por_conta[conta]) {
          movimentacoes_por_conta[conta] = {
            entradas_pagas: 0,
            transferencias_recebidas: 0,
            saidas_pagas: 0,
          };
        }
        const mov = movimentacoes_por_conta[conta];
        const valor = l.valor_pago || l.valor || 0;

        if (l.tipo === 'receita') {
          if (l.status === 'transferencia') {
            mov.transferencias_recebidas += valor;
          } else {
            mov.entradas_pagas += valor;
          }
        } else {
          mov.saidas_pagas += valor;
        }
      }

      let total_entradas = 0;
      let total_saidas = 0;
      for (const mov of Object.values(movimentacoes_por_conta)) {
        total_entradas += mov.entradas_pagas + mov.transferencias_recebidas;
        total_saidas += mov.saidas_pagas;
      }

      const saldo_dia = total_entradas - total_saidas;
      saldo_acumulado = saldo_acumulado + saldo_dia;

      dias.push({
        data,
        dia: parseInt(data.split('-')[2], 10),
        movimentacoes_por_conta,
        total_entradas,
        total_saidas,
        saldo_dia,
        saldo_acumulado,
        lancamentos: items.map(l => ({
          id: l.id,
          tipo: l.tipo,
          descricao: l.descricao,
          valor_pago: l.valor_pago,
          status: l.status,
          conta_nome: l.conta_nome,
          fornecedor_nome: l.fornecedor_nome,
        })),
      });
    }

    res.json({ success: true, data: { saldo_inicial, dias } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/caixa/previsao?mes=3&ano=2026
router.get('/previsao', (req, res) => {
  try {
    const params = parsarParametros(req.query);
    if (!params) return res.status(400).json({ success: false, error: 'mes e ano são obrigatórios e devem ser válidos' });

    const { mes, ano } = params;
    const saldo_inicial = getSaldoInicial(req.db, mes, ano);

    const lancamentos = req.db.prepare(QUERY_LANCAMENTOS).all([mesPadded(mes), String(ano)]);

    // Agrupa por data (todos os lançamentos)
    const porData = {};
    for (const l of lancamentos) {
      const data = l.data_vencimento;
      if (!porData[data]) porData[data] = [];
      porData[data].push(l);
    }

    const dias = [];
    let saldo_acumulado = saldo_inicial;

    // Resumo acumulado
    const resumo = {
      total_entradas_pagas: 0,
      total_transferencias: 0,
      total_saidas_pagas: 0,
      total_entradas_previstas: 0,
      total_saidas_previstas: 0,
      saldo_final_projetado: 0,
      dias_em_alerta: 0,
      menor_saldo_projetado: saldo_inicial,
    };

    const statusPago = new Set(['pago', 'transferencia']);

    for (const data of Object.keys(porData).sort()) {
      const items = porData[data];
      const movimentacoes_por_conta = {};

      for (const l of items) {
        const conta = l.conta_nome || 'Sem conta';
        if (!movimentacoes_por_conta[conta]) {
          movimentacoes_por_conta[conta] = {
            entradas_pagas: 0,
            transferencias_recebidas: 0,
            saidas_pagas: 0,
            entradas_previstas: 0,
            saidas_previstas: 0,
          };
        }
        const mov = movimentacoes_por_conta[conta];
        const isPago = statusPago.has(l.status);
        const valor = isPago ? (l.valor_pago || l.valor || 0) : (l.valor || 0);

        if (l.tipo === 'receita') {
          if (isPago) {
            if (l.status === 'transferencia') {
              mov.transferencias_recebidas += valor;
            } else {
              mov.entradas_pagas += valor;
            }
          } else {
            mov.entradas_previstas += valor;
          }
        } else {
          if (isPago) {
            mov.saidas_pagas += valor;
          } else {
            mov.saidas_previstas += valor;
          }
        }
      }

      let total_entradas_pagas = 0;
      let total_saidas_pagas = 0;
      let total_entradas_previstas = 0;
      let total_saidas_previstas = 0;

      for (const mov of Object.values(movimentacoes_por_conta)) {
        total_entradas_pagas += mov.entradas_pagas + mov.transferencias_recebidas;
        total_saidas_pagas += mov.saidas_pagas;
        total_entradas_previstas += mov.entradas_previstas;
        total_saidas_previstas += mov.saidas_previstas;
      }

      const saldo_dia =
        total_entradas_pagas - total_saidas_pagas +
        total_entradas_previstas - total_saidas_previstas;

      saldo_acumulado = saldo_acumulado + saldo_dia;
      const alerta = saldo_acumulado < 0;

      // Acumula resumo
      resumo.total_entradas_pagas += total_entradas_pagas;
      resumo.total_saidas_pagas += total_saidas_pagas;
      resumo.total_entradas_previstas += total_entradas_previstas;
      resumo.total_saidas_previstas += total_saidas_previstas;
      if (alerta) resumo.dias_em_alerta++;
      if (saldo_acumulado < resumo.menor_saldo_projetado) {
        resumo.menor_saldo_projetado = saldo_acumulado;
      }

      // Separa transferencias no resumo
      for (const mov of Object.values(movimentacoes_por_conta)) {
        resumo.total_transferencias += mov.transferencias_recebidas;
      }

      dias.push({
        data,
        dia: parseInt(data.split('-')[2], 10),
        movimentacoes_por_conta,
        total_entradas_pagas,
        total_saidas_pagas,
        total_entradas_previstas,
        total_saidas_previstas,
        saldo_dia,
        saldo_acumulado,
        alerta,
        lancamentos: items.map(l => ({
          id: l.id,
          tipo: l.tipo,
          descricao: l.descricao,
          valor: l.valor,
          valor_pago: l.valor_pago,
          status: l.status,
          conta_nome: l.conta_nome,
          fornecedor_nome: l.fornecedor_nome,
        })),
      });
    }

    resumo.saldo_final_projetado = saldo_acumulado;

    res.json({ success: true, data: { saldo_inicial, dias, resumo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
