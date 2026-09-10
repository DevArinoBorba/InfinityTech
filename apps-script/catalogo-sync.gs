/**
 * INFINITYTECH — SINCRONIZAÇÃO DO CATÁLOGO
 * =========================================================================
 * Web App que recebe o relatório de estoque do sistema do cliente (enviado
 * pela página /admin-catalogo.html) e reescreve a aba de produtos da
 * planilha, PRESERVANDO as categorias e fotos já cadastradas manualmente.
 *
 * O relatório do cliente só traz NOME + PREÇO. A categoria (e futuramente a
 * foto) é trabalho manual acumulado ao longo do tempo — por isso ela vive
 * numa aba de memória ("Cadastro") que nunca é apagada e é recolada nos
 * produtos a cada envio. Produto novo ganha uma categoria sugerida
 * automaticamente a partir do nome (~92% de acerto medido no catálogo atual).
 *
 * -------------------------------------------------------------------------
 * COMO INSTALAR (uma única vez)
 * -------------------------------------------------------------------------
 * 1. Abra a planilha do catálogo > Extensões > Apps Script.
 * 2. Apague o conteúdo do Code.gs, cole este arquivo inteiro e salve.
 * 3. Engrenagem (Configurações do projeto) > Propriedades do script >
 *    Adicionar propriedade:  CATALOGO_SENHA  =  <senha que o cliente vai
 *    digitar na página de upload>.
 * 4. Implantar > Nova implantação > tipo "App da Web":
 *      Executar como: Eu
 *      Quem pode acessar: Qualquer pessoa
 *    Implantar > autorizar > copie a URL que termina em /exec.
 * 5. Cole essa URL em js/admin-catalogo.js na constante SYNC_URL.
 *
 * IMPORTANTE: a aba de produtos precisa continuar sendo a aba publicada em
 * Arquivo > Compartilhar > Publicar na web (a que o catálogo lê como CSV).
 * =========================================================================
 */

// Nome da aba que o catálogo lê (a publicada em CSV). Se a aba tiver outro
// nome, troque aqui — vazio significa "a primeira aba da planilha".
var ABA_PRODUTOS = '';

// Aba de memória: guarda Nome | Categoria | Foto de TODO produto já visto.
// É criada sozinha no primeiro envio e nunca é apagada.
var ABA_CADASTRO = 'Cadastro';

// Aba de histórico dos envios (criada sozinha).
var ABA_LOG = 'Historico';

var CABECALHO = ['Nome', 'Categoria', 'Preço', 'Foto'];
var CATEGORIA_PADRAO = 'OUTROS';

// Abaixo dessa confiança o palpite de categoria vira chute (medido no
// catálogo atual: acima disso o acerto é ~94%, abaixo despenca). Nesse caso
// o produto entra em OUTROS, que é honesto e fácil de achar na planilha.
var CONFIANCA_MINIMA = 0.35;

// =========================================================================
// ENTRADA HTTP
// =========================================================================

