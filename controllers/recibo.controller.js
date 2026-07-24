import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { supabase } from '../lib/supabase.js';

const COR_INSTITUCIONAL = '#F2B705';
const COR_TEXTO = '#111111';
const COR_CINZA = '#666666';
const COR_LINHA = '#D8D8D8';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../assets/logo-cliente.png');

function formatarValor(valor) {
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  if (!data) return '—';

  const partes = String(data).split('-');

  if (partes.length !== 3) {
    return data;
  }

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function textoSeguro(valor, fallback = '—') {
  const texto = String(valor ?? '').trim();
  return texto || fallback;
}

function calcularValorPagoRecibo(locacao) {
  const temValorPagoInicial =
    locacao.valor_pago_inicial !== null &&
    locacao.valor_pago_inicial !== undefined &&
    String(locacao.valor_pago_inicial).trim() !== '';

  const temValorPagoFinal =
    locacao.valor_pago_final !== null &&
    locacao.valor_pago_final !== undefined &&
    String(locacao.valor_pago_final).trim() !== '';

  if (temValorPagoInicial || temValorPagoFinal) {
    return (
      Number(locacao.valor_pago_inicial || 0) +
      Number(locacao.valor_pago_final || 0)
    );
  }

  const temValorPagoLegado =
    locacao.valor_pago !== null &&
    locacao.valor_pago !== undefined &&
    String(locacao.valor_pago).trim() !== '';

  if (temValorPagoLegado) {
    return Number(locacao.valor_pago || 0);
  }

  return Number(locacao.valor_total || 0);
}

async function buscarConfiguracoesSistema() {
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select(`
      nome_estabelecimento,
      telefone_estabelecimento,
      endereco_estabelecimento,
      mensagem_recibo,
      valor_locker,
      valor_bagagem_avulsa,
      valor_hora_excedente,
      horas_inclusas
    `)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar configurações do sistema:', error);
  }

  return {
    nomeEstabelecimento: data?.nome_estabelecimento || 'Locker Rio',
    telefoneEstabelecimento: data?.telefone_estabelecimento || '+55 (21) 96921-4218',
    enderecoEstabelecimento: data?.endereco_estabelecimento || '',
    mensagemRecibo: data?.mensagem_recibo || 'Obrigado por utilizar o Locker Rio.',
    valorLocker: Number(data?.valor_locker ?? 30),
    valorBagagemAvulsa: Number(data?.valor_bagagem_avulsa ?? 30),
    valorHoraExcedente: Number(data?.valor_hora_excedente ?? 5),
    horasInclusas: Number(data?.horas_inclusas ?? 4)
  };
}

async function buscarDadosRecibo(locacaoId) {
  const { data: locacao, error: locacaoError } = await supabase
    .from('locacoes')
    .select('*')
    .eq('id', locacaoId)
    .single();

  if (locacaoError || !locacao) {
    throw new Error('Locação não encontrada');
  }

  const { data: lockersRelacao, error: lockersRelacaoError } = await supabase
    .from('locacao_lockers')
    .select('locker_id')
    .eq('locacao_id', locacaoId);

  if (lockersRelacaoError) {
    throw new Error('Erro ao buscar relação de lockers');
  }

  const lockerIds = (lockersRelacao || []).map(relacao => relacao.locker_id);

  let lockers = [];

  if (lockerIds.length > 0) {
    const { data: lockersData, error: lockersError } = await supabase
      .from('lockers')
      .select('id, numero')
      .in('id', lockerIds)
      .order('numero');

    if (lockersError) {
      throw new Error('Erro ao buscar lockers');
    }

    lockers = lockersData || [];
  }

  const { data: bagagens, error: bagagensError } = await supabase
    .from('bagagens_extras')
    .select('descricao, quantidade')
    .eq('locacao_id', locacaoId);

  if (bagagensError) {
    throw new Error('Erro ao buscar bagagens extras');
  }

  const configuracoes = await buscarConfiguracoesSistema();

  return {
    locacao,
    lockers,
    bagagens: bagagens || [],
    configuracoes
  };
}

function desenharLinha(doc, y, margemEsquerda, larguraUtil) {
  doc
    .strokeColor(COR_LINHA)
    .lineWidth(0.7)
    .moveTo(margemEsquerda, y)
    .lineTo(margemEsquerda + larguraUtil, y)
    .stroke()
    .strokeColor(COR_TEXTO);
}

function desenharTituloSecao(doc, titulo, x, y, width) {
  doc
    .fillColor(COR_TEXTO)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(titulo, x, y, { width });

  doc
    .strokeColor(COR_INSTITUCIONAL)
    .lineWidth(1)
    .moveTo(x, y + 13)
    .lineTo(x + width, y + 13)
    .stroke()
    .strokeColor(COR_TEXTO);
}

