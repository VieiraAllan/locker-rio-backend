import express from 'express';
import {
  mensagemInicio,
  mensagemAtraso,
  mensagemFinalizacao
} from '../controllers/mensagens.controller.js';

const router = express.Router();

router.get('/:id/inicio', mensagemInicio);
router.get('/:id/atraso', mensagemAtraso);
router.get('/:id/finalizacao', mensagemFinalizacao);

export default router;