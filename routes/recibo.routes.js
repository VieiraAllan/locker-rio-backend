import express from 'express';
import { gerarReciboPDF } from '../controllers/recibo.controller.js';

const router = express.Router();

router.get('/:id/pdf', gerarReciboPDF);

export default router;