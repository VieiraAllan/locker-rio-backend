import express from 'express';

import {
  autenticarUsuario,
  permitirPerfis
} from '../middlewares/auth.middleware.js';

import {
  buscarConfiguracoes,
  atualizarConfiguracoes
} from '../controllers/configuracoes.controller.js';

const router = express.Router();

/* =========================
   CONFIGURAÇÕES OPERACIONAIS
   Permitido para admin e gerente
========================= */
router.use(
  autenticarUsuario,
  permitirPerfis('admin', 'gerente')
);

/* =========================
   BUSCAR CONFIGURAÇÕES
========================= */
router.get('/', buscarConfiguracoes);

/* =========================
   ATUALIZAR CONFIGURAÇÕES
========================= */
router.put('/', atualizarConfiguracoes);

export default router;