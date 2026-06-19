import { supabase } from '../lib/supabase.js';

/* ======================================================
   TEMPLATES DE MENSAGENS
====================================================== */

const templatesMensagens = {
  abertura: {
    pt: `*Olá! Seja bem-vindo(a) à Locker Rio* 👋
É um prazer cuidar das suas bagagens enquanto você aproveita o Rio!

📦 *Dados do locker*
Locker(s): n° {lockers}
Lacre: {lacre}

⏰ *Horário*
Entrada no locker: {data} às {hora_entrada}
Período pago até: {hora_pago_ate}

💰 *Valor pago*
R$ {valor_pago_inicial}

⚠️ *Avisos importantes*
• Em caso de ultrapassar o horário contratado, será acrescido o valor de *R$ {valor_hora_excedente} por hora adicional*.
• *Não perca a chave do locker*. Somente o cliente com a chave consegue abrir o locker.
Em caso de *extravio da chave*, poderá ser cobrada uma taxa adicional.
• O *horário de funcionamento* é das *09h às 18h*, com tolerância de 30 minutos;
após este período, a unidade será *encerrada* e a retirada dos volumes só poderá ser realizada *no dia seguinte*, *mediante pagamento de multa*.

Caso precise de qualquer ajuda, nossa equipe estará à disposição. Aproveite seu dia e curta o Rio com mais leveza! 🌴☀️

📲 *Redes sociais*
Instagram: @locker.rio
WhatsApp: +55 (21) 96921-4218`,

    en: `*Hello! Welcome to Locker Rio* 👋
It’s a pleasure to take care of your luggage while you enjoy Rio!

📦 *Locker details*
Locker(s): No. {lockers}
Seal: {lacre}

⏰ *Schedule*
Locker check-in: {data} at {hora_entrada}
Paid period until: {hora_pago_ate}

💰 *Amount paid*
R$ {valor_pago_inicial}

⚠️ *Important notices*
• If the agreed time is exceeded, an additional fee of *R$ {valor_hora_excedente} per extra hour* will be charged.
• *Please do not lose the locker key*. Only the customer with the key can open the locker.
In case of a *lost key*, an additional fee may apply.
• *Operating hours* are from *09:00 AM to 06:00 PM*, with a 30-minute grace period;
after this time, the facility will be *closed*, and items can only be retrieved *the following day*, *subject to a fine*.

If you need any assistance, our team will be happy to help. Enjoy your day and experience Rio with ease! 🌴☀️

📲 *Social media*
Instagram: @locker.rio
WhatsApp: +55 (21) 96921-4218`,

    es: `*¡Hola! Bienvenido(a) a Locker Rio* 👋
¡Es un placer cuidar de su equipaje mientras disfruta de Río!

📦 *Datos del locker*
Locker(s): n.º {lockers}
Precinto: {lacre}

⏰ *Horario*
Entrada al locker: {data} a las {hora_entrada}
Período pagado hasta: {hora_pago_ate}

💰 *Valor pagado*
R$ {valor_pago_inicial}

⚠️ *Avisos importantes*
• En caso de exceder el horario contratado, se añadirá un valor de *R$ {valor_hora_excedente} por cada hora adicional*.
• *No pierda la llave del locker*. Solo el cliente con la llave puede abrir el locker.
En caso de *pérdida de la llave*, podrá aplicarse un cargo adicional.
• El *horario de funcionamiento* es de *09:00 a 18:00 horas*, con una tolerancia de 30 minutos;
tras este periodo, el local permanecerá *cerrado* y la retirada de las pertenencias solo podrá realizarse *al día siguiente*, *mediante el pago de una multa*.

Si necesita cualquier ayuda, nuestro equipo estará a su disposición. ¡Disfrute su día y viva Río con más libertad! 🌴☀️

📲 *Redes sociales*
Instagram: @locker.rio
WhatsApp: +55 (21) 96921-4218`
  },

  finalizacao: {
    pt: `*RETIRADA CONCLUÍDA!* ✅

Confirmamos que seus volumes já foram retirados. *Esperamos que tenha aproveitado o Rio de Janeiro com a nossa ajuda!* ☀️

Ficamos muito felizes em cuidar dos seus pertences. Esperamos que sua experiência tenha sido excelente e que você volte mais vezes.

*Pode nos dar uma mãozinha?* Sua avaliação no Google nos ajuda muito. Leva menos de 1 minuto:
📍 https://g.page/r/CUL3ZqXi7q6SEBM/review

Acompanhe nossas novidades:
📸 instagram.com/locker.rio/

Até a próxima! 👋`,

    en: `*PICKUP CONFIRMED!* ✅

We confirm that your items have been successfully collected. *We hope you enjoyed Rio even more with our help!* ☀️

It was a pleasure to keep your belongings safe. We hope you had a great experience and look forward to seeing you again.

*Could you do us a quick favor?* Your feedback on Google means a lot to us. It takes less than a minute:
📍 https://g.page/r/CUL3ZqXi7q6SEBM/review

Follow us on Instagram:
📸 instagram.com/locker.rio/

See you next time! 👋`,

    es: `*¡RECOGIDA COMPLETADA!* ✅

Confirmamos que sus pertenencias ya han sido retiradas. *¡Esperamos que haya disfrutado de Río con nuestra ayuda!* ☀️

Ha sido un placer cuidar de su equipaje. Esperamos que su experiencia haya sido excelente y que vuelva a visitarnos pronto.

*¿Podría hacernos un favor?* Su opinión en Google es muy importante para nosotros. Le tomará menos de un minuto:
📍 https://g.page/r/CUL3ZqXi7q6SEBM/review

Síganos en Instagram:
📸 instagram.com/locker.rio/

¡Hasta la próxima! 👋`
  },

  atraso: {
    pt: `*ATENÇÃO!* ⚠️

Informamos que o horário contratado para a retirada das malas expirou há *{horas_excedentes} hora(s)*.

Conforme nossa política de uso, foi gerada uma taxa adicional de *R$ {valor_hora_excedente} por locker*. Ressaltamos que esse mesmo valor será aplicado a cada hora excedente até a retirada definitiva dos itens.

Por favor, realize a retirada o quanto antes para evitar novos acréscimos.`,

    en: `*ATTENTION!* ⚠️

We would like to inform you that the scheduled time for luggage pickup expired *{horas_excedentes} hour(s) ago*.

As per our terms of service, an additional fee of *R$ {valor_hora_excedente} per locker* has been applied. Please be advised that the same amount will be charged for every subsequent hour until the items are collected.

Please collect your belongings as soon as possible to avoid further charges.`,

    es: `*¡ATENCIÓN!* ⚠️

Le informamos que el horario contratado para la retirada de sus maletas expiró hace *{horas_excedentes} hora(s)*.

De acuerdo con nuestra política de uso, se ha generado un cargo adicional de *R$ {valor_hora_excedente} por locker*. Le recordamos que este mismo valor se aplicará por cada hora excedente hasta la retirada definitiva de sus pertenencias.

Por favor, realice la retirada lo antes posible para evitar cargos adicionales.`
  },

  fechamento_proximo: {
    pt: `*ATENÇÃO!* ⚠️

Informamos que faltam *15 minutos* para o fechamento da nossa loja (às 18h).

Possuímos uma tolerância de *30 minutos* após este horário. Após esse período, as atividades serão oficialmente encerradas e a retirada de volumes só poderá ser realizada *amanhã*, *a partir das 09h*, mediante o pagamento de multa por pernoite.

Por favor, organize-se para retirar seus pertences dentro do prazo.`,

    en: `*ATTENTION!* ⚠️

Please be advised that we are *15 minutes* away from closing (at 6:00 PM).

We offer a *30-minute* grace period after closing time. Beyond that, our operations will officially end, and luggage collection will only be possible *tomorrow*, *starting at 9:00 AM*, subject to an overnight storage fine.

Please ensure you collect your items before the deadline.`,

    es: `*¡ATENCIÓN!* ⚠️

Le informamos que faltan *15 minutos* para el cierre de nuestra tienda (a las 18:00h).

Contamos con una tolerancia de *30 minutos* después de este horario. Una vez finalizado este plazo, las actividades terminarán oficialmente y la retirada de sus pertenencias solo podrá realizarse *mañana*, *a partir de las 09:00h*, previo pago de una multa por pernoctación.

Por favor, organícese para retirar sus objetos dentro del plazo previsto.`
  }
};

