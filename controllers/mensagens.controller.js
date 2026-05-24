import { supabase } from '../lib/supabase.js';

function formatarValor(valor) {
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.', ',')}`;
}

function gerarLinkWhatsApp(telefone, mensagem) {
  const texto = encodeURIComponent(mensagem);
  return `https://wa.me/${telefone}?text=${texto}`;
}

async function buscarConfiguracoesSistema() {
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select(`
      valor_locker,
      valor_bagagem_avulsa,
      valor_hora_excedente,
      horas_inclusas
    `)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar configurações do sistema:', error);
  }

  return {
    valorLocker: Number(data?.valor_locker ?? 30),
    valorBagagemAvulsa: Number(data?.valor_bagagem_avulsa ?? 30),
    valorHoraExcedente: Number(data?.valor_hora_excedente ?? 5),
    horasInclusas: Number(data?.horas_inclusas ?? 4)
  };
}

async function buscarDadosLocacao(locacaoId) {
  const { data: locacao, error: locacaoError } = await supabase
    .from('locacoes')
    .select('*')
    .eq('id', locacaoId)
    .single();

  if (locacaoError || !locacao) {
    throw new Error('Locação não encontrada');
  }

  const { data: lockersRelacao, error: lockersRelacaoError } = await supabase
    .from('locacao_lockers')
    .select('locker_id')
    .eq('locacao_id', locacaoId);

  if (lockersRelacaoError) {
    throw new Error('Erro ao buscar relação de lockers');
  }

  const lockerIds = (lockersRelacao || []).map(l => l.locker_id);

  let lockers = [];

  if (lockerIds.length > 0) {
    const { data: lockersData, error: lockersError } = await supabase
      .from('lockers')
      .select('numero')
      .in('id', lockerIds);

    if (lockersError) {
      throw new Error('Erro ao buscar lockers');
    }

    lockers = lockersData || [];
  }

  const { data: bagagens, error: bagagensError } = await supabase
    .from('bagagens_extras')
    .select('descricao, quantidade')
    .eq('locacao_id', locacaoId);

  if (bagagensError) {
    throw new Error('Erro ao buscar bagagens extras');
  }

  const configuracoes = await buscarConfiguracoesSistema();

  return {
    locacao,
    lockers,
    bagagens: bagagens || [],
    configuracoes
  };
}

/**
 * ============================
 * MENSAGEM DE INÍCIO
 * ============================
 */
export async function mensagemInicio(req, res) {
  try {
    const { id } = req.params;
    const { telefone } = req.query;

    const {
      locacao,
      lockers,
      bagagens,
      configuracoes
    } = await buscarDadosLocacao(id);

    const numerosLockers = lockers.map(l => l.numero).join(', ');
    const isAvulsa = lockers.length === 0;

    let mensagem = `Olá! 😊\n\n`;
    mensagem += `Sua locação foi iniciada com sucesso.\n\n`;

    if (isAvulsa) {
      mensagem += `📦 Tipo: Bagagem avulsa\n`;
    } else {
      mensagem += `🔐 Lockers: ${numerosLockers}\n`;
    }

    mensagem += `🕒 Entrada: ${locacao.hora_entrada}\n`;
    mensagem += `🕓 Pago até: ${locacao.hora_pago_ate}\n`;

    if (locacao.lacres) {
      mensagem += `🏷️ Lacres: ${locacao.lacres}\n`;
    }

    mensagem += `💰 Valor pago: ${formatarValor(locacao.valor_pago)}\n\n`;

    if (bagagens.length > 0) {
      mensagem += `🧳 Bagagens Extras:\n`;

      bagagens.forEach(b => {
        mensagem += `- ${b.quantidade}x ${b.descricao}\n`;
      });

      mensagem += `\n`;
    }

    mensagem += `📌 Regras:\n`;
    mensagem += `• ${formatarValor(configuracoes.valorLocker)} até ${configuracoes.horasInclusas}h por locker\n`;
    mensagem += `• Bagagem extra/avulsa: ${formatarValor(configuracoes.valorBagagemAvulsa)} por volume\n`;
    mensagem += `• Hora extra: ${formatarValor(configuracoes.valorHoraExcedente)} por hora cheia\n`;
    mensagem += `• Funcionamento: 09:00 às 18:00\n\n`;
    mensagem += `Qualquer dúvida, estamos à disposição!`;

    const link = telefone
      ? gerarLinkWhatsApp(telefone, mensagem)
      : null;

    return res.json({
      success: true,
      mensagem,
      whatsapp_link: link
    });

  } catch (err) {
    console.error('ERRO MENSAGEM INÍCIO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar mensagem de início'
    });
  }
}

