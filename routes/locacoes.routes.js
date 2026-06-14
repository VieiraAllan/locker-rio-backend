import express from 'express';
import {
  criarLocacao,
  finalizarLocacao,
  atualizarDadosClienteLocacao,
  listarAvulsasAtivas,
  listarLocacoesAtivas,
  listarHistoricoLocacoes
} from '../controllers/locacoes.controller.js';

const router = express.Router();

/* =========================
   LISTAR LOCAÇÕES ATIVAS
========================= */
router.get('/ativas', listarLocacoesAtivas);

/* =========================
   LISTAR HISTÓRICO DE LOCAÇÕES
========================= */
router.get('/historico', listarHistoricoLocacoes);

/* =========================
   LISTAR BAGAGENS AVULSAS ATIVAS
========================= */
router.get('/avulsas-ativas', listarAvulsasAtivas);

/* =========================
   CRIAR LOCAÇÃO
========================= */
router.post('/', criarLocacao);

/* =========================
   ATUALIZAR DADOS DO CLIENTE
========================= */
router.put('/:id/cliente', atualizarDadosClienteLocacao);

/* =========================
   FINALIZAR LOCAÇÃO
========================= */
router.post('/:id/finalizar', finalizarLocacao);

export default router;
