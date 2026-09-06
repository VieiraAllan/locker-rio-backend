import { supabase } from '../lib/supabase.js';

function normalizarPerfil(perfil) {
  return String(perfil || '').trim().toLowerCase();
}

function usuarioPodeGerenciarManutencao(usuario) {
  const perfil = normalizarPerfil(usuario?.perfil);

  return (
    perfil.includes('admin') ||
    perfil.includes('administrador') ||
    perfil.includes('gerente')
  );
}

export async function listarLockers(req, res) {
  try {
    const { status } = req.query;

    let query = supabase
      .from('lockers')
      .select('*')
      .order('numero');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao listar lockers'
    });
  }
}

export async function atualizarStatusLocker(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!usuarioPodeGerenciarManutencao(req.usuario)) {
      return res.status(403).json({
        success: false,
        error: 'Somente gerente ou admin podem alterar manutenção de locker'
      });
    }

    const statusNormalizado = String(status || '').trim().toLowerCase();

    if (!['disponivel', 'manutencao'].includes(statusNormalizado)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido para locker'
      });
    }

    const { data: locker, error: lockerError } = await supabase
      .from('lockers')
      .select('id, numero, status')
      .eq('id', id)
      .single();

    if (lockerError || !locker) {
      return res.status(404).json({
        success: false,
        error: 'Locker não encontrado'
      });
    }

    if (locker.status === 'ocupado') {
      return res.status(400).json({
        success: false,
        error: 'Locker ocupado não pode ser colocado em manutenção'
      });
    }

    const { data: lockerAtualizado, error: updateError } = await supabase
      .from('lockers')
      .update({ status: statusNormalizado })
      .eq('id', id)
      .select('id, numero, status')
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      data: lockerAtualizado
    });
  } catch (err) {
    console.error('ERRO ATUALIZAR STATUS LOCKER:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status do locker'
    });
  }
}

/* =========================
   CRIAR NOVO LOCKER
   (Somente Gerente e Admin)
========================= */
export async function criarLocker(req, res) {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!usuarioPodeGerenciarManutencao(req.usuario)) {
      return res.status(403).json({
        success: false,
        error: 'Somente gerente ou admin podem cadastrar novos lockers'
      });
    }

    const { numero, status = 'disponivel' } = req.body;
    const numeroNormalizado = String(numero ?? '').trim();

    if (!numeroNormalizado) {
      return res.status(400).json({
        success: false,
        error: 'Número do locker é obrigatório'
      });
    }

    // Verificar se já existe locker com este número
    const { data: lockerExistente, error: buscaError } = await supabase
      .from('lockers')
      .select('id, numero')
      .eq('numero', numeroNormalizado)
      .maybeSingle();

    if (buscaError) {
      return res.status(500).json({
        success: false,
        error: buscaError.message
      });
    }

    if (lockerExistente) {
      return res.status(409).json({
        success: false,
        error: `Já existe um locker cadastrado com o número "${numeroNormalizado}"`
      });
    }

    const statusNormalizado = String(status || '').trim().toLowerCase();
    const statusValido = ['disponivel', 'manutencao'].includes(statusNormalizado)
      ? statusNormalizado
      : 'disponivel';

    const { data: novoLocker, error: insertError } = await supabase
      .from('lockers')
      .insert({
        numero: numeroNormalizado,
        status: statusValido
      })
      .select('id, numero, status')
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao cadastrar novo locker'
      });
    }

    return res.status(201).json({
      success: true,
      data: novoLocker,
      message: 'Locker cadastrado com sucesso'
    });
  } catch (err) {
    console.error('ERRO CRIAR LOCKER:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar novo locker'
    });
  }
}

/* =========================
   EXCLUIR LOCKER
   (Somente Gerente e Admin)
========================= */
export async function excluirLocker(req, res) {
  try {
    const { id } = req.params;

    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!usuarioPodeGerenciarManutencao(req.usuario)) {
      return res.status(403).json({
        success: false,
        error: 'Somente gerente ou admin podem excluir lockers'
      });
    }

    const { data: locker, error: lockerError } = await supabase
      .from('lockers')
      .select('id, numero, status')
      .eq('id', id)
      .maybeSingle();

    if (lockerError) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar locker'
      });
    }

    if (!locker) {
      return res.status(404).json({
        success: false,
        error: 'Locker não encontrado'
      });
    }

    if (locker.status === 'ocupado') {
      return res.status(409).json({
        success: false,
        error: 'Este locker está ocupado e não pode ser excluído.'
      });
    }

    const { data: locacoesAtivas, error: locacaoAtivaError } = await supabase
      .from('locacao_lockers')
      .select(`
        locacao_id,
        locacoes!inner(status)
      `)
      .eq('locker_id', id)
      .eq('locacoes.status', 'ativa')
      .limit(1);

    if (locacaoAtivaError) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar locações ativas do locker'
      });
    }

    if (locacoesAtivas && locacoesAtivas.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Este locker possui uma locação ativa e não pode ser excluído.'
      });
    }

    const { error: deleteError } = await supabase
      .from('lockers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      if (deleteError.code === '23503' || String(deleteError.message).toLowerCase().includes('foreign key')) {
        return res.status(409).json({
          success: false,
          error: 'Este locker possui histórico de locações e não pode ser excluído. Para retirá-lo da operação, coloque-o em manutenção.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Erro ao excluir locker'
      });
    }

    return res.json({
      success: true,
      message: `Locker "${locker.numero}" excluído com sucesso`
    });

  } catch (err) {
    console.error('ERRO EXCLUIR LOCKER:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao excluir locker'
    });
  }
}