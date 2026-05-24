import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import lockersRoutes from './routes/lockers.routes.js';
import locacoesRoutes from './routes/locacoes.routes.js';
import mensagensRoutes from './routes/mensagens.routes.js';
import reciboRoutes from './routes/recibo.routes.js';
import relatoriosRoutes from './routes/relatorios.routes.js';
import configuracoesRoutes from './routes/configuracoes.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = 3000;

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   ROTAS BÁSICAS
========================= */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =========================
   ROTAS DO SISTEMA
========================= */
app.use('/lockers', lockersRoutes);
app.use('/locacoes', locacoesRoutes);
app.use('/mensagens', mensagensRoutes);
app.use('/recibos', reciboRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/configuracoes', configuracoesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);

/* =========================
   START DO SERVIDOR
========================= */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});