/* ======================================================
   HELPERS
====================================================== */

function normalizarIdioma(idioma = 'pt') {
  const idiomaNormalizado = String(idioma || 'pt').toLowerCase();

  if (['pt', 'en', 'es'].includes(idiomaNormalizado)) {
    return idiomaNormalizado;
  }

  return 'pt';
}

function formatarValorMensagem(valor) {
  return Number(valor || 0).toFixed(2).replace('.', ',');
}

function formatarDataMensagem(data) {
  if (!data) return '-';

  const partes = String(data).split('-');

  if (partes.length !== 3) {
    return data;
  }

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function normalizarTelefone(telefone = '') {
  const telefoneOriginal = String(telefone || '').trim();
  const apenasNumeros = telefoneOriginal.replace(/\D/g, '');

  if (!apenasNumeros) {
    return '';
  }

  // Remove repetições indevidas do DDI 55 no começo: 5555..., 555555...
  const semDuplicidadeBrasil = apenasNumeros.replace(/^(55){2,}/, '55');

  // Se a pessoa digitou em formato internacional explícito (+ ou 00),
  // respeita o DDI informado por ela
  if (telefoneOriginal.startsWith('+')) {
    return semDuplicidadeBrasil;
  }

  if (telefoneOriginal.startsWith('00')) {
    return telefoneOriginal.replace(/\D/g, '').replace(/^00/, '');
  }

  // Se já começa com 55, mantém
  if (semDuplicidadeBrasil.startsWith('55')) {
    return semDuplicidadeBrasil;
  }

  // Se tem tamanho típico de número internacional já informado com DDI,
  // não força o 55
  if (apenasNumeros.length >= 12) {
    return apenasNumeros;
  }

  // Caso contrário, assume número brasileiro sem DDI
  return `55${apenasNumeros}`;
}

function renderizarTemplate(template, variaveis = {}) {
  let resultado = template;

  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`\\{${chave}\\}`, 'g');
    resultado = resultado.replace(regex, String(valor ?? ''));
  });

  return resultado;
}

