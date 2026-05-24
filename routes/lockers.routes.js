import express from 'express';
import { supabase } from '../lib/supabase.js';
import { listarLockers } from '../controllers/lockers.controller.js';

const router = express.Router();

/* =========================
   LISTAR LOCKERS
========================= */
router.get('/', listarLockers);

/* =========================
   BUSCAR LOCAÇÃO ATIVA DE UM LOCKER
   (CORRIGIDO)
========================= */
router.get('/:id/locacao-ativa', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('locacao_lockers')
    .select(`
      locacao_id,
      locacoes!inner(status)
    `)
    .eq('locker_id', id)
    .eq('locacoes.status', 'ativa')
    .limit(1);

  if (error || !data || data.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Nenhuma locação ativa encontrada para este locker'
    });
  }

  return res.json({
    success: true,
    locacao_id: data[0].locacao_id
  });
});

export default router;