/** Recebe o envio da página de admin. */
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, erro: 'payload_invalido' });
  }

  var uploadId = String(payload.uploadId || '').slice(0, 60);

  if (String(payload.senha || '') !== senhaConfigurada()) {
    salvarStatus(uploadId, { ok: false, estado: 'erro', erro: 'senha_incorreta' });
    return json({ ok: false, erro: 'senha_incorreta' });
  }

  var produtos = payload.produtos;
  if (!produtos || !produtos.length) {
    salvarStatus(uploadId, { ok: false, estado: 'erro', erro: 'planilha_vazia' });
    return json({ ok: false, erro: 'planilha_vazia' });
  }

  // Trava pra dois envios simultâneos não se atropelarem no meio da escrita.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    salvarStatus(uploadId, { ok: false, estado: 'erro', erro: 'ocupado' });
    return json({ ok: false, erro: 'ocupado' });
  }

  try {
    salvarStatus(uploadId, { ok: true, estado: 'processando' });
    var resultado = sincronizar(produtos);
    resultado.estado = 'concluido';
    resultado.ok = true;
    salvarStatus(uploadId, resultado);
    return json(resultado);
  } catch (err) {
    salvarStatus(uploadId, { ok: false, estado: 'erro', erro: String((err && err.message) || err) });
    return json({ ok: false, erro: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * ?action=status&id=... — a página de upload pergunta aqui como foi o envio,
 * já que o POST é disparado sem leitura de resposta pra não esbarrar em CORS.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === 'status') {
    var status = lerStatus(String(params.id || ''));
    return json(status || { estado: 'desconhecido' });
  }
  if (params.action === 'ping') {
    return json({ ok: true, produtos: abaProdutos().getLastRow() - 1 });
  }
  return json({ ok: true, servico: 'infinitytech-catalogo-sync' });
}

// =========================================================================
// SINCRONIZAÇÃO
// =========================================================================

/**
 * Reescreve a aba de produtos a partir do relatório recebido.
 * produtos: [[nome, preco], ...] com preço já convertido em número.
 */
function sincronizar(produtos) {
  var aba = abaProdutos();
  var memoria = carregarMemoria(aba);

  // Índice de palavras -> categorias, montado com tudo que já está
  // categorizado. É o que dá o palpite de categoria pra produto novo.
  var indice = montarIndice(memoria);

  var vistos = {};
  var linhas = [];
  var novos = [];
  var duplicados = 0;
  var semPreco = 0;

  for (var i = 0; i < produtos.length; i++) {
    var nome = String(produtos[i][0] || '').trim();
    if (!nome) continue;

    // A página de upload já filtra os zerados; aqui é rede de segurança pra
    // nenhum "R$ 0,00" chegar na vitrine por outro caminho.
    var preco = Number(produtos[i][1]) || 0;
    if (preco <= 0) { semPreco++; continue; }

    var chave = normalizar(nome);
    if (vistos[chave]) { duplicados++; continue; }
    vistos[chave] = true;

    var conhecido = memoria[chave];
    var categoria = conhecido && conhecido.categoria;
    var foto = (conhecido && conhecido.foto) || '';

    if (!categoria) {
      var palpite = sugerirCategoria(chave, indice);
      categoria = palpite.confianca >= CONFIANCA_MINIMA && palpite.categoria
        ? palpite.categoria
        : CATEGORIA_PADRAO;
      novos.push({ nome: nome, categoria: categoria, confianca: palpite.confianca });
    }

    linhas.push([nome, categoria, formatarPreco(preco), foto]);
    memoria[chave] = { nome: nome, categoria: categoria, foto: foto };
  }

  if (!linhas.length) throw new Error('nenhum_produto_valido');

  // Quantos produtos da planilha antiga não vieram no relatório novo. Eles
  // saem do catálogo (o relatório é a fonte da verdade do que existe), mas
  // continuam na aba Cadastro com a categoria salva — se voltarem a ser
  // vendidos, voltam já categorizados.
  var sumiram = 0;
  for (var k in memoria) {
    if (!vistos[k]) sumiram++;
  }

  escreverProdutos(aba, linhas);
  gravarMemoria(memoria);
  registrarLog(linhas.length, novos.length, sumiram, duplicados);

  return {
    total: linhas.length,
    novos: novos.length,
    novosExemplos: novos.slice(0, 60),
    sumiram: sumiram,
    duplicados: duplicados,
    semPreco: semPreco,
    atualizadoEm: new Date().toISOString()
  };
}

/** Substitui o conteúdo da aba de produtos pelas linhas novas. */
function escreverProdutos(aba, linhas) {
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha > 0) {
    aba.getRange(1, 1, ultimaLinha, Math.max(aba.getLastColumn(), CABECALHO.length)).clearContent();
  }
  aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]);
  // Preço como texto puro pra planilha não converter "R$ 1.234,00" em número
  // ou data e o CSV sair diferente do que o catálogo espera.
  aba.getRange(2, 3, linhas.length, 1).setNumberFormat('@');
  aba.getRange(2, 1, linhas.length, CABECALHO.length).setValues(linhas);
}

/**
 * Memória de categorias: junta o que está hoje na aba de produtos com o que
 * já existe na aba Cadastro. A aba de produtos tem prioridade — é onde o
 * cliente costuma corrigir a categoria na mão.
 */
function carregarMemoria(abaProd) {
  var memoria = {};

  var cadastro = planilha().getSheetByName(ABA_CADASTRO);
  if (cadastro && cadastro.getLastRow() > 1) {
    var dadosCad = cadastro.getRange(2, 1, cadastro.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < dadosCad.length; i++) {
      var nomeCad = String(dadosCad[i][0] || '').trim();
      if (!nomeCad) continue;
      memoria[normalizar(nomeCad)] = {
        nome: nomeCad,
        categoria: String(dadosCad[i][1] || '').trim(),
        foto: String(dadosCad[i][2] || '').trim()
      };
    }
  }

  if (abaProd.getLastRow() > 1) {
    var dadosProd = abaProd.getRange(2, 1, abaProd.getLastRow() - 1, 4).getValues();
    for (var j = 0; j < dadosProd.length; j++) {
      var nomeProd = String(dadosProd[j][0] || '').trim();
      if (!nomeProd) continue;
      var chave = normalizar(nomeProd);
      var anterior = memoria[chave] || {};
      memoria[chave] = {
        nome: nomeProd,
        categoria: String(dadosProd[j][1] || '').trim() || anterior.categoria || '',
        foto: String(dadosProd[j][3] || '').trim() || anterior.foto || ''
      };
    }
  }

  return memoria;
}

