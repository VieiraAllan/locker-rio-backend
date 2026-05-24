import { supabase } from '../lib/supabase.js';

/* =========================
   MAPEAR CONFIGURAÇÕES
========================= */
function mapearConfiguracoes(row) {
  return {
    id: row.id,

    estabelecimento: {
      nome: row.nome_estabelecimento,
      telefone: row.telefone_estabelecimento || '',
      endereco: row.endereco_estabelecimento || '',
      mensagemRecibo: row.mensagem_recibo || ''
    },

    valores: {
      valorLocker: Number(row.valor_locker || 0),
      valorBagagemAvulsa: Number(row.valor_bagagem_avulsa || 0),
      valorHoraExcedente: Number(row.valor_hora_excedente || 0),
      horasInclusas: Number(row.horas_inclusas || 0)
    },

    operacao: {
      permitirBagagemAvulsa: row.permitir_bagagem_avulsa === true,
      permitirInRioTour: row.permitir_in_rio_tour === true,
      exigirLacres: row.exigir_lacres === true,
      exigirTelefoneCliente: row.exigir_telefone_cliente === true
    },

    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em
  };
}

/* =========================
   BUSCAR CONFIGURAÇÕES
========================= */
export async function buscarConfiguracoes(req, res) {
  try {
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    if (!data) {
      const { data: novaConfiguracao, error: insertError } = await supabase
        .from('configuracoes_sistema')
        .insert({})
        .select('*')
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: insertError.message
        });
      }

      return res.json({
        success: true,
        data: mapearConfiguracoes(novaConfiguracao)
      });
    }

    return res.json({
      success: true,
      data: mapearConfiguracoes(data)
    });

  } catch (err) {
    console.error('ERRO BUSCAR CONFIGURAÇÕES:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar configurações'
    });
  }
}

/* =========================
   ATUALIZAR CONFIGURAÇÕES
========================= */
export async function atualizarConfiguracoes(req, res) {
  try {
    const {
      estabelecimento = {},
      valores = {},
      operacao = {}
    } = req.body;

    const { data: configuracaoAtual, error: buscaError } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (buscaError) {
      return res.status(500).json({
        success: false,
        error: buscaError.message
      });
    }

    if (!configuracaoAtual) {
      const { data: novaConfiguracao, error: insertError } = await supabase
        .from('configuracoes_sistema')
        .insert({
          nome_estabelecimento: estabelecimento.nome ?? 'Locker Rio',
          telefone_estabelecimento: estabelecimento.telefone ?? '',
          endereco_estabelecimento: estabelecimento.endereco ?? '',
          mensagem_recibo:
            estabelecimento.mensagemRecibo ??
            'Obrigado por utilizar o Locker Rio.',

          valor_locker: valores.valorLocker ?? 30,
          valor_bagagem_avulsa: valores.valorBagagemAvulsa ?? 30,
          valor_hora_excedente: valores.valorHoraExcedente ?? 5,
          horas_inclusas: valores.horasInclusas ?? 4,

          permitir_bagagem_avulsa:
            operacao.permitirBagagemAvulsa ?? true,
          permitir_in_rio_tour:
            operacao.permitirInRioTour ?? true,
          exigir_lacres:
            operacao.exigirLacres ?? true,
          exigir_telefone_cliente:
            operacao.exigirTelefoneCliente ?? true,

          atualizado_em: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: insertError.message
        });
      }

      return res.json({
        success: true,
        data: mapearConfiguracoes(novaConfiguracao)
      });
    }

    const payload = {
      nome_estabelecimento:
        estabelecimento.nome ?? configuracaoAtual.nome_estabelecimento,

      telefone_estabelecimento:
        estabelecimento.telefone ?? configuracaoAtual.telefone_estabelecimento,

      endereco_estabelecimento:
        estabelecimento.endereco ?? configuracaoAtual.endereco_estabelecimento,

      mensagem_recibo:
        estabelecimento.mensagemRecibo ?? configuracaoAtual.mensagem_recibo,

      valor_locker:
        valores.valorLocker ?? configuracaoAtual.valor_locker,

      valor_bagagem_avulsa:
        valores.valorBagagemAvulsa ?? configuracaoAtual.valor_bagagem_avulsa,

      valor_hora_excedente:
        valores.valorHoraExcedente ?? configuracaoAtual.valor_hora_excedente,

      horas_inclusas:
        valores.horasInclusas ?? configuracaoAtual.horas_inclusas,

      permitir_bagagem_avulsa:
        operacao.permitirBagagemAvulsa ??
        configuracaoAtual.permitir_bagagem_avulsa,

      permitir_in_rio_tour:
        operacao.permitirInRioTour ??
        configuracaoAtual.permitir_in_rio_tour,

      exigir_lacres:
        operacao.exigirLacres ?? configuracaoAtual.exigir_lacres,

      exigir_telefone_cliente:
        operacao.exigirTelefoneCliente ??
        configuracaoAtual.exigir_telefone_cliente,

      atualizado_em: new Date().toISOString()
    };

    const { data: configuracaoAtualizada, error: updateError } = await supabase
      .from('configuracoes_sistema')
      .update(payload)
      .eq('id', configuracaoAtual.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      data: mapearConfiguracoes(configuracaoAtualizada)
    });

  } catch (err) {
    console.error('ERRO ATUALIZAR CONFIGURAÇÕES:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar configurações'
    });
  }
}