function desenharCampo(doc, label, valor, x, y, width, options = {}) {
  const fontSize = options.fontSize || 8.7;
  const labelWidth = options.labelWidth || 72;
  const gap = options.gap || 4;
  const valorTexto = textoSeguro(valor);
  const valorWidth = Math.max(20, width - labelWidth - gap);

  doc
    .font('Helvetica-Bold')
    .fontSize(fontSize)
    .fillColor(COR_TEXTO)
    .text(`${label}:`, x, y, {
      width: labelWidth,
      continued: false
    });

  const alturaValor = doc.heightOfString(valorTexto, {
    width: valorWidth,
    lineGap: 0
  });

  doc
    .font('Helvetica')
    .fontSize(fontSize)
    .fillColor(COR_TEXTO)
    .text(valorTexto, x + labelWidth + gap, y, {
      width: valorWidth,
      lineGap: 0
    });

  return Math.max(alturaValor, fontSize + 2) + 3;
}

export async function gerarReciboPDF(req, res) {
  try {
    const { id } = req.params;

    const {
      locacao,
      lockers,
      bagagens,
      configuracoes
    } = await buscarDadosRecibo(id);

    const isAvulsa = lockers.length === 0;
    const valorPagoRecibo = calcularValorPagoRecibo(locacao);
    const nomeArquivo = `recibo-${locacao.recibo_numero || locacao.id}.pdf`;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 24,
      bufferPages: false,
      autoFirstPage: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeArquivo}"`
    );

    doc.pipe(res);

    const margemEsquerda = 28;
    const margemDireita = 28;
    const larguraUtil = doc.page.width - margemEsquerda - margemDireita;
    const centroX = doc.page.width / 2;

    let y = 18;

    /* =========================
       CABEÇALHO COMPACTO
    ========================= */
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, centroX - 47, y, {
        fit: [94, 38],
        align: 'center',
        valign: 'center'
      });
      y += 42;
    }

    doc
      .fillColor(COR_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(
        (configuracoes.nomeEstabelecimento || 'LOCKER RIO').toUpperCase(),
        margemEsquerda,
        y,
        { width: larguraUtil, align: 'center' }
      );

    y += 20;

    doc
      .fillColor(COR_TEXTO)
      .font('Helvetica')
      .fontSize(9)
      .text('Guarda-volumes e bagagens', margemEsquerda, y, {
        width: larguraUtil,
        align: 'center'
      });

    y += 12;

    if (configuracoes.enderecoEstabelecimento) {
      doc
        .fillColor(COR_CINZA)
        .fontSize(7.5)
        .text(configuracoes.enderecoEstabelecimento, margemEsquerda, y, {
          width: larguraUtil,
          align: 'center'
        });
      y += 11;
    }

    desenharLinha(doc, y, margemEsquerda, larguraUtil);
    y += 10;

    /* =========================
       DADOS EM DUAS COLUNAS
    ========================= */
    const colunaGap = 14;
    const colunaWidth = (larguraUtil - colunaGap) / 2;
    const coluna1X = margemEsquerda;
    const coluna2X = margemEsquerda + colunaWidth + colunaGap;
    const topoBlocoY = y;

    desenharTituloSecao(doc, 'DADOS DO CLIENTE', coluna1X, y, colunaWidth);
    y += 18;
    y += desenharCampo(doc, 'Nome', locacao.cliente_nome, coluna1X, y, colunaWidth);
    y += desenharCampo(doc, 'Telefone', locacao.cliente_telefone, coluna1X, y, colunaWidth);
    y += desenharCampo(doc, 'Documento', locacao.cliente_documento, coluna1X, y, colunaWidth);
    y += desenharCampo(
      doc,
      'Cliente',
      locacao.in_rio_tour ? 'In Rio Tour' : 'Regular',
      coluna1X,
      y,
      colunaWidth
    );

    let yLocacao = topoBlocoY;
    desenharTituloSecao(doc, 'DADOS DA LOCAÇÃO', coluna2X, yLocacao, colunaWidth);
    yLocacao += 18;
    yLocacao += desenharCampo(doc, 'Recibo', locacao.recibo_numero || locacao.id, coluna2X, yLocacao, colunaWidth);
    yLocacao += desenharCampo(doc, 'Tipo', isAvulsa ? 'Bagagem avulsa' : 'Locker', coluna2X, yLocacao, colunaWidth);
    yLocacao += desenharCampo(doc, 'Data', formatarData(locacao.data), coluna2X, yLocacao, colunaWidth);
    yLocacao += desenharCampo(doc, 'Entrada', locacao.hora_entrada || '—', coluna2X, yLocacao, colunaWidth);
    yLocacao += desenharCampo(doc, 'Pago até', locacao.hora_pago_ate || '—', coluna2X, yLocacao, colunaWidth);
    yLocacao += desenharCampo(doc, 'Lacres', locacao.lacres || '—', coluna2X, yLocacao, colunaWidth);

    y = Math.max(y + 16, yLocacao + 16);
    desenharLinha(doc, y, margemEsquerda, larguraUtil);
    y += 10;

    /* =========================
       ITENS DA LOCAÇÃO
    ========================= */
    desenharTituloSecao(doc, 'ITENS DA LOCAÇÃO', margemEsquerda, y, larguraUtil);
    y += 18;

    doc.font('Helvetica').fontSize(8.8).fillColor(COR_TEXTO);

    if (!isAvulsa) {
      const numerosLockers = lockers
        .map(locker => locker.numero)
        .filter(numero => numero !== null && numero !== undefined)
        .join(', ');

      doc.text(`Armário(s): ${numerosLockers || '—'}`, margemEsquerda, y, {
        width: larguraUtil
      });
      y += 12;
    }

    if (bagagens.length > 0) {
      const descricaoBagagens = bagagens
        .map(bagagem => `${Number(bagagem.quantidade || 0)}x ${textoSeguro(bagagem.descricao, 'Bagagem')}`)
        .join(' | ');

      doc.text(`Bagagens extras: ${descricaoBagagens}`, margemEsquerda, y, {
        width: larguraUtil
      });
      y += Math.max(12, doc.heightOfString(`Bagagens extras: ${descricaoBagagens}`, {
        width: larguraUtil
      }) + 2);
    } else {
      doc.text('Bagagens extras: —', margemEsquerda, y, { width: larguraUtil });
      y += 12;
    }

    y += 4;

    /* =========================
       VALORES
    ========================= */
    const boxValorY = y;
    doc
      .roundedRect(margemEsquerda, boxValorY, larguraUtil, 32, 4)
      .fillAndStroke('#FFF8DF', COR_INSTITUCIONAL);

    doc
      .fillColor(COR_TEXTO)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('VALOR PAGO', margemEsquerda + 12, boxValorY + 10, {
        width: 180
      });

    doc
      .fillColor(COR_TEXTO)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(formatarValor(valorPagoRecibo), margemEsquerda + 190, boxValorY + 7, {
        width: larguraUtil - 202,
        align: 'right'
      });

    y += 42;

    /* =========================
       TERMOS COMPACTOS
    ========================= */
    desenharTituloSecao(doc, 'TERMOS E CONDIÇÕES DE USO', margemEsquerda, y, larguraUtil);
    y += 17;

    const termos = [
      '1. A Locker Rio disponibiliza o(s) locker(s) identificado(s) para guarda de volumes durante o período contratado.',
      '2. O cliente declara ter recebido a(s) chave(s) e está ciente de que somente com a chave é possível abrir o locker.',
      '3. A perda ou extravio da chave poderá gerar cobrança adicional referente à substituição e/ou abertura do locker.',
      `4. Após o horário contratado, poderá ser cobrado adicional de ${formatarValor(configuracoes.valorHoraExcedente)} por hora excedente.`,
      '5. A Locker Rio não se responsabiliza por objetos de alto valor deixados no interior do locker.',
      '6. O horário de funcionamento é das 09h às 18h, com tolerância de 30 minutos; após este período, a retirada poderá ocorrer no dia seguinte, mediante multa.'
    ];

    doc.font('Helvetica').fontSize(7.7).fillColor(COR_TEXTO);

    termos.forEach(termo => {
      const altura = doc.heightOfString(termo, { width: larguraUtil, lineGap: 0 });
      doc.text(termo, margemEsquerda, y, {
        width: larguraUtil,
        lineGap: 0
      });
      y += altura + 3;
    });

    y += 4;

    if (configuracoes.mensagemRecibo) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor(COR_CINZA)
        .text(configuracoes.mensagemRecibo, margemEsquerda, y, {
          width: larguraUtil,
          align: 'center'
        });

      y += doc.heightOfString(configuracoes.mensagemRecibo, {
        width: larguraUtil,
        align: 'center'
      }) + 6;
    }

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COR_TEXTO)
      .text('Ao assinar, o cliente declara estar de acordo com as condições acima.', margemEsquerda, y, {
        width: larguraUtil,
        align: 'center'
      });

    y += 24;

    /* =========================
       ASSINATURA
    ========================= */
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COR_TEXTO)
      .text('Assinatura do Cliente: _______________________________________________', margemEsquerda, y, {
        width: larguraUtil,
        align: 'center'
      });

    y += 18;

    /* =========================
       RODAPÉ
    ========================= */
    desenharLinha(doc, y, margemEsquerda, larguraUtil);
    y += 8;

    doc
      .font('Helvetica-Bold')
      .fontSize(8.2)
      .fillColor(COR_INSTITUCIONAL)
      .text(`WhatsApp: ${configuracoes.telefoneEstabelecimento || '+55 (21) 96921-4218'}`, margemEsquerda, y, {
        width: larguraUtil / 2,
        align: 'left',
        link: 'https://wa.me/5521969214218',
        underline: true
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8.2)
      .fillColor(COR_INSTITUCIONAL)
      .text('Instagram: @locker.rio', margemEsquerda + larguraUtil / 2, y, {
        width: larguraUtil / 2,
        align: 'right',
        link: 'https://instagram.com/locker.rio',
        underline: true
      });

    doc.end();
  } catch (err) {
    console.error('Erro PDF:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar recibo PDF'
    });
  }
}
