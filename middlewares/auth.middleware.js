import { supabase } from '../lib/supabase.js';
import { verificarTokenUsuario } from '../lib/tokens.js';

export async function autenticarUsuario(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';

    const partes = authorization.split(' ');
    const tipo = partes[0];
    const token = partes[1];

    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não informado'
      });
    }

    const payload = verificarTokenUsuario(token);

    const { data: usuario, error } = await supabase
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
      .eq('id', payload.sub)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        success: false,
        error: 'Usuário inativo'
      });
    }

    req.usuario = usuario;

    return next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
}

export function permitirPerfis(...perfisPermitidos) {
  return function verificarPerfil(req, res, next) {
    if (!req.usuario || !req.usuario.perfil) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para acessar este recurso'
      });
    }

    return next();
  };
}