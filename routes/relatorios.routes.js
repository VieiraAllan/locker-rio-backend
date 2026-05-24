import express from 'express';
import {
  resumoRelatorio
} from '../controllers/relatorios.controller.js';

const router = express.Router();

/* =========================
   RESUMO DO RELATÓRIO
========================= */
router.get('/resumo', resumoRelatorio);

export default router;