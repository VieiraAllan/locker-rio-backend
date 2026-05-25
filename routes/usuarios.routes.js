import express from 'express';

import { autenticarUsuario } from '../middlewares/auth.middleware.js';

import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  definirSenhaUsuario
} from '../controllers/usuarios.controller.js';

const router = express.Router();

/* =========================
   TODAS AS ROTAS ABAIXO EXIGEM TOKEN
========================= */
router.use(autenticarUsuario);

/* =========================
   LISTAR USUÁRIOS
========================= */
router.get('/', listarUsuarios);

/* =========================
   CRIAR USUÁRIO
========================= */
router.post('/', criarUsuario);

/* =========================
   DEFINIR SENHA DO USUÁRIO
========================= */
router.put('/:id/senha', definirSenhaUsuario);

/* =========================
   ATUALIZAR USUÁRIO
========================= */
router.put('/:id', atualizarUsuario);

/* =========================
   EXCLUIR USUÁRIO
========================= */
router.delete('/:id', excluirUsuario);

export default router;