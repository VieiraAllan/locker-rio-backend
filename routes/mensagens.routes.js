import express from 'express';
import { gerarMensagemWhatsApp } from '../controllers/mensagens.controller.js';

const router = express.Router();

/*
  Exemplos:
  GET /mensagens/123/finalizacao?telefone=5521999999999&idioma=pt
  GET /mensagens/123/abertura?telefone=5521999999999&idioma=en
  GET /mensagens/123/atraso?telefone=5521999999999&idioma=es
  GET /mensagens/123/fechamento_proximo?telefone=5521999999999&idioma=pt
*/
router.get('/:id/:tipo', gerarMensagemWhatsApp);

export default router;