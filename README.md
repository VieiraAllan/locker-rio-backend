🔐 Locker Rio — Backend
Backend do sistema Locker Rio, uma API desenvolvida em Node.js + Express para gerenciamento de lockers, locações, bagagens extras, recibos, mensagens, relatórios, configurações operacionais e usuários com perfis de acesso.

Este backend é responsável por toda a regra de negócio do sistema, integração com o banco Supabase/PostgreSQL, geração de recibos em PDF, mensagens para WhatsApp e controle de permissões.

📌 Sobre o projeto
O Locker Rio é um sistema para operação de guarda-volumes, lockers e bagagens extras/avulsas.

A API permite:

controlar lockers disponíveis, ocupados e em manutenção;
criar locações com locker;
criar locações de bagagem avulsa;
registrar bagagens extras vinculadas a uma locação;
finalizar locações;
calcular valores com base nas configurações do sistema;
gerar histórico de locações;
gerar relatórios financeiros e operacionais;
gerar mensagens para WhatsApp;
gerar recibos em PDF;
gerenciar usuários reais com perfis;
preparar autenticação por email e senha.
🧱 Tecnologias utilizadas
Node.js
Express
Supabase
PostgreSQL
PDFKit
CORS
dotenv
Crypto nativo do Node.js para hash/verificação de senhas
📂 Estrutura principal
locker-rio-backend/
├── controllers/
│   ├── auth.controller.js
│   ├── configuracoes.controller.js
│   ├── locacoes.controller.js
│   ├── mensagens.controller.js
│   ├── recibo.controller.js
│   ├── relatorios.controller.js
│   └── usuarios.controller.js
│
├── lib/
│   ├── senhas.js
│   └── supabase.js
│
├── routes/
│   ├── auth.routes.js
│   ├── configuracoes.routes.js
│   ├── lockers.routes.js
│   ├── locacoes.routes.js
│   ├── mensagens.routes.js
│   ├── recibo.routes.js
│   ├── relatorios.routes.js
│   └── usuarios.routes.js
│
├── index.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
👨‍💻 Autor
Projeto desenvolvido por Állan R. Vieira

📄 Licença
Projeto privado em desenvolvimento. Todos os direitos reservados.