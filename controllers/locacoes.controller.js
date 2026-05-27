import { supabase } from '../lib/supabase.js';

/* =========================
   UTIL — HORAS EXCEDENTES
========================= */
function calcularHorasCheiasExcedentes(dataLocacao, horaPagoAte) {
  const agora = new Date();
  const dataHoraPagoAte = new Date(`${dataLocacao}T${horaPagoAte}`);

  const diffMs = agora - dataHoraPagoAte;
  if (diffMs <= 0) return 0;

  const diffHoras = diffMs / (1000 * 60 * 60);
  return Math.floor(diffHoras);
}

/* =========================
   UTIL — CONFIGURAÇÕES DO SISTEMA
========================= */
async function obterConfiguracoesSistema() {
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select(`
      valor_locker,
      valor_bagagem_avulsa,
      valor_hora_excedente,
      horas_inclusas,
      permitir_bagagem_avulsa,
      permitir_in_rio_tour,
      exigir_lacres,
      exigir_telefone_cliente
    `)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar configurações do sistema:', error);
    throw new Error('Erro ao buscar configurações do sistema');
  }

  return {
    valorLocker: Number(data?.valor_locker ?? 30),
    valorBagagemAvulsa: Number(data?.valor_bagagem_avulsa ?? 30),
    valorHoraExcedente: Number(data?.valor_hora_excedente ?? 5),
    horasInclusas: Number(data?.horas_inclusas ?? 4),

    permitirBagagemAvulsa: data?.permitir_bagagem_avulsa !== false,
    permitirInRioTour: data?.permitir_in_rio_tour !== false,
    exigirLacres: data?.exigir_lacres !== false,
    exigirTelefoneCliente: data?.exigir_telefone_cliente !== false
  };
}

/* =========================
   CRIAR LOCAÇÃO
========================= */
export async function criarLocacao(req, res) {
  try {
    const {
      locker_ids,
      in_rio_tour = false,
      bagagens_externas = [],
      cliente_nome,
      cliente_telefone,
      cliente_documento,
      lacres = '',
      usuario_abertura_id = null,
      usuario_abertura_nome = null,
      usuario_abertura_perfil = null
    } = req.body;

    const configuracoes = await obterConfiguracoesSistema();

    const inRioTourEfetivo = configuracoes.permitirInRioTour
      ? in_rio_tour
      : false;

    if (!cliente_nome || !cliente_documento) {
    return res.status(400).json({
      success: false,
      error: 'Nome e documento do cliente são obrigatórios'
    });
  }

  if (configuracoes.exigirTelefoneCliente && !cliente_telefone) {
    return res.status(400).json({
      success: false,
      error: 'Telefone do cliente é obrigatório'
    });
  }

  if (configuracoes.exigirLacres && !String(lacres).trim()) {
  return res.status(400).json({
    success: false,
    error: 'Numeração dos lacres é obrigatória'
  });
}

    const isAvulsa = !locker_ids || locker_ids.length === 0;

    if (isAvulsa && !configuracoes.permitirBagagemAvulsa) {
    return res.status(400).json({
      success: false,
      error: 'Bagagem avulsa está desabilitada nas configurações'
    });
     }

    if (!isAvulsa && (!locker_ids || locker_ids.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Locker não informado'
      });
    }

    if (!isAvulsa) {
      const { data: lockers, error: lockersError } = await supabase
        .from('lockers')
        .select('id, status')
        .in('id', locker_ids);

      if (lockersError) {
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar lockers'
        });
      }

      const indisponiveis = lockers.filter(
        l => l.status !== 'disponivel'
      );

      if (indisponiveis.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Um ou mais lockers não estão disponíveis'
        });
      }
    }

    /* ===== datas ===== */
    const agora = new Date();
    const dataLocacao = agora.toISOString().split('T')[0];
    const horaEntrada = agora.toTimeString().slice(0, 8);
    const horaPagoAte = new Date(
      agora.getTime() + configuracoes.horasInclusas * 60 * 60 * 1000
    )
      .toTimeString()
      .slice(0, 8);

    /* ===== valor inicial ===== */
    let valorFinal = 0;

      if (!inRioTourEfetivo) {
      if (!isAvulsa) {
         valorFinal += configuracoes.valorLocker * locker_ids.length;
         }

      for (const bagagem of bagagens_externas) {
          valorFinal += configuracoes.valorBagagemAvulsa * bagagem.quantidade;
        }
      }

    const reciboNumero = `LR-${Date.now()}`;

    const { data: locacao, error: locacaoError } = await supabase
      .from('locacoes')
      .insert({
        recibo_numero: reciboNumero,
        data: dataLocacao,
        hora_entrada: horaEntrada,
        hora_pago_ate: horaPagoAte,
        valor_pago: valorFinal,
        status: 'ativa',
        cliente_nome,
        cliente_telefone,
        cliente_documento,
        lacres: String(lacres || '').trim(),
        usuario_abertura_id,
        usuario_abertura_nome,
        usuario_abertura_perfil
      })
      .select()
      .single();

    if (locacaoError) {
      return res.status(500).json({
        success: false,
        error: locacaoError.message
      });
    }

    if (!isAvulsa) {
      const relacoes = locker_ids.map(id => ({
        locacao_id: locacao.id,
        locker_id: id
      }));

      const { error: relacaoError } = await supabase
        .from('locacao_lockers')
        .insert(relacoes);

      if (relacaoError) {
        return res.status(500).json({
          success: false,
          error: relacaoError.message
        });
      }
    }

    if (bagagens_externas.length > 0) {
      const registros = bagagens_externas.map(b => ({
        locacao_id: locacao.id,
        descricao: b.descricao,
        quantidade: b.quantidade
      }));

      const { error: bagagemError } = await supabase
        .from('bagagens_extras')
        .insert(registros);

      if (bagagemError) {
        return res.status(500).json({
          success: false,
          error: bagagemError.message
        });
      }
    }

    return res.status(201).json({
      success: true,
      locacao
    });

  } catch {
    return res.status(500).json({
      success: false,
      error: 'Erro ao criar locação'
    });
  }
}

