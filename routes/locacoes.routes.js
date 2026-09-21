import express from 'express';
import {
  criarLocacao,
  finalizarLocacao,
  atualizarDadosClienteLocacao,
  listarAvulsasAtivas,
  listarLocacoesAtivas,
  listarHistoricoLocacoes
} from '../controllers/locacoes.controller.js';
import { autenticarUsuario } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/ativas', autenticarUsuario, listarLocacoesAtivas);
router.get('/historico', autenticarUsuario, listarHistoricoLocacoes);
router.get('/avulsas-ativas', autenticarUsuario, listarAvulsasAtivas);
router.post('/', autenticarUsuario, criarLocacao);
router.put('/:id/cliente', autenticarUsuario, atualizarDadosClienteLocacao);
router.post('/:id/finalizar', autenticarUsuario, finalizarLocacao);

export default router;