/**
 * ============================
 * MENSAGEM DE ATRASO
 * ============================
 */
export async function mensagemAtraso(req, res) {
  try {
    const { id } = req.params;
    const { telefone } = req.query;

    const { locacao, configuracoes } = await buscarDadosLocacao(id);

    let mensagem = `Olá! ⏰\n\n`;
    mensagem += `Identificamos que o tempo contratado foi excedido.\n\n`;
    mensagem += `🕓 Horário pago até: ${locacao.hora_pago_ate}\n`;

    if (locacao.lacres) {
      mensagem += `🏷️ Lacres: ${locacao.lacres}\n`;
    }

    mensagem += `📌 A taxa de excedente é cobrada somente após completar 1 hora cheia.\n`;
    mensagem += `💰 Hora extra: ${formatarValor(configuracoes.valorHoraExcedente)} por hora cheia.\n\n`;
    mensagem += `Por favor, dirija-se ao balcão para regularização.\n`;
    mensagem += `Estamos à disposição.`;

    const link = telefone
      ? gerarLinkWhatsApp(telefone, mensagem)
      : null;

    return res.json({
      success: true,
      mensagem,
      whatsapp_link: link
    });

  } catch (err) {
    console.error('ERRO MENSAGEM ATRASO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar mensagem de atraso'
    });
  }
}

/**
 * ============================
 * MENSAGEM DE FINALIZAÇÃO
 * ============================
 */
export async function mensagemFinalizacao(req, res) {
  try {
    const { id } = req.params;
    const { telefone } = req.query;

    const { locacao, lockers, bagagens } = await buscarDadosLocacao(id);

    const numerosLockers = lockers.map(l => l.numero).join(', ');
    const isAvulsa = lockers.length === 0;

    let mensagem = `✅ Locação finalizada!\n\n`;

    if (isAvulsa) {
      mensagem += `📦 Tipo: Bagagem avulsa\n`;
    } else {
      mensagem += `🔐 Lockers: ${numerosLockers}\n`;
    }

    if (locacao.lacres) {
      mensagem += `🏷️ Lacres: ${locacao.lacres}\n`;
    }

    if (bagagens.length > 0) {
      mensagem += `🧳 Bagagens Extras:\n`;

      bagagens.forEach(b => {
        mensagem += `- ${b.quantidade}x ${b.descricao}\n`;
      });

      mensagem += `\n`;
    }

    mensagem += `Foi um prazer manter seus pertences e bagagens seguros. 😊\n\n`;
    mensagem += `💰 Valor final: ${formatarValor(locacao.valor_pago)}\n\n`;
    mensagem += `⭐ Avalie o Locker Rio no Google:\n`;
    mensagem += `https://g.page/r/CUL3ZqXi7q6SEBM/review\n\n`;
    mensagem += `📸 Siga nosso Instagram:\n`;
    mensagem += `http://instagram.com/locker.rio\n\n`;
    mensagem += `Agradecemos a preferência e esperamos vê-lo novamente!`;

    const link = telefone
      ? gerarLinkWhatsApp(telefone, mensagem)
      : null;

    return res.json({
      success: true,
      mensagem,
      whatsapp_link: link
    });

  } catch (err) {
    console.error('ERRO MENSAGEM FINALIZAÇÃO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar mensagem de finalização'
    });
  }
}