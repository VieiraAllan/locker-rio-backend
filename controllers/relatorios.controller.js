import { supabase } from '../lib/supabase.js';

/* =========================
   UTIL — DATA LOCAL BR
========================= */
function formatarDataLocal(data) {
  return data.toLocaleDateString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  });
}

/* =========================
   UTIL — DEFINIR PERÍODO
========================= */
function obterPeriodo(query) {
  const { periodo = 'hoje', inicio, fim } = query;

  if (inicio && fim) {
    return {
      inicio,
      fim,
      periodo: 'personalizado'
    };
  }

  const hoje = new Date();
  const dataHoje = formatarDataLocal(hoje);

  if (periodo === '7dias') {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 6);

    return {
      inicio: formatarDataLocal(dataInicio),
      fim: dataHoje,
      periodo: '7dias'
    };
  }

  if (periodo === 'mes') {
    const dataInicio = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1
    );

    return {
      inicio: formatarDataLocal(dataInicio),
      fim: dataHoje,
      periodo: 'mes'
    };
  }

  return {
    inicio: dataHoje,
    fim: dataHoje,
    periodo: 'hoje'
  };
}

/* =========================
   RELATÓRIO — RESUMO
========================= */
export async function resumoRelatorio(req, res) {
  try {
    const { inicio, fim } = req.query;

    if ((inicio && !fim) || (!inicio && fim)) {
      return res.status(400).json({
        success: false,
        error: 'Para filtro personalizado, informe data inicial e data final.'
      });
    }

    const periodoInfo = obterPeriodo(req.query);

    if (periodoInfo.inicio > periodoInfo.fim) {
      return res.status(400).json({
        success: false,
        error: 'A data inicial não pode ser maior que a data final.'
      });
    }

    const { data: locacoes, error: locacoesError } = await supabase
      .from('locacoes')
      .select(`
        id,
        recibo_numero,
        data,
        hora_entrada,
        hora_pago_ate,
        valor_pago,
        valor_pago_inicial,
        valor_pago_final,
        valor_total,
        status,
        cliente_nome,
        cliente_telefone,
        cliente_documento,
        lacres,
        usuario_abertura_id,
        usuario_abertura_nome,
        usuario_abertura_perfil
      `)
      .gte('data', periodoInfo.inicio)
      .lte('data', periodoInfo.fim)
      .order('data', { ascending: false })
      .order('hora_entrada', { ascending: false });

    if (locacoesError) {
      return res.status(500).json({
        success: false,
        error: locacoesError.message
      });
    }

    let totalFaturado = 0;
    let totalFinalizadas = 0;
    let totalComLocker = 0;
    let totalAvulsas = 0;
    let totalLockersUtilizados = 0;
    let totalVolumesExtras = 0;

    const detalhes = [];

    for (const locacao of locacoes || []) {
      const { data: relacoesLockers, error: relacoesError } = await supabase
        .from('locacao_lockers')
        .select('locker_id')
        .eq('locacao_id', locacao.id);

      if (relacoesError) {
        return res.status(500).json({
          success: false,
          error: relacoesError.message
        });
      }

      const lockerIds = (relacoesLockers || []).map(
        relacao => relacao.locker_id
      );

      let lockersNumeros = [];

      if (lockerIds.length > 0) {
        const { data: lockers, error: lockersError } = await supabase
          .from('lockers')
          .select('numero')
          .in('id', lockerIds)
          .order('numero');

        if (lockersError) {
          return res.status(500).json({
            success: false,
            error: lockersError.message
          });
        }

        lockersNumeros = (lockers || []).map(locker => locker.numero);
      }

      const { data: bagagens, error: bagagensError } = await supabase
        .from('bagagens_extras')
        .select('descricao, quantidade')
        .eq('locacao_id', locacao.id);

      if (bagagensError) {
        return res.status(500).json({
          success: false,
          error: bagagensError.message
        });
      }

      const totalVolumes = (bagagens || []).reduce(
        (total, bagagem) => total + Number(bagagem.quantidade || 0),
        0
      );

      const tipo = lockerIds.length > 0 ? 'locker' : 'avulsa';
      const valorRecebido =
        Number(locacao.valor_pago_inicial || 0) +
        Number(locacao.valor_pago_final || 0);

      if (locacao.status === 'finalizada') {
        totalFinalizadas += 1;
        totalFaturado += valorRecebido;

        if (tipo === 'locker') {
          totalComLocker += 1;
          totalLockersUtilizados += lockerIds.length;
        }

        if (tipo === 'avulsa') {
          totalAvulsas += 1;
        }

        totalVolumesExtras += totalVolumes;
      }

      detalhes.push({
        id: locacao.id,
        recibo_numero: locacao.recibo_numero,
        data: locacao.data,
        hora_entrada: locacao.hora_entrada,
        hora_pago_ate: locacao.hora_pago_ate,
        valor_pago: valorRecebido,
        valor_recebido: valorRecebido,
        valor_pago_inicial: Number(locacao.valor_pago_inicial || 0),
        valor_pago_final: Number(locacao.valor_pago_final || 0),
        valor_total: Number(locacao.valor_total || 0),
        status: locacao.status,
        cliente_nome: locacao.cliente_nome,
        cliente_telefone: locacao.cliente_telefone,
        cliente_documento: locacao.cliente_documento,
        lacres: locacao.lacres,
        tipo,
        lockers: lockersNumeros,
        bagagens: bagagens || [],
        total_volumes: totalVolumes,
        usuario_abertura_id: locacao.usuario_abertura_id,
        usuario_abertura_nome: locacao.usuario_abertura_nome,
        usuario_abertura_perfil: locacao.usuario_abertura_perfil
      });
    }

    const ticketMedio =
      totalFinalizadas > 0
        ? totalFaturado / totalFinalizadas
        : 0;

    return res.json({
      success: true,
      data: {
        periodo: periodoInfo.periodo,
        inicio: periodoInfo.inicio,
        fim: periodoInfo.fim,
        total_faturado: totalFaturado,
        locacoes_finalizadas: totalFinalizadas,
        locacoes_com_locker: totalComLocker,
        bagagens_avulsas: totalAvulsas,
        lockers_utilizados: totalLockersUtilizados,
        volumes_extras: totalVolumesExtras,
        ticket_medio: ticketMedio,
        locacoes: detalhes
      }
    });
  } catch (err) {
    console.error('ERRO RELATÓRIO RESUMO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório'
    });
  }
}