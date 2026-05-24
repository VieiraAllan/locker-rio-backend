import { supabase } from '../lib/supabase.js';

export async function listarLockers(req, res) {
  try {
    const { status } = req.query;

    let query = supabase
      .from('lockers')
      .select('*')
      .order('numero');

    // se vier ?status=disponivel | ocupado | manutencao
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao listar lockers'
    });
  }
}