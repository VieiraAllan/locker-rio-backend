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
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

/* =========================
   MIDDLEWARES
========================= */
app.use(cors({
  origin(origin, callback) {
    // permite requisições sem origin (Postman, curl, servidor-servidor)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  }
}));

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
  console.log(`Servidor rodando na porta ${PORT}`);
});