/* =========================
   FINALIZAR LOCAÇÃO
========================= */
export async function finalizarLocacao(req, res) {
  try {
    const { id } = req.params;
    const { valor_excedente_manual = null } = req.body;

    const { data: locacao, error: locacaoError } = await supabase
      .from('locacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (locacaoError || !locacao || locacao.status !== 'ativa') {
      return res.status(404).json({
        success: false,
        error: 'Locação ativa não encontrada'
      });
    }

    const { data: lockersRelacao } = await supabase
      .from('locacao_lockers')
      .select('locker_id')
      .eq('locacao_id', id);

    const qtdLockers = lockersRelacao.length;

    const { data: bagagens } = await supabase
      .from('bagagens_extras')
      .select('quantidade')
      .eq('locacao_id', id);

    const totalBagagens = bagagens.reduce(
      (t, b) => t + b.quantidade,
      0
    );

          /* ===== configurações ===== */
      const configuracoes = await obterConfiguracoesSistema();

      /* ===== excedente ===== */
      const horasExcedentes = calcularHorasCheiasExcedentes(
        locacao.data,
        locacao.hora_pago_ate
      );

      let valorExcedente = 0;

      if (horasExcedentes > 0) {
        if (valor_excedente_manual !== null) {
          valorExcedente = valor_excedente_manual;
        } else {
          valorExcedente =
            horasExcedentes *
            configuracoes.valorHoraExcedente *
            (qtdLockers + totalBagagens);
        }
      }

    const valorFinal = locacao.valor_pago + valorExcedente;

    await supabase
      .from('locacoes')
      .update({
        valor_pago: valorFinal,
        status: 'finalizada'
      })
      .eq('id', id);

    if (qtdLockers > 0) {
      const lockerIds = lockersRelacao.map(l => l.locker_id);

      await supabase
        .from('lockers')
        .update({ status: 'disponivel' })
        .in('id', lockerIds);
    }

    return res.json({
      success: true,
      valor_final: valorFinal
    });

  } catch {
    return res.status(500).json({
      success: false,
      error: 'Erro ao finalizar locação'
    });
  }
}

