import { supabase } from '../lib/supabase.js';
import { verificarSenha } from '../lib/senhas.js';

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

/* =========================
   LOGIN
========================= */
export async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
    }

    if (!senha || !String(senha).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Senha é obrigatória'
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        perfil,
        ativo,
        senha_hash,
        criado_por_id,
        criado_em,
        atualizado_em,
        ultimo_login_em
      `)
      .eq('email', emailNormalizado)
      .maybeSingle();

    if (usuarioError) {
      return res.status(500).json({
        success: false,
        error: usuarioError.message
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha inválidos'
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        success: false,
        error: 'Usuário inativo'
      });
    }

    if (!usuario.senha_hash) {
      return res.status(401).json({
        success: false,
        error: 'Senha ainda não definida para este usuário'
      });
    }

    const senhaValida = verificarSenha(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha inválidos'
      });
    }

    const agora = new Date().toISOString();

    const { data: usuarioAtualizado, error: updateError } = await supabase
      .from('usuarios')
      .update({
        ultimo_login_em: agora
      })
      .eq('id', usuario.id)
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

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      data: {
        usuario: normalizarUsuario(usuarioAtualizado)
      }
    });

  } catch (err) {
    console.error('ERRO LOGIN:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao realizar login'
    });
  }
}