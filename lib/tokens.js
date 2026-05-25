import jwt from 'jsonwebtoken';

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
      expiresIn: '12h'
    }
  );
}

export function verificarTokenUsuario(token) {
  if (!token) {
    throw new Error('Token não informado');
  }

  return jwt.verify(token, obterJwtSecret());
}