/* =========================
   LISTAR BAGAGENS AVULSAS ATIVAS
========================= */
export async function listarAvulsasAtivas(req, res) {
  try {
    const { data: locacoes, error: locacoesError } = await supabase
      .from('locacoes')
      .select(`
        id,
        cliente_nome,
        status,
        bagagens_extras (
          descricao,
          quantidade
        )
      `)
      .eq('status', 'ativa');

    if (locacoesError) {
      return res.status(500).json({
        success: false,
        error: locacoesError.message
      });
    }

    const { data: relacoesLockers, error: relacoesError } = await supabase
      .from('locacao_lockers')
      .select('locacao_id');

    if (relacoesError) {
      return res.status(500).json({
        success: false,
        error: relacoesError.message
      });
    }

    const locacoesComLocker = new Set(
      (relacoesLockers || []).map(relacao => relacao.locacao_id)
    );

    const avulsas = (locacoes || [])
      .filter(locacao => {
        const temLocker = locacoesComLocker.has(locacao.id);
        const temBagagemExtra =
          Array.isArray(locacao.bagagens_extras) &&
          locacao.bagagens_extras.length > 0;

        return !temLocker && temBagagemExtra;
      })
      .map(locacao => {
        const totalVolumes = locacao.bagagens_extras.reduce(
          (total, bagagem) => total + Number(bagagem.quantidade || 0),
          0
        );

        return {
          id: locacao.id,
          cliente_nome: locacao.cliente_nome,
          total_volumes: totalVolumes
        };
      });

    return res.json({
      success: true,
      data: avulsas
    });

  } catch (err) {
    console.error('ERRO LISTAR BAGAGENS AVULSAS ATIVAS:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao listar bagagens avulsas'
    });
  }
}

/* =========================
   LISTAR LOCAÇÕES ATIVAS
========================= */
export async function listarLocacoesAtivas(req, res) {
  try {
    const { data: locacoes, error: locacoesError } = await supabase
      .from('locacoes')
      .select(`
        id,
        recibo_numero,
        data,
        hora_entrada,
        hora_pago_ate,
        valor_pago,
        status,
        cliente_nome,
        cliente_telefone,
        lacres,
        cliente_documento,
        usuario_abertura_id,
        usuario_abertura_nome,
        usuario_abertura_perfil
      `)
      .eq('status', 'ativa')
      .order('data', { ascending: false })
      .order('hora_entrada', { ascending: false });

    if (locacoesError) {
      return res.status(500).json({
        success: false,
        error: locacoesError.message
      });
    }

    const resultado = [];

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
        (total, bagagem) => total + bagagem.quantidade,
        0
      );

      const tipo = lockerIds.length > 0 ? 'locker' : 'avulsa';

      resultado.push({
        id: locacao.id,
        recibo_numero: locacao.recibo_numero,
        data: locacao.data,
        hora_entrada: locacao.hora_entrada,
        hora_pago_ate: locacao.hora_pago_ate,
        valor_pago: locacao.valor_pago,
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
        usuario_abertura_perfil: locacao.usuario_abertura_perfil,
      });
    }

    return res.json({
      success: true,
      data: resultado
    });

  } catch (err) {
    console.error('ERRO LISTAR LOCAÇÕES ATIVAS:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao listar locações ativas'
    });
  }
}