/** Regrava a aba Cadastro com a memória acumulada (nome, categoria, foto). */
function gravarMemoria(memoria) {
  var aba = planilha().getSheetByName(ABA_CADASTRO);
  if (!aba) {
    aba = planilha().insertSheet(ABA_CADASTRO);
  }

  var linhas = [];
  for (var chave in memoria) {
    var item = memoria[chave];
    linhas.push([item.nome, item.categoria || '', item.foto || '']);
  }
  linhas.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });

  if (aba.getLastRow() > 0) {
    aba.getRange(1, 1, aba.getLastRow(), Math.max(aba.getLastColumn(), 3)).clearContent();
  }
  aba.getRange(1, 1, 1, 3).setValues([['Nome', 'Categoria', 'Foto']]);
  if (linhas.length) {
    aba.getRange(2, 1, linhas.length, 3).setValues(linhas);
  }
}

function registrarLog(total, novos, sumiram, duplicados) {
  var aba = planilha().getSheetByName(ABA_LOG);
  if (!aba) {
    aba = planilha().insertSheet(ABA_LOG);
    aba.getRange(1, 1, 1, 5).setValues([['Data', 'Produtos', 'Novos', 'Sumiram', 'Duplicados']]);
  }
  aba.appendRow([new Date(), total, novos, sumiram, duplicados]);
}

// =========================================================================
// CATEGORIA SUGERIDA PARA PRODUTO NOVO
// =========================================================================

/**
 * Monta um índice palavra -> {categoria: peso} a partir dos produtos já
 * categorizados. As duas primeiras palavras do nome pesam mais porque é onde
 * fica o tipo da peça ("TELA IPHONE 11", "FLEX DE CARGA MOTOROLA G35").
 */
function montarIndice(memoria) {
  var indice = {};
  var totalProdutos = 0;

  for (var chave in memoria) {
    var categoria = memoria[chave].categoria;
    if (!categoria) continue;
    totalProdutos++;

    var palavras = tokens(chave);
    for (var i = 0; i < palavras.length; i++) {
      var palavra = palavras[i];
      var peso = i === 0 ? 3 : (i === 1 ? 2 : 1);
      if (!indice[palavra]) indice[palavra] = { _total: 0 };
      indice[palavra][categoria] = (indice[palavra][categoria] || 0) + peso;
      indice[palavra]._total += peso;
    }
  }

  indice._n = Math.max(totalProdutos, 1);
  return indice;
}

/** Retorna {categoria, confianca} para um nome ainda não categorizado. */
function sugerirCategoria(chaveNome, indice) {
  var pontos = {};
  var somaTotal = 0;
  var palavras = tokens(chaveNome);

  for (var i = 0; i < palavras.length; i++) {
    var mapa = indice[palavras[i]];
    if (!mapa || typeof mapa !== 'object') continue;
    var peso = (i === 0 ? 3 : (i === 1 ? 2 : 1)) * Math.log(1 + indice._n / mapa._total);
    for (var categoria in mapa) {
      if (categoria === '_total') continue;
      var valor = peso * mapa[categoria] / mapa._total;
      pontos[categoria] = (pontos[categoria] || 0) + valor;
      somaTotal += valor;
    }
  }

  var melhor = '';
  var melhorValor = 0;
  for (var cat in pontos) {
    if (pontos[cat] > melhorValor) { melhorValor = pontos[cat]; melhor = cat; }
  }

  if (!melhor) return { categoria: '', confianca: 0 };
  return { categoria: melhor, confianca: Math.round(100 * melhorValor / somaTotal) / 100 };
}

/** Palavras úteis do nome (ignora conectivos e letras soltas). */
function tokens(nomeNormalizado) {
  var brutos = nomeNormalizado.match(/[A-Z0-9]+/g) || [];
  var saida = [];
  for (var i = 0; i < brutos.length; i++) {
    if (brutos[i].length >= 2 && brutos[i] !== 'DE' && brutos[i] !== 'DA' && brutos[i] !== 'DO') {
      saida.push(brutos[i]);
    }
  }
  return saida;
}

// =========================================================================
// UTILITÁRIOS
// =========================================================================

function planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function abaProdutos() {
  var ss = planilha();
  var aba = ABA_PRODUTOS ? ss.getSheetByName(ABA_PRODUTOS) : ss.getSheets()[0];
  if (!aba) throw new Error('aba_produtos_nao_encontrada');
  return aba;
}

function senhaConfigurada() {
  return PropertiesService.getScriptProperties().getProperty('CATALOGO_SENHA') || '';
}

/** Mesma normalização usada no admin-catalogo.js: sem acento, em maiúsculo. */
function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** 30 -> "R$ 30,00" (mesmo formato que o catálogo já lê hoje). */
function formatarPreco(valor) {
  var n = Number(valor) || 0;
  var partes = n.toFixed(2).split('.');
  var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'R$ ' + inteiro + ',' + partes[1];
}

function salvarStatus(uploadId, dados) {
  if (!uploadId) return;
  try {
    CacheService.getScriptCache().put('status_' + uploadId, JSON.stringify(dados), 3600);
  } catch (err) { /* status é conveniência: nunca derruba o envio */ }
}

function lerStatus(uploadId) {
  if (!uploadId) return null;
  var bruto = CacheService.getScriptCache().get('status_' + uploadId);
  return bruto ? JSON.parse(bruto) : null;
}

function json(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
