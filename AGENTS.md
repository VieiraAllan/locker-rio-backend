# AGENTS.md — Locker Rio Backend

## 1. Finalidade

Este arquivo orienta agentes de IA e pessoas desenvolvedoras que trabalham no backend do sistema Locker Rio.

O backend é uma API Node.js + Express integrada ao Supabase/PostgreSQL, responsável por autenticação, autorização, lockers, locações, bagagens, usuários, configurações, relatórios, mensagens de WhatsApp e geração de recibos PDF.

Toda alteração deve preservar regras de negócio, integridade referencial, segurança dos dados pessoais e compatibilidade com o frontend.

## 2. Princípios obrigatórios

- Segurança, integridade e auditabilidade vêm antes da velocidade.
- O backend é a fonte definitiva de autenticação, autorização e validação.
- Nunca confiar em perfil, ID de usuário, valores calculados ou flags sensíveis enviados pelo frontend.
- Não expor detalhes internos, stack traces, SQL, secrets ou mensagens brutas do banco ao cliente.
- Não montar SQL com concatenação ou template literal contendo input do usuário.
- Usar `supabase-js`, queries parametrizadas ou funções SQL seguras.
- Não criar arquivos duplicados com nomes `.final`, `.corrigido`, `.v2` ou equivalentes.
- Não alterar `main` diretamente; trabalhar em branch dedicada.
- Não fazer merge ou push sem solicitação explícita.

## 3. Stack e execução

- Node.js
- Express
- JavaScript com ES Modules
- Supabase/PostgreSQL
- JWT com `jsonwebtoken`
- PDFKit

Comandos esperados:

```bash
npm install
npm start
npm run dev
npm audit
```

Script local esperado:

```json
{
  "dev": "node --watch index.js"
}
```

## 4. Variáveis de ambiente

