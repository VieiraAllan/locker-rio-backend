import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { supabase } from '../lib/supabase.js';

const COR_INSTITUCIONAL = '#F2B705';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../assets/logo-cliente.png');

function formatarValor(valor) {
  const numero = Number(valor || 0);

  return `R$ ${numero.toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  if (!data) {
    return '—';
  }

  const partes = String(data).split('-');

  if (partes.length !== 3) {
    return data;
  }

  const [ano, mes, dia] = partes;
  return `${dia}-${mes}-${ano}`;
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
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=recibo-${locacao.recibo_numero || locacao.id}.pdf`
    );

    doc.pipe(res);

    /* =========================
       CABEÇALHO
    ========================= */
    const margemEsquerda = 40;
    const larguraUtil = 550 - 40;
    const topoY = 24;
    const logoWidth = 110;
    const logoHeight = 44;

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, (doc.page.width - logoWidth) / 2, topoY, {
        fit: [logoWidth, logoHeight],
        align: 'center',
        valign: 'center'
      });
    }

    const tituloY = topoY + logoHeight + 8;

    doc
      .fillColor(COR_INSTITUCIONAL)
      .fontSize(22)
      .text(
        (configuracoes.nomeEstabelecimento || 'LOCKER RIO').toUpperCase(),
        margemEsquerda,
        tituloY,
        {
          width: larguraUtil,
          align: 'center'
        }
      );

    doc
      .fontSize(12)
      .text(
        'Guarda-volumes e bagagens',
        margemEsquerda,
        tituloY + 24,
        {
          width: larguraUtil,
          align: 'center'
        }
      );

    const enderecoY = tituloY + 40;

    if (configuracoes.enderecoEstabelecimento) {
      doc
        .fontSize(9)
        .text(
          configuracoes.enderecoEstabelecimento,
          margemEsquerda,
          enderecoY,
          {
            width: larguraUtil,
            align: 'center'
          }
        );
    }

    const linhaY = configuracoes.enderecoEstabelecimento
      ? enderecoY + 18
      : tituloY + 46;

    doc
      .strokeColor(COR_INSTITUCIONAL)
      .lineWidth(1)
      .moveTo(40, linhaY)
      .lineTo(550, linhaY)
      .stroke();

    doc.y = linhaY + 16;
    doc.fillColor('black').strokeColor('black');

    /* =========================
       CLIENTE
    ========================= */
    doc.fontSize(14).text('DADOS DO CLIENTE', { underline: true });
    doc.fontSize(11);
    doc.text(`Nome: ${locacao.cliente_nome || '—'}`);
    doc.text(`Telefone: ${locacao.cliente_telefone || '—'}`);
    doc.text(`Documento / Observação: ${locacao.cliente_documento || '—'}`);
    doc.text(
      `Tipo de cliente: ${locacao.in_rio_tour ? 'In Rio Tour' : 'Cliente regular'}`
    );
    doc.moveDown(1);

    /* =========================
       LOCAÇÃO
    ========================= */
    doc.fontSize(14).text('DADOS DA LOCAÇÃO', { underline: true });
    doc.fontSize(11);
    doc.text(`Recibo Nº: ${locacao.recibo_numero || '—'}`);
    doc.text(`Tipo: ${isAvulsa ? 'Bagagem avulsa' : 'Locker'}`);
    doc.text(`Data: ${formatarData(locacao.data)}`);
    doc.text(`Entrada: ${locacao.hora_entrada || '—'}`);
    doc.text(`Pago até: ${locacao.hora_pago_ate || '—'}`);

    if (locacao.lacres) {
      doc.text(`Lacres: ${locacao.lacres}`);
    } else {
      doc.text('Lacres: —');
    }

    doc.moveDown(1);

    /* =========================
       ARMÁRIOS
    ========================= */
    if (!isAvulsa) {
      doc.fontSize(14).text('ARMÁRIOS', { underline: true });
      doc.fontSize(11);

      lockers.forEach(locker => {
        doc.text(`• Armário ${locker.numero}`);
      });

      doc.moveDown(1);
    }

    /* =========================
       BAGAGENS EXTRAS
    ========================= */
    if (bagagens.length > 0) {
      doc.fontSize(14).text('BAGAGENS EXTRAS', { underline: true });
      doc.fontSize(11);

      bagagens.forEach(bagagem => {
        doc.text(`• ${bagagem.quantidade}x ${bagagem.descricao}`);
      });

      doc.moveDown(1);
    }

    /* =========================
       VALOR
    ========================= */
    const valorPagoInicial = Number(
      locacao.valor_pago_inicial ?? locacao.valor_pago ?? 0
    );

    doc
      .fontSize(16)
      .text(
        `VALOR PAGO: ${formatarValor(valorPagoInicial)}`,
        { align: 'right' }
      );

    doc.moveDown(2);

    /* =========================
       TERMOS
    ========================= */
    doc.fontSize(13).text('TERMOS E CONDIÇÕES DE USO', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const termos = [
      '1. A Locker Rio se compromete a disponibilizar o(s) locker(s) acima identificado(s) para guarda de volumes durante o período contratado.',
      '2. O cliente declara que recebeu a(s) chave(s) do(s) locker(s) e está ciente de que somente com a chave é possível realizar a abertura.',
      '3. A perda ou extravio da chave poderá gerar cobrança de taxa adicional, referente à substituição e/ou abertura do locker.',
      '4. Em caso de permanência além do horário contratado, o cliente concorda com a cobrança adicional de R$5,00 (cinco reais) por hora excedente.',
      '5. A Locker Rio não se responsabiliza por objetos de alto valor deixados no interior do locker, como dinheiro em espécie, jóias, documentos ou equipamentos eletrônicos.',
      '6. O horário de funcionamento é das 09h às 18h, com tolerância de 30 minutos; após este período, a unidade será encerrada e a retirada dos volumes só poderá ser realizada no dia seguinte, mediante pagamento de multa.'
    ];

    termos.forEach(termo => {
      doc.text(termo);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    if (configuracoes.mensagemRecibo) {
      doc.text(configuracoes.mensagemRecibo);
      doc.moveDown(1);
    }

    doc.text('Ao assinar, o cliente declara estar de acordo com as condições acima.');
    doc.moveDown(2);

    /* =========================
       ASSINATURA
    ========================= */
    doc.text('Assinatura do Cliente: _________________________________');
    doc.moveDown(1);

    /* =========================
       CONTATO
    ========================= */
    doc
      .fontSize(10)
      .fillColor(COR_INSTITUCIONAL)
      .text(
        `WhatsApp: ${configuracoes.telefoneEstabelecimento || '+55 (21) 96921-4218'}`,
        {
          align: 'center',
          link: 'https://wa.me/5521969214218',
          underline: true
        }
      );

    doc.moveDown(0.2);

    doc.text(
      'Instagram: @locker.rio',
      {
        align: 'center',
        link: 'https://instagram.com/locker.rio',
        underline: true
      }
    );

    doc.end();

  } catch (err) {
    console.error('Erro PDF:', err);

    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar recibo PDF'
    });
  }
}
