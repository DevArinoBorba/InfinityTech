/**
 * INFINITYTECH — ATUALIZAÇÃO DO CATÁLOGO (PÁGINA INTERNA)
 * Lê o relatório de estoque exportado pelo sistema do cliente (.xlsx/.csv),
 * mostra o que vai mudar no catálogo e envia os produtos para o Apps Script,
 * que reescreve a planilha preservando as categorias já cadastradas.
 *
 * O arquivo é lido no próprio navegador: nada sai daqui até o cliente
 * conferir a prévia e clicar em publicar.
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURAÇÃO
  // ==========================================================================
  // URL do Web App gerado por apps-script/catalogo-sync.gs
  // (Implantar > Nova implantação > App da Web > copie a URL que termina em /exec)
  const SYNC_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';

  // Mesma planilha publicada que o catálogo lê — usada só para montar a
  // prévia do que vai mudar antes de enviar.
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkXiJv2PqMEL5L9FXPt16uuXsoLmdAY9A3PebIrGZP9C7uANzCDvAdw-7dEjRULYS5zAtV8EzS2EOa/pub?gid=0&single=true&output=csv';

  // Resolve a raiz do site a partir da URL deste próprio script — funciona
  // tanto em admin-catalogo.html quanto no espelho admin-catalogo/index.html.
  const SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';
  const SITE_BASE = SCRIPT_SRC.replace(/js\/admin-catalogo\.js(\?.*)?$/, '');

  const MAX_LINHAS_LISTA = 40;
  const POLL_INTERVALO = 2500;
  const POLL_TENTATIVAS = 72; // ~3 minutos

  const state = {
    arquivo: null,
    produtos: [],      // [{ nome, preco, chave }]
    semPreco: [],      // itens zerados no relatório — não vão para o site
    duplicados: 0,
    catalogoAtual: null, // Map chave -> { nome, preco }
    diff: null,
  };

  const els = {};

  // ==========================================================================
  // NORMALIZAÇÃO E PREÇO (mesma lógica do catalogo.js e do Apps Script)
  // ==========================================================================
  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function parsePreco(bruto) {
    if (bruto === null || bruto === undefined) return 0;
    if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : 0;

    let valor = String(bruto).replace(/[^\d.,-]/g, '').trim();
    if (!valor) return 0;

    const temVirgula = valor.includes(',');
    const temPonto = valor.includes('.');

    if (temVirgula && temPonto) {
      valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula) {
      valor = valor.replace(',', '.');
    }

    const numero = parseFloat(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarPreco(valor) {
    return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function pareceNumero(bruto) {
    if (typeof bruto === 'number') return true;
    const texto = String(bruto || '').trim();
    if (!texto) return false;
    return /^R?\$?\s*-?[\d.,]+$/.test(texto);
  }

  /** Valor tem casas decimais — o sinal que separa preço de código/estoque. */
  function temCentavos(bruto) {
    if (typeof bruto === 'number') return bruto % 1 !== 0;
    return /[.,]\d{1,2}\s*$/.test(String(bruto || '').trim());
  }

  // ==========================================================================
  // LEITURA DA PLANILHA DO CLIENTE
  // ==========================================================================
  function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('falha_leitura'));
      reader.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array', cellDates: false });
          const aba = wb.Sheets[wb.SheetNames[0]];
          // header:1 = matriz crua; defval mantém as colunas alinhadas mesmo
          // quando o sistema do cliente exporta células vazias no meio.
          resolve(XLSX.utils.sheet_to_json(aba, { header: 1, defval: '', raw: true }));
        } catch (err) {
          reject(new Error('formato_invalido'));
        }
      };
      reader.readAsArrayBuffer(arquivo);
    });
  }

  /**
   * O relatório do cliente sai sem cabeçalho, com nome na coluna A e preço na
   * B — mas em vez de fixar isso, descobrimos as colunas pelo conteúdo. Assim
   * o envio continua funcionando se o sistema passar a exportar uma coluna a
   * mais (código, estoque) ou incluir um cabeçalho.
   */
  function detectarColunas(linhas) {
    const amostra = linhas.filter((l) => l.some((c) => String(c).trim() !== '')).slice(0, 400);
    if (!amostra.length) throw new Error('planilha_vazia');

    const totalColunas = amostra.reduce((max, l) => Math.max(max, l.length), 0);
    let idxPreco = -1;
    let melhorPreco = 0;
    let idxNome = -1;
    let melhorTexto = 0;

    let melhorTaxaPreco = 0;

    for (let col = 0; col < totalColunas; col++) {
      let comPreco = 0;
      let comCentavos = 0;
      let somaTexto = 0;
      let celulasTexto = 0;

      amostra.forEach((linha) => {
        const celula = linha[col];
        if (celula === '' || celula === null || celula === undefined) return;
        if (pareceNumero(celula) && parsePreco(celula) > 0) {
          comPreco++;
          if (temCentavos(celula)) comCentavos++;
        } else {
          somaTexto += String(celula).trim().length;
          celulasTexto++;
        }
      });

      // Coluna de código e coluna de estoque também são 100% numéricas — o
      // que separa a de preço é ter centavos. O >= garante que, em empate,
      // fica a coluna mais à direita (preço costuma ser a última).
      const taxaPreco = comPreco / amostra.length;
      const notaPreco = taxaPreco * (1 + (comPreco ? comCentavos / comPreco : 0));
      if (taxaPreco >= 0.6 && notaPreco >= melhorPreco) {
        melhorPreco = notaPreco;
        melhorTaxaPreco = taxaPreco;
        idxPreco = col;
      }

      const mediaTexto = celulasTexto ? somaTexto / celulasTexto : 0;
      const taxaTexto = (celulasTexto / amostra.length) * mediaTexto;
      if (taxaTexto > melhorTexto) { melhorTexto = taxaTexto; idxNome = col; }
    }

    if (idxPreco === -1 || melhorTaxaPreco < 0.6) throw new Error('coluna_preco_nao_encontrada');
    if (idxNome === -1 || idxNome === idxPreco) throw new Error('coluna_nome_nao_encontrada');

    // Se a primeira linha não tem preço válido, é cabeçalho e sai fora.
    const primeira = linhas.find((l) => l.some((c) => String(c).trim() !== '')) || [];
    const temCabecalho = !(pareceNumero(primeira[idxPreco]) && parsePreco(primeira[idxPreco]) > 0);

    return { idxNome, idxPreco, temCabecalho };
  }

  function linhasParaProdutos(linhas) {
    const { idxNome, idxPreco, temCabecalho } = detectarColunas(linhas);

    const vistos = new Set();
    const produtos = [];
    const semPreco = [];
    let duplicados = 0;
    let pulouCabecalho = !temCabecalho;

    linhas.forEach((linha) => {
      if (!linha || !linha.some((c) => String(c).trim() !== '')) return;
      if (!pulouCabecalho) { pulouCabecalho = true; return; }

      const nome = String(linha[idxNome] === undefined ? '' : linha[idxNome]).trim();
      if (!nome) return;

      const chave = normalizar(nome);
      if (vistos.has(chave)) { duplicados++; return; }
      vistos.add(chave);

      const preco = parsePreco(linha[idxPreco]);
      // Item zerado no relatório é item sem preço cadastrado (ou lançamento
      // de controle, tipo "CANCELADA/DEVOLUÇÃO"). No atacado, "R$ 0,00" na
      // vitrine parece defeito — então fica de fora e aparece na prévia.
      if (preco <= 0) { semPreco.push({ nome, chave, preco: 0 }); return; }

      produtos.push({ nome, chave, preco });
    });

    if (!produtos.length) throw new Error('nenhum_produto');
    return { produtos, duplicados, semPreco };
  }

  // ==========================================================================
  // CATÁLOGO ATUAL (para a prévia do que muda)
  // ==========================================================================
  function parseCSV(texto) {
    const linhas = [];
    let linha = [];
    let campo = '';
    let entreAspas = false;

    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      const prox = texto[i + 1];

      if (entreAspas) {
        if (c === '"' && prox === '"') { campo += '"'; i++; }
        else if (c === '"') entreAspas = false;
        else campo += c;
      } else if (c === '"') {
        entreAspas = true;
      } else if (c === ',') {
        linha.push(campo); campo = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && prox === '\n') i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = '';
      } else {
        campo += c;
      }
    }
    if (campo.length > 0 || linha.length > 0) { linha.push(campo); linhas.push(linha); }

    return linhas.filter((l) => l.some((c) => c.trim() !== ''));
  }

  async function carregarCatalogoAtual() {
    try {
      const res = await fetch(CSV_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const linhas = parseCSV(await res.text());
      if (linhas.length < 2) return null;

      const mapa = new Map();
      linhas.slice(1).forEach((celulas) => {
        const nome = (celulas[0] || '').trim();
        if (!nome) return;
        mapa.set(normalizar(nome), { nome, preco: parsePreco(celulas[2]), categoria: (celulas[1] || '').trim() });
      });
      return mapa;
    } catch (err) {
      return null;
    }
  }

  function montarDiff(produtos, atual) {
    if (!atual) return null;

    const novos = [];
    const alterados = [];
    const chavesEnviadas = new Set();

    produtos.forEach((p) => {
      chavesEnviadas.add(p.chave);
      const antigo = atual.get(p.chave);
      if (!antigo) { novos.push(p); return; }
      if (Math.abs(antigo.preco - p.preco) >= 0.005) {
        alterados.push({
          nome: p.nome,
          categoria: antigo.categoria,
          de: antigo.preco,
          para: p.preco,
          variacao: antigo.preco > 0 ? (p.preco - antigo.preco) / antigo.preco : 0,
        });
      }
    });

    const sumiram = [];
    atual.forEach((valor, chave) => {
      if (!chavesEnviadas.has(chave)) sumiram.push(valor);
    });

    alterados.sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao));

    return { novos, alterados, sumiram, mantidos: produtos.length - novos.length };
  }

  // ==========================================================================
  // ENVIO
  // ==========================================================================
  function gerarUploadId() {
    return 'up-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  async function publicar(senha) {
    const uploadId = gerarUploadId();
    const payload = {
      uploadId,
      senha,
      produtos: state.produtos.map((p) => [p.nome, p.preco]),
    };

    // POST sem leitura de resposta (no-cors) para não depender de CORS no
    // Apps Script; o resultado real vem do polling de status logo abaixo.
    await fetch(SYNC_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return aguardarResultado(uploadId);
  }

  async function aguardarResultado(uploadId) {
    for (let tentativa = 0; tentativa < POLL_TENTATIVAS; tentativa++) {
      await espera(POLL_INTERVALO);
      try {
        const res = await fetch(`${SYNC_URL}?action=status&id=${encodeURIComponent(uploadId)}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const dados = await res.json();
        if (dados.estado === 'concluido') return dados;
        if (dados.estado === 'erro') {
          const erro = new Error(dados.erro || 'erro_desconhecido');
          erro.vindoDoServidor = true;
          throw erro;
        }
      } catch (err) {
        // Falha de rede no polling é normal (cold start do Apps Script):
        // segue tentando. Só erro que o próprio script reportou interrompe.
        if (err && err.vindoDoServidor) throw err;
      }
    }
    throw new Error('tempo_esgotado');
  }

  function espera(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // INTERFACE
  // ==========================================================================
  function escapeHTML(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function mostrarAviso(tipo, html) {
    els.aviso.className = `admin-aviso admin-aviso-${tipo}`;
    els.aviso.innerHTML = html;
    els.aviso.hidden = false;
  }

  function limparAviso() {
    els.aviso.hidden = true;
    els.aviso.innerHTML = '';
  }

  const MENSAGENS_ERRO = {
    formato_invalido: 'Não consegui abrir esse arquivo. Envie o .xlsx exportado pelo sistema (ou um .csv).',
    planilha_vazia: 'A planilha está vazia.',
    nenhum_produto: 'Não encontrei nenhum produto com nome e preço na planilha.',
    coluna_preco_nao_encontrada: 'Não encontrei a coluna de preços. Confira se o relatório saiu com nome e valor.',
    coluna_nome_nao_encontrada: 'Não encontrei a coluna com o nome dos produtos.',
    falha_leitura: 'Falha ao ler o arquivo. Tente selecionar de novo.',
    senha_incorreta: 'Senha incorreta.',
    ocupado: 'Outro envio está em andamento. Espere um minuto e tente de novo.',
    tempo_esgotado: 'O envio demorou demais para responder. Confira a planilha antes de tentar de novo.',
  };

  function textoErro(err) {
    const codigo = (err && err.message) || '';
    return MENSAGENS_ERRO[codigo] || 'Não foi possível concluir. Tente novamente em alguns instantes.';
  }

  async function processarArquivo(arquivo) {
    limparAviso();
    els.resumo.hidden = true;
    els.publicarWrap.hidden = true;
    els.resultado.hidden = true;
    els.arquivoNome.textContent = `Lendo ${arquivo.name}...`;
    els.arquivoNome.hidden = false;

    try {
      const linhas = await lerArquivo(arquivo);
      const { produtos, duplicados, semPreco } = linhasParaProdutos(linhas);

      state.arquivo = arquivo;
      state.produtos = produtos;
      state.duplicados = duplicados;
      state.semPreco = semPreco;

      els.arquivoNome.textContent = `${arquivo.name} — ${produtos.length.toLocaleString('pt-BR')} produtos com preço`;

      state.catalogoAtual = await carregarCatalogoAtual();
      state.diff = montarDiff(produtos, state.catalogoAtual);

      renderResumo();
      els.publicarWrap.hidden = false;
      els.senha.focus();
    } catch (err) {
      els.arquivoNome.hidden = true;
      mostrarAviso('erro', escapeHTML(textoErro(err)));
    }
  }

  function cardHTML(valor, rotulo, tom) {
    return `
      <div class="admin-card${tom ? ' admin-card-' + tom : ''}">
        <strong>${valor}</strong>
        <span>${rotulo}</span>
      </div>
    `;
  }

  function renderResumo() {
    const { produtos, duplicados, semPreco, diff } = state;

    let cards = cardHTML(produtos.length.toLocaleString('pt-BR'), 'produtos vão para o site');
    if (diff) {
      cards += cardHTML(diff.alterados.length.toLocaleString('pt-BR'), 'preços alterados', 'destaque');
      cards += cardHTML(diff.novos.length.toLocaleString('pt-BR'), 'produtos novos', 'ok');
      cards += cardHTML(diff.sumiram.length.toLocaleString('pt-BR'), 'saem do catálogo', 'alerta');
    }
    if (semPreco.length) {
      cards += cardHTML(semPreco.length.toLocaleString('pt-BR'), 'sem preço (ficam de fora)');
    }
    if (duplicados) {
      cards += cardHTML(duplicados.toLocaleString('pt-BR'), 'linhas repetidas (ignoradas)');
    }
    els.resumoCards.innerHTML = cards;

    let detalhes = '';

    if (semPreco.length) {
      detalhes += listaHTML(
        `Sem preço no relatório (${semPreco.length.toLocaleString('pt-BR')})`,
        semPreco.slice(0, MAX_LINHAS_LISTA).map((item) => `
          <tr><td>${escapeHTML(item.nome)}</td></tr>
        `).join(''),
        ['Produto'],
        semPreco.length,
        'Saíram zerados do sistema. Não vão para o site — "R$ 0,00" na vitrine passa impressão de erro. Cadastre o preço no sistema e reenvie para eles voltarem.'
      );
    }

    if (!diff) {
      detalhes += `<p class="admin-nota">Não consegui carregar o catálogo publicado para comparar — a prévia das mudanças ficou indisponível, mas o envio funciona normalmente.</p>`;
    } else {
      if (diff.alterados.length) {
        detalhes += listaHTML(
          `Preços que mudam (${diff.alterados.length.toLocaleString('pt-BR')})`,
          diff.alterados.slice(0, MAX_LINHAS_LISTA).map((item) => `
            <tr>
              <td>${escapeHTML(item.nome)}</td>
              <td class="admin-td-num">${formatarPreco(item.de)}</td>
              <td class="admin-td-num">${formatarPreco(item.para)}</td>
              <td class="admin-td-num ${item.variacao >= 0 ? 'admin-sobe' : 'admin-desce'}">
                ${item.variacao >= 0 ? '+' : ''}${(item.variacao * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </td>
            </tr>
          `).join(''),
          ['Produto', 'De', 'Para', 'Variação'],
          diff.alterados.length
        );
      }

      if (diff.novos.length) {
        detalhes += listaHTML(
          `Produtos novos (${diff.novos.length.toLocaleString('pt-BR')})`,
          diff.novos.slice(0, MAX_LINHAS_LISTA).map((item) => `
            <tr><td>${escapeHTML(item.nome)}</td><td class="admin-td-num">${formatarPreco(item.preco)}</td></tr>
          `).join(''),
          ['Produto', 'Preço'],
          diff.novos.length,
          'Entram com uma categoria sugerida automaticamente pelo nome — vale conferir na planilha depois.'
        );
      }

      if (diff.sumiram.length) {
        detalhes += listaHTML(
          `Saem do catálogo (${diff.sumiram.length.toLocaleString('pt-BR')})`,
          diff.sumiram.slice(0, MAX_LINHAS_LISTA).map((item) => `
            <tr><td>${escapeHTML(item.nome)}</td><td>${escapeHTML(item.categoria || '')}</td></tr>
          `).join(''),
          ['Produto', 'Categoria'],
          diff.sumiram.length,
          'Não vieram neste relatório. Somem do site, mas a categoria fica guardada: se voltarem a ser vendidos, voltam já categorizados.'
        );
      }
    }

    els.resumoDetalhes.innerHTML = detalhes;
    els.resumo.hidden = false;
  }

  function listaHTML(titulo, linhasHTML, colunas, total, nota) {
    const oculto = total > MAX_LINHAS_LISTA
      ? `<p class="admin-nota">Mostrando os ${MAX_LINHAS_LISTA} primeiros de ${total.toLocaleString('pt-BR')}.</p>`
      : '';
    return `
      <details class="admin-detalhe">
        <summary>${escapeHTML(titulo)}</summary>
        ${nota ? `<p class="admin-nota">${escapeHTML(nota)}</p>` : ''}
        <div class="admin-tabela-wrap">
          <table class="admin-tabela">
            <thead><tr>${colunas.map((c) => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead>
            <tbody>${linhasHTML}</tbody>
          </table>
        </div>
        ${oculto}
      </details>
    `;
  }

  async function aoPublicar() {
    const senha = els.senha.value.trim();
    if (!senha) {
      mostrarAviso('erro', 'Digite a senha para publicar.');
      els.senha.focus();
      return;
    }

    if (!SYNC_URL || SYNC_URL.indexOf('COLE_AQUI') !== -1) {
      mostrarAviso('erro', 'A página ainda não está conectada à planilha: falta colar a URL do Apps Script em <code>js/admin-catalogo.js</code>.');
      return;
    }

    limparAviso();
    els.publicar.disabled = true;
    els.senha.disabled = true;
    els.publicar.innerHTML = '<span class="admin-spinner" aria-hidden="true"></span> Publicando...';
    mostrarAviso('info', 'Enviando os produtos e reescrevendo a planilha. Isso leva de 20 segundos a 1 minuto — não feche a página.');

    try {
      const resultado = await publicar(senha);
      limparAviso();
      renderSucesso(resultado);
    } catch (err) {
      mostrarAviso('erro', escapeHTML(textoErro(err)));
    } finally {
      els.publicar.disabled = false;
      els.senha.disabled = false;
      els.publicar.textContent = 'Publicar no catálogo';
    }
  }

  function renderSucesso(resultado) {
    const quando = resultado.atualizadoEm
      ? new Date(resultado.atualizadoEm).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR');

    const novos = resultado.novosExemplos || [];
    const revisar = novos.length
      ? listaHTML(
        `Categorias para conferir (${Number(resultado.novos || novos.length).toLocaleString('pt-BR')})`,
        novos.slice(0, MAX_LINHAS_LISTA).map((item) => `
          <tr>
            <td>${escapeHTML(item.nome)}</td>
            <td>${escapeHTML(item.categoria)}</td>
          </tr>
        `).join(''),
        ['Produto novo', 'Categoria aplicada'],
        Number(resultado.novos || novos.length),
        'Categorias escolhidas automaticamente pelo nome do produto. Vale abrir a planilha e corrigir o que ficou estranho — principalmente o que caiu em OUTROS.'
      )
      : '';

    els.resultado.innerHTML = `
      <h2>Catálogo atualizado</h2>
      <p>${Number(resultado.total || 0).toLocaleString('pt-BR')} produtos publicados em ${escapeHTML(quando)}.</p>
      <ul class="admin-lista-simples">
        <li>${Number(resultado.novos || 0).toLocaleString('pt-BR')} produtos novos entraram com categoria sugerida</li>
        <li>${Number(resultado.sumiram || 0).toLocaleString('pt-BR')} produtos saíram do catálogo</li>
      </ul>
      ${revisar}
      <p class="admin-nota">O site pode levar alguns minutos para refletir a mudança — o Google guarda o CSV publicado em cache por até 5 minutos.</p>
      <a href="${SITE_BASE}catalogo.html" class="btn btn-outline btn-sm" target="_blank" rel="noopener">Abrir o catálogo</a>
    `;
    els.resultado.hidden = false;
    els.publicarWrap.hidden = true;
    els.resultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    els.dropzone = document.getElementById('admin-dropzone');
    els.input = document.getElementById('admin-file');
    els.arquivoNome = document.getElementById('admin-arquivo-nome');
    els.aviso = document.getElementById('admin-aviso');
    els.resumo = document.getElementById('admin-resumo');
    els.resumoCards = document.getElementById('admin-resumo-cards');
    els.resumoDetalhes = document.getElementById('admin-resumo-detalhes');
    els.publicarWrap = document.getElementById('admin-publicar-wrap');
    els.publicar = document.getElementById('admin-publicar');
    els.senha = document.getElementById('admin-senha');
    els.resultado = document.getElementById('admin-resultado');

    if (!els.dropzone) return;

    els.input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) processarArquivo(e.target.files[0]);
    });

    els.dropzone.addEventListener('click', () => els.input.click());
    els.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.input.click(); }
    });

    ['dragenter', 'dragover'].forEach((evento) => {
      els.dropzone.addEventListener(evento, (e) => {
        e.preventDefault();
        els.dropzone.classList.add('is-dragging');
      });
    });

    ['dragleave', 'drop'].forEach((evento) => {
      els.dropzone.addEventListener(evento, (e) => {
        e.preventDefault();
        els.dropzone.classList.remove('is-dragging');
      });
    });

    els.dropzone.addEventListener('drop', (e) => {
      const arquivo = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (arquivo) processarArquivo(arquivo);
    });

    els.publicar.addEventListener('click', aoPublicar);
    els.senha.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') aoPublicar();
    });
  });
})();