function calcularHorasExcedentes(locacao) {
  if (!locacao?.data || !locacao?.hora_pago_ate) {
    return 0;
  }

  const agora = new Date();
  const dataHoraPagoAte = new Date(`${locacao.data}T${locacao.hora_pago_ate}`);

  if (
    locacao.hora_entrada &&
    locacao.hora_pago_ate &&
    String(locacao.hora_pago_ate) < String(locacao.hora_entrada)
  ) {
    dataHoraPagoAte.setDate(dataHoraPagoAte.getDate() + 1);
  }

  const diffMs = agora - dataHoraPagoAte;

  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / (1000 * 60 * 60));
}

async function buscarDadosMensagem(locacaoId) {
  const { data: locacao, error: locacaoError } = await supabase
    .from('locacoes')
    .select(`
      id,
      recibo_numero,
      data,
      hora_entrada,
      hora_pago_ate,
      valor_pago_inicial,
      valor_pago_final,
      valor_total,
      lacres,
      cliente_nome,
      cliente_telefone,
      status
    `)
    .eq('id', locacaoId)
    .single();

  if (locacaoError || !locacao) {
    throw new Error('Locação não encontrada');
  }

  const { data: relacoesLockers, error: relacoesError } = await supabase
    .from('locacao_lockers')
    .select('locker_id')
    .eq('locacao_id', locacaoId);

  if (relacoesError) {
    throw new Error('Erro ao buscar lockers da locação');
  }

  const lockerIds = (relacoesLockers || []).map(item => item.locker_id);

  let lockers = [];

  if (lockerIds.length > 0) {
    const { data: lockersData, error: lockersError } = await supabase
      .from('lockers')
      .select('numero')
      .in('id', lockerIds)
      .order('numero');

    if (lockersError) {
      throw new Error('Erro ao buscar lockers');
    }

    lockers = lockersData || [];
  }

  const { data: configuracoes, error: configuracoesError } = await supabase
    .from('configuracoes_sistema')
    .select(`
      valor_hora_excedente
    `)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (configuracoesError) {
    throw new Error('Erro ao buscar configurações do sistema');
  }

  return {
    locacao,
    lockers,
    configuracoes: {
      valorHoraExcedente: Number(configuracoes?.valor_hora_excedente ?? 5)
    }
  };
}

function montarVariaveisMensagem({ locacao, lockers, configuracoes }) {
  const numerosLockers = Array.isArray(lockers) && lockers.length > 0
    ? lockers.map(locker => locker.numero).join(', ')
    : 'Bagagem avulsa';

  const horasExcedentes = calcularHorasExcedentes(locacao);

  return {
    cliente_nome: locacao.cliente_nome || '',
    lockers: numerosLockers,
    lacre: locacao.lacres || '-',
    data: formatarDataMensagem(locacao.data),
    hora_entrada: locacao.hora_entrada || '-',
    hora_pago_ate: locacao.hora_pago_ate || '-',
    valor_pago_inicial: formatarValorMensagem(locacao.valor_pago_inicial || 0),
    valor_pago_final: formatarValorMensagem(locacao.valor_pago_final || 0),
    valor_total: formatarValorMensagem(locacao.valor_total || 0),
    valor_hora_excedente: formatarValorMensagem(
      configuracoes.valorHoraExcedente || 0
    ),
    horas_excedentes: horasExcedentes
  };
}

/* ======================================================
   CONTROLLER — GERAR MENSAGEM
====================================================== */

export async function gerarMensagemWhatsApp(req, res) {
  try {
    const { id, tipo } = req.params;
    const idioma = normalizarIdioma(req.query.idioma);
    const telefone = normalizarTelefone(req.query.telefone || '');

    if (!templatesMensagens[tipo]) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de mensagem inválido'
      });
    }

    const { locacao, lockers, configuracoes } = await buscarDadosMensagem(id);

    const template = templatesMensagens[tipo][idioma];

    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Idioma inválido para esta mensagem'
      });
    }

    const variaveis = montarVariaveisMensagem({
      locacao,
      lockers,
      configuracoes
    });

    const mensagem = renderizarTemplate(template, variaveis);

    const whatsappLink = telefone
      ? `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`
      : '';

    return res.json({
      success: true,
      data: {
        tipo,
        idioma,
        telefone,
        mensagem,
        whatsapp_link: whatsappLink
      }
    });

  } catch (err) {
    console.error('ERRO GERAR MENSAGEM WHATSAPP:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar mensagem do WhatsApp'
    });
  }
}