O backend pode usar:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=valor-ficticio
JWT_SECRET=valor-ficticio
JWT_EXPIRES_IN=12h
FRONTEND_URL=http://localhost:5173
TZ=America/Sao_Paulo
```

Regras:

- `SUPABASE_SERVICE_ROLE_KEY` somente no backend.
- `JWT_SECRET` somente no backend.
- Nunca commitar `.env`.
- Manter `.env.example` com valores fictícios.
- O `.gitignore` deve permitir `.env.example` e ignorar arquivos reais de ambiente.
- Não registrar secrets em logs.
- Em produção, usar HTTPS fornecido pela plataforma.

## 5. Autenticação JWT

- JWT deve ter expiração configurada, com padrão de 12 horas.
- O valor pode vir de `JWT_EXPIRES_IN`, com fallback seguro.
- Assinar tokens somente com `JWT_SECRET` do ambiente.
- Validar tokens com `jwt.verify`.
- Token ausente, inválido ou expirado deve retornar `401 Unauthorized`.
- Falta de permissão de perfil deve retornar `403 Forbidden`.
- Nunca usar `jwt.decode` como validação.
- Nunca aceitar identidade por header arbitrário, como `x-usuario-id`.
- `req.usuario` preenchido pelo middleware autenticado é a fonte oficial do usuário.

Ao criar uma locação, não confiar em:

```txt
usuario_abertura_id
usuario_abertura_nome
usuario_abertura_perfil
```

enviados pelo body. Usar:

```js
usuario_abertura_id: req.usuario.id,
usuario_abertura_nome: req.usuario.nome,
usuario_abertura_perfil: req.usuario.perfil
```

## 6. Autorização e perfis

Perfis atuais:

- `atendente`
- `gerente`
- `admin` / `administrador`

- Todas as rotas operacionais com dados internos devem exigir autenticação.
- Rotas administrativas devem usar middleware central de perfis.
- A autorização deve ser negada por padrão.
- Não duplicar checagens de perfil inconsistentes em múltiplos controllers.
- Uma checagem adicional no controller pode ser usada como defesa em profundidade, sem substituir o middleware.

Exemplo esperado:

```js
router.post(
  '/',
  autenticarUsuario,
  permitirPerfis('admin', 'gerente'),
  criarLocker
);
```

### Rotas de locações

Salvo decisão arquitetural documentada em contrário, estas rotas devem exigir JWT:

```txt
POST /locacoes
GET /locacoes/ativas
GET /locacoes/historico
GET /locacoes/avulsas-ativas
POST /locacoes/:id/finalizar
PUT /locacoes/:id/cliente
```

Essas rotas manipulam ou retornam nome, telefone, documento, observação interna, horários, valores e outros dados operacionais.

Não criar painel público ou totem anônimo sem revisão específica de privacidade e minimização de dados.

## 7. Banco, Supabase e SQL Injection

- Preferir `supabase.from(...).select/insert/update/delete`.
- Nunca interpolar input em SQL cru.
- Se usar SQL manual, empregar parâmetros/bind variables.
- Revisar toda função `.rpc()` e nunca executar SQL dinâmico fornecido pelo cliente.
- RLS deve permanecer habilitado nas tabelas públicas.
- Service role bypassa RLS e deve ficar apenas no backend.
- Monitorar constraints e integridade no banco, não apenas validação em código.

Antes de adicionar ou alterar queries:

- validar UUIDs;
- fazer `trim` em strings;
- limitar tamanhos;
- validar enums/status;
- validar números e impedir `NaN`, infinito e negativos indevidos;
- validar arrays e quantidade máxima de itens.

## 8. Integridade dos lockers

### Criação

- Somente administrador e gerente.
- `numero` obrigatório e normalizado.
- Duplicidade deve retornar `409 Conflict`.
- Deve existir constraint ou índice `UNIQUE` em `lockers.numero`.
- Consulta prévia melhora UX, mas não substitui a constraint.
- Tratar erro PostgreSQL `23505` como conflito.
- Novo locker começa com status `disponivel`.

### Exclusão

- Somente administrador e gerente.
- Locker inexistente: `404`.
- Locker ocupado: `409`.
- Locker com locação ativa: `409`.
- Locker com histórico: `409`, orientando manutenção.
- Locker sem histórico pode ser excluído.
- Não quebrar relações históricas.
- Para robustez máxima, operações de verificação e exclusão devem ser atômicas quando houver concorrência relevante.

### Manutenção

- Locker em manutenção não pode receber nova locação.
- Reativação deve restaurar `disponivel` somente se não houver impedimento operacional.

## 9. Regras de negócio de locações

- Cliente regular não pode pagar na abertura acima do valor contratado.
- Cliente In Rio Tour possui valor variável, inclusive zero.
- Para In Rio Tour, o valor total deve refletir a regra vigente e permitir ajuste final autorizado.
- Bagagem avulsa e bagagem extra devem manter cálculos separados e consistentes.
- Observação interna é dado operacional.
- Observação interna não deve aparecer no recibo nem nas mensagens WhatsApp.
- O backend deve salvar data e hora no fuso operacional `America/Sao_Paulo` ou usar estratégia UTC consistente.
- `TZ=America/Sao_Paulo` deve permanecer configurado no ambiente de produção.
- O cálculo de excedente deve ser testado em mudanças de dia e horários após meia-noite.

## 10. Dados pessoais e minimização

O sistema trata dados pessoais:

- nome;
- telefone;
- documento;
- observação interna;
- registros de locação;
- futuramente, fotos.

Regras:

- Não expor rotas de listagem sem autenticação.
- Não retornar campos desnecessários.
- Não escrever dados pessoais completos em logs.
- Não incluir observação interna em recibo ou WhatsApp.
- Não expor dados internos em mensagens de erro.
- Avaliar retenção e exclusão conforme necessidade operacional e requisitos legais aplicáveis.

## 11. CORS, headers e limites

CORS de produção deve aceitar apenas origens autorizadas:

```txt
FRONTEND_URL de produção
http://localhost:5173 no desenvolvimento
```

Evitar `app.use(cors())` aberto em produção.

Usar:

- `helmet` para headers de segurança;
- `app.disable('x-powered-by')`;
- `express.json({ limit: '1mb' })` ou limite coerente;
- rate limit no login;
- rate limit adicional em rotas sensíveis, conforme necessidade.

Exemplo de login limiter:

```js
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente mais tarde.'
  }
});
```

## 12. Validação de entrada

Toda entrada deve ser validada no backend, mesmo que o frontend já valide.

Validar:

- UUIDs e IDs;
- strings obrigatórias;
- comprimento máximo;
- telefones;
- documentos;
- status e enums;
- valores monetários;
- quantidades;
- arrays de locker IDs;
- arquivos e MIME types futuramente.

Preferir validação centralizada com Zod ou Joi quando introduzida de forma incremental e testada.

Mensagens de erro devem ser claras e estáveis, sem revelar implementação interna.

## 13. Status HTTP

Usar consistentemente:

```txt
200 OK                  operação concluída
201 Created             recurso criado
400 Bad Request         entrada inválida
401 Unauthorized        autenticação ausente, inválida ou expirada
403 Forbidden           perfil sem permissão
404 Not Found           recurso inexistente
409 Conflict            conflito de regra ou integridade
429 Too Many Requests   rate limit
500 Internal Server Error falha interna não exposta
```

Não retornar `500` para conflito previsto de negócio.

## 14. Recibos e mensagens

### Recibos

- Gerar PDF sem HTML de usuário.
- Disposição de download deve usar nome com extensão `.pdf`.
- Recibo de abertura mostra valor pago inicial.
- Recibo histórico mostra total efetivamente pago.
- Documento aparece como `Documento`.
- Observação interna nunca aparece.
- Layout deve permanecer em uma página quando os dados estiverem dentro dos limites definidos.
- Validar tamanho de textos para evitar overflow no PDF.

### WhatsApp

- Normalizar telefone sem prefixar `55` em número internacional explícito.
- Incluir bagagens extras quando existirem.
- Incluir valor a pagar somente quando existir pendência.
- Não incluir observação interna.
- Garantir que todos os placeholders sejam substituídos.
- Não aceitar template ou URL arbitrária do cliente.

## 15. Uploads e fotos futuras

Quando fotos forem implementadas:

- Usar Supabase Storage privado.
- Não salvar base64 ou binários grandes na tabela.
- Salvar somente metadados no banco.
- Validar MIME, extensão, assinatura do arquivo e tamanho.
- Limitar quantidade de fotos por locação.
- Usar path gerado pelo backend.
- Usar signed URLs com validade curta.
- Fotos temporárias devem ter `expires_at` e rotina de remoção.
- Permitir anexar após a finalização somente com autenticação e autorização.
- Não confiar no nome original para formar path.

## 16. Logs e auditoria

- Usar `console.error` apenas com contexto necessário e sem secrets/dados pessoais desnecessários.
- Não retornar stack trace ao cliente.
- Registrar ações sensíveis quando a auditoria for implementada:
  - login;
  - criação/finalização de locação;
  - ajuste manual;
  - manutenção;
  - criação/exclusão de locker;
  - alteração de configuração;
  - gestão de usuários;
  - exclusão de fotos.
- Não registrar senha, JWT ou service role.

## 17. Git, ambiente e dependências

O `.gitignore` deve conter:

```gitignore
.env
.env.local
.env.*.local
!.env.example
```

Antes de commit:

```bash
git status --short
git diff
npm audit
npm start
```

Procurar conflitos e artefatos:

```bash
grep -RInE '^(<<<<<<<|=======|>>>>>>>)' .
git ls-files
git status --short
```

Não usar automaticamente:

```bash
npm audit fix --force
```

Analisar atualizações principais antes de aplicá-las.

## 18. Fluxo obrigatório para agentes

Ao receber uma solicitação:

1. Inspecionar rotas, controller, middleware e contrato do frontend.
2. Identificar autenticação e perfis necessários.
3. Identificar impacto em banco e migrations.
4. Validar integridade referencial.
5. Propor a menor alteração segura.
6. Preservar regras atuais.
7. Atualizar frontend se o contrato mudar.
8. Executar testes disponíveis e informar limitações.
9. Informar variáveis de ambiente necessárias.
10. Sugerir commit específico.
11. Não fazer merge ou push sem autorização.

## 19. Checklist antes de concluir uma entrega

- [ ] A rota exige autenticação?
- [ ] A rota exige perfil específico?
- [ ] A identidade vem de `req.usuario`?
- [ ] Inputs foram validados e normalizados?
- [ ] Há SQL cru ou `.rpc()` inseguro?
- [ ] Constraints do banco protegem concorrência?
- [ ] RLS permanece habilitado?
- [ ] Service role permanece apenas no backend?
- [ ] CORS está restrito?
- [ ] Rate limit é necessário?
- [ ] Secrets ou dados pessoais aparecem em logs?
- [ ] Erros internos são ocultados?
- [ ] Status HTTP está correto?
- [ ] Regras In Rio Tour permanecem corretas?
- [ ] Observação interna continua privada?
- [ ] Recibo e WhatsApp permanecem coerentes?
- [ ] Timezone foi considerado?
- [ ] Não há marcadores de conflito?
- [ ] `npm audit` foi revisado?
- [ ] O diff contém apenas alterações intencionais?

## 20. Commits sugeridos

```txt
feat(lockers): adicionar cadastro e exclusao segura de lockers
fix(locacoes): proteger rotas operacionais com autenticacao
fix(auth): remover identificacao por header nao confiavel
fix(security): restringir CORS e adicionar rate limit
docs: atualizar instrucoes do backend
chore(backend): atualizar ambiente de desenvolvimento
```

## 21. Limites do agente

- Não assumir que uma rota é pública sem requisito explícito.
- Não confiar em campos de usuário enviados pelo cliente.
- Não remover proteção de histórico para facilitar exclusão.
- Não desabilitar RLS como solução rápida.
- Não expor service role.
- Não apagar dados de produção sem seleção prévia, transação e confirmação explícita.
- Não inventar schema, tabela ou coluna; conferir migrations/Supabase.
- Não modificar contrato de API sem coordenar frontend e documentação.
- Não afirmar que o sistema está blindado sem auditar rotas, dependências, ambiente e banco.
