import crypto from 'crypto';

const TAMANHO_CHAVE = 64;

export function gerarHashSenha(senha) {
  const senhaTexto = String(senha || '');

  if (!senhaTexto) {
    throw new Error('Senha inválida');
  }

  const salt = crypto.randomBytes(16).toString('hex');

  const hash = crypto
    .scryptSync(senhaTexto, salt, TAMANHO_CHAVE)
    .toString('hex');

  return `scrypt:${salt}:${hash}`;
}

export function verificarSenha(senha, senhaHash) {
  if (!senha || !senhaHash) {
    return false;
  }

  const partes = String(senhaHash).split(':');

  if (partes.length !== 3) {
    return false;
  }

  const [algoritmo, salt, hashOriginal] = partes;

  if (algoritmo !== 'scrypt') {
    return false;
  }

  const hashTeste = crypto
    .scryptSync(String(senha), salt, TAMANHO_CHAVE)
    .toString('hex');

  const bufferOriginal = Buffer.from(hashOriginal, 'hex');
  const bufferTeste = Buffer.from(hashTeste, 'hex');

  if (bufferOriginal.length !== bufferTeste.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferOriginal, bufferTeste);
}