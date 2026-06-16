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
]
  .filter(Boolean)
  .map(url => url.replace(/\/$/, ''));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not permitted by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/lockers', lockersRoutes);
app.use('/locacoes', locacoesRoutes);
app.use('/mensagens', mensagensRoutes);
app.use('/recibos', reciboRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/configuracoes', configuracoesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});