/* =========================
   LISTAR HISTÓRICO DE LOCAÇÕES
   Versão otimizada — evita N+1 queries
========================= */
export async function listarHistoricoLocacoes(req, res) {
  try {
    /* =========================
       1. BUSCAR LOCAÇÕES FINALIZADAS
    ========================= */
    const { data: locacoes, error: locacoesError } = await supabase
      .from('locacoes')
      .select(`
        id,
        recibo_numero,
        data,
        hora_entrada,
        hora_pago_ate,
        valor_pago,
        status,
        cliente_nome,
        cliente_telefone,
        cliente_documento,
        lacres,
        usuario_abertura_id,
        usuario_abertura_nome,
        usuario_abertura_perfil
      `)
      .eq('status', 'finalizada')
      .order('data', { ascending: false })
      .order('hora_entrada', { ascending: false });

    if (locacoesError) {
      return res.status(500).json({
        success: false,
        error: locacoesError.message
      });
    }

    if (!locacoes || locacoes.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const locacaoIds = locacoes.map(locacao => locacao.id);

    /* =========================
       2. BUSCAR TODAS AS RELAÇÕES COM LOCKERS EM LOTE
    ========================= */
    const { data: relacoesLockers, error: relacoesError } = await supabase
      .from('locacao_lockers')
      .select('locacao_id, locker_id')
      .in('locacao_id', locacaoIds);

    if (relacoesError) {
      return res.status(500).json({
        success: false,
        error: relacoesError.message
      });
    }

    const relacoes = relacoesLockers || [];

    const lockerIdsUnicos = [
      ...new Set(
        relacoes
          .map(relacao => relacao.locker_id)
          .filter(Boolean)
      )
    ];

    /* =========================
       3. BUSCAR TODOS OS LOCKERS RELACIONADOS EM LOTE
    ========================= */
    let lockers = [];

    if (lockerIdsUnicos.length > 0) {
      const { data: lockersData, error: lockersError } = await supabase
        .from('lockers')
        .select('id, numero')
        .in('id', lockerIdsUnicos)
        .order('numero');

      if (lockersError) {
        return res.status(500).json({
          success: false,
          error: lockersError.message
        });
      }

      lockers = lockersData || [];
    }

    /* =========================
       4. BUSCAR TODAS AS BAGAGENS EXTRAS EM LOTE
    ========================= */
    const { data: bagagensData, error: bagagensError } = await supabase
      .from('bagagens_extras')
      .select('locacao_id, descricao, quantidade')
      .in('locacao_id', locacaoIds);

    if (bagagensError) {
      return res.status(500).json({
        success: false,
        error: bagagensError.message
      });
    }

    const bagagensExtras = bagagensData || [];

    /* =========================
       5. MONTAR MAPAS EM MEMÓRIA
    ========================= */

    const numeroLockerPorId = new Map();

    lockers.forEach(locker => {
      numeroLockerPorId.set(locker.id, locker.numero);
    });

    const lockersPorLocacao = new Map();

    relacoes.forEach(relacao => {
      const numeroLocker = numeroLockerPorId.get(relacao.locker_id);

      if (!numeroLocker) {
        return;
      }

      if (!lockersPorLocacao.has(relacao.locacao_id)) {
        lockersPorLocacao.set(relacao.locacao_id, []);
      }

      lockersPorLocacao.get(relacao.locacao_id).push(numeroLocker);
    });

    const bagagensPorLocacao = new Map();

    bagagensExtras.forEach(bagagem => {
      if (!bagagensPorLocacao.has(bagagem.locacao_id)) {
        bagagensPorLocacao.set(bagagem.locacao_id, []);
      }

      bagagensPorLocacao.get(bagagem.locacao_id).push({
        descricao: bagagem.descricao,
        quantidade: Number(bagagem.quantidade || 0)
      });
    });

    /* =========================
       6. MONTAR RESPOSTA FINAL
    ========================= */
    const resultado = locacoes.map(locacao => {
      const lockersNumeros = lockersPorLocacao.get(locacao.id) || [];
      const bagagens = bagagensPorLocacao.get(locacao.id) || [];

      lockersNumeros.sort((a, b) => {
        const numeroA = Number(a);
        const numeroB = Number(b);

        if (!Number.isNaN(numeroA) && !Number.isNaN(numeroB)) {
          return numeroA - numeroB;
        }

        return String(a).localeCompare(String(b), 'pt-BR');
      });

      const totalVolumes = bagagens.reduce(
        (total, bagagem) => total + Number(bagagem.quantidade || 0),
        0
      );

      const tipo = lockersNumeros.length > 0 ? 'locker' : 'avulsa';

      return {
        id: locacao.id,
        recibo_numero: locacao.recibo_numero,
        data: locacao.data,
        hora_entrada: locacao.hora_entrada,
        hora_pago_ate: locacao.hora_pago_ate,
        valor_pago: locacao.valor_pago,
        status: locacao.status,
        cliente_nome: locacao.cliente_nome,
        cliente_telefone: locacao.cliente_telefone,
        cliente_documento: locacao.cliente_documento,
        lacres: locacao.lacres,
        tipo,
        lockers: lockersNumeros,
        bagagens,
        total_volumes: totalVolumes,
        usuario_abertura_id: locacao.usuario_abertura_id,
        usuario_abertura_nome: locacao.usuario_abertura_nome,
        usuario_abertura_perfil: locacao.usuario_abertura_perfil
      };
    });

    return res.json({
      success: true,
      data: resultado
    });

  } catch (err) {
    console.error('ERRO LISTAR HISTÓRICO DE LOCAÇÕES:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao listar histórico de locações'
    });
  }
}