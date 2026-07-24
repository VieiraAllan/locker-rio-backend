import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function obterJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET não configurado no ambiente');
  }

  return secret;
}

export function gerarTokenUsuario(usuario) {
  if (!usuario || !usuario.id) {
    throw new Error('Usuário inválido para geração de token');
  }

  const payload = {
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil
  };

  return jwt.sign(
    payload,
    obterJwtSecret(),
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

export function verificarTokenUsuario(token) {
  if (!token) {
    throw new Error('Token não informado');
  }

  return jwt.verify(token, obterJwtSecret());
}
