import express from 'express';

import {
  buscarConfiguracoes,
  atualizarConfiguracoes
} from '../controllers/configuracoes.controller.js';

const router = express.Router();

/* =========================
   BUSCAR CONFIGURAÇÕES
========================= */
router.get('/', buscarConfiguracoes);

/* =========================
   ATUALIZAR CONFIGURAÇÕES
========================= */
router.put('/', atualizarConfiguracoes);

export default router;