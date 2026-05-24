import { supabase } from '../lib/supabase.js';
import { gerarHashSenha } from '../lib/senhas.js';

const PERFIS = {
  ATENDENTE: 'atendente',
  GERENTE: 'gerente',
  ADMIN: 'admin'
};

function perfilValido(perfil) {
  return (
    perfil === PERFIS.ATENDENTE ||
    perfil === PERFIS.GERENTE ||
    perfil === PERFIS.ADMIN
  );
}

function normalizarUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    criado_por_id: usuario.criado_por_id,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em,
    ultimo_login_em: usuario.ultimo_login_em
  };
}

async function buscarUsuarioPorId(id) {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

async function obterUsuarioAtual(req) {
  const usuarioId = req.headers['x-usuario-id'];

  if (!usuarioId) {
    return null;
  }

  return await buscarUsuarioPorId(usuarioId);
}

function podeGerenciarPerfil(usuarioAtual, perfilAlvo) {
  if (!usuarioAtual || !usuarioAtual.perfil || !perfilAlvo) {
    return false;
  }

  if (usuarioAtual.perfil === PERFIS.ADMIN) {
    return true;
  }

  if (
    usuarioAtual.perfil === PERFIS.GERENTE &&
    perfilAlvo === PERFIS.ATENDENTE
  ) {
    return true;
  }

  return false;
}

function podeAcessarGestaoUsuarios(usuarioAtual) {
  if (!usuarioAtual || !usuarioAtual.perfil) {
    return false;
  }

  return (
    usuarioAtual.perfil === PERFIS.ADMIN ||
    usuarioAtual.perfil === PERFIS.GERENTE
  );
}

/* =========================
   LISTAR USUÁRIOS
========================= */
export async function listarUsuarios(req, res) {
  try {
    const usuarioAtual = await obterUsuarioAtual(req);

    if (!podeAcessarGestaoUsuarios(usuarioAtual)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para listar usuários'
      });
    }

    let query = supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        perfil,
        ativo,
        criado_por_id,
        criado_em,
        atualizado_em,
        ultimo_login_em
      `)
      .order('nome', { ascending: true });

    if (usuarioAtual.perfil === PERFIS.GERENTE) {
      query = query.eq('perfil', PERFIS.ATENDENTE);
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
      data: (data || []).map(normalizarUsuario)
    });

  } catch (err) {
    console.error('ERRO LISTAR USUÁRIOS:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao listar usuários'
    });
  }
}

/* =========================
   CRIAR USUÁRIO
========================= */
export async function criarUsuario(req, res) {
  try {
    const usuarioAtual = await obterUsuarioAtual(req);

    if (!podeAcessarGestaoUsuarios(usuarioAtual)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para criar usuários'
      });
    }

    const {
      nome,
      email,
      perfil,
      ativo = true
    } = req.body;

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nome é obrigatório'
      });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
    }

    if (!perfilValido(perfil)) {
      return res.status(400).json({
        success: false,
        error: 'Perfil inválido'
      });
    }

    if (!podeGerenciarPerfil(usuarioAtual, perfil)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para criar usuário com este perfil'
      });
    }

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        nome: String(nome).trim(),
        email: String(email).trim().toLowerCase(),
        perfil,
        ativo: ativo === true,
        criado_por_id: usuarioAtual.id
      })
      .select(`
        id,
        nome,
        email,
        perfil,
        ativo,
        criado_por_id,
        criado_em,
        atualizado_em,
        ultimo_login_em
      `)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.status(201).json({
      success: true,
      data: normalizarUsuario(data)
    });

  } catch (err) {
    console.error('ERRO CRIAR USUÁRIO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao criar usuário'
    });
  }
}

/* =========================
   ATUALIZAR USUÁRIO
========================= */
export async function atualizarUsuario(req, res) {
  try {
    const usuarioAtual = await obterUsuarioAtual(req);
    const { id } = req.params;

    if (!podeAcessarGestaoUsuarios(usuarioAtual)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para editar usuários'
      });
    }

    const usuarioAlvo = await buscarUsuarioPorId(id);

    if (!usuarioAlvo) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    if (!podeGerenciarPerfil(usuarioAtual, usuarioAlvo.perfil)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para editar este usuário'
      });
    }

    const {
      nome,
      email,
      perfil,
      ativo
    } = req.body;

    const payload = {};

    if (nome !== undefined) {
      if (!String(nome).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Nome não pode ficar vazio'
        });
      }

      payload.nome = String(nome).trim();
    }

    if (email !== undefined) {
      if (!String(email).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Email não pode ficar vazio'
        });
      }

      payload.email = String(email).trim().toLowerCase();
    }

    if (perfil !== undefined) {
      if (!perfilValido(perfil)) {
        return res.status(400).json({
          success: false,
          error: 'Perfil inválido'
        });
      }

      if (!podeGerenciarPerfil(usuarioAtual, perfil)) {
        return res.status(403).json({
          success: false,
          error: 'Você não tem permissão para alterar para este perfil'
        });
      }

      payload.perfil = perfil;
    }

    if (ativo !== undefined) {
      payload.ativo = ativo === true;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum dado informado para atualização'
      });
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select(`
        id,
        nome,
        email,
        perfil,
        ativo,
        criado_por_id,
        criado_em,
        atualizado_em,
        ultimo_login_em
      `)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: normalizarUsuario(data)
    });

  } catch (err) {
    console.error('ERRO ATUALIZAR USUÁRIO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar usuário'
    });
  }
}

/* =========================
   EXCLUIR USUÁRIO
========================= */
export async function excluirUsuario(req, res) {
  try {
    const usuarioAtual = await obterUsuarioAtual(req);
    const { id } = req.params;

    if (!podeAcessarGestaoUsuarios(usuarioAtual)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir usuários'
      });
    }

    if (usuarioAtual.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Você não pode excluir o próprio usuário'
      });
    }

    const usuarioAlvo = await buscarUsuarioPorId(id);

    if (!usuarioAlvo) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    if (!podeGerenciarPerfil(usuarioAtual, usuarioAlvo.perfil)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir este usuário'
      });
    }

    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true
    });

  } catch (err) {
    console.error('ERRO EXCLUIR USUÁRIO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao excluir usuário'
    });
  }
}

/* =========================
   DEFINIR SENHA DO USUÁRIO
========================= */
export async function definirSenhaUsuario(req, res) {
  try {
    const usuarioAtual = await obterUsuarioAtual(req);
    const { id } = req.params;
    const { senha } = req.body;

    if (!usuarioAtual) {
      return res.status(403).json({
        success: false,
        error: 'Usuário atual não identificado'
      });
    }

    if (!senha || String(senha).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    const usuarioAlvo = await buscarUsuarioPorId(id);

    if (!usuarioAlvo) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const editandoPropriaSenha = usuarioAtual.id === usuarioAlvo.id;

    if (!editandoPropriaSenha) {
      if (!podeAcessarGestaoUsuarios(usuarioAtual)) {
        return res.status(403).json({
          success: false,
          error: 'Você não tem permissão para definir senha de usuários'
        });
      }

      if (!podeGerenciarPerfil(usuarioAtual, usuarioAlvo.perfil)) {
        return res.status(403).json({
          success: false,
          error: 'Você não tem permissão para definir senha deste usuário'
        });
      }
    }

    const senhaHash = gerarHashSenha(senha);

    const { data, error } = await supabase
      .from('usuarios')
      .update({
        senha_hash: senhaHash
      })
      .eq('id', usuarioAlvo.id)
      .select(`
        id,
        nome,
        email,
        perfil,
        ativo,
        criado_por_id,
        criado_em,
        atualizado_em,
        ultimo_login_em
      `)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: normalizarUsuario(data)
    });

  } catch (err) {
    console.error('ERRO DEFINIR SENHA USUÁRIO:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao definir senha do usuário'
    });
  }
}