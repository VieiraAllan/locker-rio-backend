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