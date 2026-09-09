/**
 * INFINITYTECH — PRÉ-CADASTRO DE LOJISTA
 * Máscara e validação de CNPJ (dígito verificador + consulta BrasilAPI),
 * máscara de telefone e envio do formulário de pré-cadastro.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastro-lojista-form');
  if (!form) return;

  const cnpjInput = document.getElementById('cnpj');
  const nomeInput = document.getElementById('nome');
  const enderecoInput = document.getElementById('endereco');
  const contatoInput = document.getElementById('contato');
  const emailInput = document.getElementById('email');
  const cnpjHint = document.getElementById('cnpj-hint');
  const cnpjStatusIcon = document.getElementById('cnpj-status-icon');
  const submitBtn = document.getElementById('cadastro-submit');
  const formFeedback = document.getElementById('form-feedback');

  const REDIRECT_URL = form.dataset.redirect || 'lojistas.html';

  // ==========================================================================
  // PLANILHA DE LEADS — troque pela URL do seu Google Apps Script publicado
  // ==========================================================================
  // Como gerar: crie uma planilha no Google Sheets com as colunas (nessa ordem)
  // Timestamp | Nome | CNPJ | Endereço | Telefone | E-mail. Depois, na própria
  // planilha: Extensões > Apps Script, cole o código do doPost (fornecido em
  // conversa), Implantar > Nova implantação > Tipo "App da Web" > Executar
  // como "Eu" > Quem pode acessar "Qualquer pessoa" > Implantar. Copie a URL
  // gerada (termina em /exec) e cole aqui.
  const LEADS_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwYGWOUPn2DZcwsftw_y657NNIxGxMM-zKpd957AbQHfWMm8AEotgFv3y6Sot-aHxc1/exec';

  function sendLeadToSheet(lead) {
    if (!LEADS_SHEET_URL || LEADS_SHEET_URL.indexOf('COLE_AQUI') !== -1) return;
    try {
      fetch(LEADS_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Falha silenciosa: a captura de lead nunca deve travar o cadastro do lojista
    }
  }

  // Consulta na planilha se o CNPJ já está cadastrado (usando Google Apps Script como DB)
  async function checkLeadInSheet(cnpjDigits) {
    if (!LEADS_SHEET_URL || LEADS_SHEET_URL.indexOf('COLE_AQUI') !== -1) {
      return { found: false };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout para absorver cold start do Apps Script
    try {
      const url = `${LEADS_SHEET_URL}?action=check&cnpj=${encodeURIComponent(cnpjDigits)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return { found: false };
      const data = await res.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      return { found: false };
    }
  }

  // Estado da validação do CNPJ: null | 'checking' | 'valid' | 'unverified' | 'invalid'
  let cnpjState = null;

  // ---------- Máscaras ----------
  function maskCNPJ(value) {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function maskPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  let validateTimeout = null;
  cnpjInput.addEventListener('input', () => {
    cnpjInput.value = maskCNPJ(cnpjInput.value);
    const digits = cnpjInput.value.replace(/\D/g, '');

    if (validateTimeout) clearTimeout(validateTimeout);

    if (digits.length === 14) {
      validateTimeout = setTimeout(() => {
        validateCNPJ();
      }, 300);
    } else if (cnpjState !== null) {
      cnpjState = null;
      setCnpjStatus('idle');
    }
  });

  contatoInput.addEventListener('input', () => {
    contatoInput.value = maskPhone(contatoInput.value);
  });

  // ---------- Validação do dígito verificador do CNPJ ----------
  function isValidCNPJChecksum(cnpjDigits) {
    if (cnpjDigits.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpjDigits)) return false;

    const calcDigit = (base, weights) => {
      const sum = base
        .split('')
        .reduce((acc, digit, i) => acc + parseInt(digit, 10) * weights[i], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const base12 = cnpjDigits.slice(0, 12);
    const d1 = calcDigit(base12, w1);
    const d2 = calcDigit(base12 + d1, w2);

    return cnpjDigits === base12 + String(d1) + String(d2);
  }

  // ---------- Consulta BrasilAPI ----------
  async function lookupCNPJ(cnpjDigits) {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
    if (response.status === 404) {
      return { found: false };
    }
    if (!response.ok) {
      throw new Error('brasilapi_unavailable');
    }
    const data = await response.json();
    return { found: true, data };
  }

  function composeEndereco(data) {
    const parts = [];
    const logradouroLinha = [data.logradouro, data.numero].filter(Boolean).join(', ');
    if (logradouroLinha) parts.push(logradouroLinha);
    if (data.complemento) parts.push(data.complemento);
    if (data.bairro) parts.push(data.bairro);
    const cidadeUf = [data.municipio, data.uf].filter(Boolean).join(' - ');
    if (cidadeUf) parts.push(cidadeUf);
    if (data.cep) {
      const cep = String(data.cep).replace(/\D/g, '');
      if (cep.length === 8) parts.push(cep.replace(/^(\d{5})(\d{3})$/, '$1-$2'));
    }
    return parts.join(', ');
  }

  function setCnpjStatus(status, message) {
    cnpjInput.classList.remove('is-valid', 'is-invalid', 'is-checking');
    cnpjStatusIcon.innerHTML = '';
    cnpjHint.textContent = message || '';
    cnpjHint.className = 'form-hint';

    if (status === 'checking') {
      cnpjInput.classList.add('is-checking');
      cnpjStatusIcon.innerHTML = '<span class="cnpj-spinner" aria-hidden="true"></span>';
      cnpjHint.classList.add('hint-loading');
    } else if (status === 'valid') {
      cnpjInput.classList.add('is-valid');
      cnpjStatusIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      cnpjHint.classList.add('hint-success');
    } else if (status === 'unverified') {
      cnpjInput.classList.add('is-valid');
      cnpjStatusIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      cnpjHint.classList.add('hint-warning');
    } else if (status === 'invalid') {
      cnpjInput.classList.add('is-invalid');
      cnpjStatusIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      cnpjHint.classList.add('hint-error');
    }

    updateSubmitState();
  }

  function updateSubmitState() {
    const ready = cnpjState === 'valid' || cnpjState === 'unverified';
    submitBtn.disabled = !ready;
  }

  async function validateCNPJ() {
    const digits = cnpjInput.value.replace(/\D/g, '');

    if (digits.length < 14) {
      cnpjState = null;
      setCnpjStatus('idle');
      return;
    }

    if (!isValidCNPJChecksum(digits)) {
      cnpjState = 'invalid';
      setCnpjStatus('invalid', 'CNPJ inválido. Confira os números digitados.');
      return;
    }

    cnpjState = 'checking';
    setCnpjStatus('checking', 'Consultando cadastro...');

    // 1. Consulta primeiro na planilha de leads da InfinityTech (Google Apps Script como DB)
    try {
      const sheetResult = await checkLeadInSheet(digits);
      if (sheetResult && sheetResult.found && sheetResult.lead) {
        const lead = sheetResult.lead;
        if (lead.nome) nomeInput.value = lead.nome;
        if (lead.endereco) enderecoInput.value = lead.endereco;
        if (lead.telefone) contatoInput.value = lead.telefone;
        if (lead.email) emailInput.value = lead.email;

        cnpjState = 'valid';
        setCnpjStatus('valid', `Cadastro ativo: ${lead.nome || 'Lojista parceiro'}! Redirecionando...`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Acessando Catálogo...';
        formFeedback.textContent = 'Lojista já cadastrado! Redirecionando para o catálogo de atacado...';
        formFeedback.className = 'form-feedback hint-success';

        // Atualiza localStorage
        const leadData = {
          nome: lead.nome || nomeInput.value.trim(),
          cnpj: cnpjInput.value.trim(),
          endereco: lead.endereco || enderecoInput.value.trim(),
          telefone: lead.telefone || contatoInput.value.trim(),
          email: lead.email || emailInput.value.trim(),
        };

        try {
          localStorage.setItem('infinitytech-lojista-cadastro', JSON.stringify(leadData));
        } catch (err) {}

        window.setTimeout(() => {
          window.location.href = REDIRECT_URL;
        }, 1200);
        return;
      }
    } catch (err) {
      // Falha na consulta da planilha segue adiante sem travar o lojista
    }

    // 2. Não encontrado na planilha: consulta na Receita Federal (BrasilAPI)
    setCnpjStatus('checking', 'Consultando na Receita Federal...');

    try {
      const result = await lookupCNPJ(digits);

      if (!result.found) {
        cnpjState = 'invalid';
        setCnpjStatus('invalid', 'CNPJ não encontrado na Receita Federal. Verifique o número digitado.');
        return;
      }

      const data = result.data;
      const situacao = (data.descricao_situacao_cadastral || '').toUpperCase();

      if (situacao && situacao !== 'ATIVA') {
        cnpjState = 'invalid';
        setCnpjStatus('invalid', `Este CNPJ consta como "${data.descricao_situacao_cadastral}" na Receita Federal. Fale com nosso time comercial para regularizar o cadastro.`);
        return;
      }

      if (!nomeInput.value.trim()) {
        nomeInput.value = data.nome_fantasia || data.razao_social || '';
      }
      if (!enderecoInput.value.trim()) {
        enderecoInput.value = composeEndereco(data);
      }

      cnpjState = 'valid';
      setCnpjStatus('valid', `CNPJ validado: ${data.razao_social || 'empresa ativa'}. Preencha o contato para liberar seu acesso.`);
    } catch (err) {
      // API fora do ar / bloqueio de rede: não perde o lead, segue com validação local
      cnpjState = 'unverified';
      setCnpjStatus('unverified', 'Não conseguimos confirmar na Receita agora, mas o formato do CNPJ é válido. Preencha os campos para prosseguir.');
    }
  }

  // Auto-reconhecimento de sessão local salva
  try {
    const savedLocal = localStorage.getItem('infinitytech-lojista-cadastro');
    if (savedLocal) {
      const parsed = JSON.parse(savedLocal);
      if (parsed && parsed.cnpj) {
        cnpjInput.value = maskCNPJ(parsed.cnpj);
        if (parsed.nome) nomeInput.value = parsed.nome;
        if (parsed.endereco) enderecoInput.value = parsed.endereco;
        if (parsed.telefone) contatoInput.value = parsed.telefone;
        if (parsed.email) emailInput.value = parsed.email;
        cnpjState = 'valid';
        setCnpjStatus('valid', `Sessão ativa identificada: ${parsed.nome || 'Lojista'}.`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Acessar Catálogo Diretamente';
      }
    }
  } catch (e) {}

  cnpjInput.addEventListener('blur', validateCNPJ);
  cnpjInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateCNPJ();
    }
  });

  updateSubmitState();

  // ---------- Envio ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (cnpjState !== 'valid' && cnpjState !== 'unverified') {
      validateCNPJ();
      return;
    }

    if (!nomeInput.value.trim() || !enderecoInput.value.trim() || !contatoInput.value.trim() || !emailInput.value.trim()) {
      formFeedback.textContent = 'Preencha nome, endereço, contato e e-mail antes de continuar.';
      formFeedback.className = 'form-feedback hint-error';
      return;
    }

    if (!emailInput.checkValidity()) {
      formFeedback.textContent = 'Digite um e-mail válido.';
      formFeedback.className = 'form-feedback hint-error';
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Redirecionando...';
    formFeedback.textContent = 'Pré-cadastro validado! Redirecionando para o catálogo de lojistas...';
    formFeedback.className = 'form-feedback hint-success';

    const leadData = {
      nome: nomeInput.value.trim(),
      cnpj: cnpjInput.value.trim(),
      endereco: enderecoInput.value.trim(),
      telefone: contatoInput.value.trim(),
      email: emailInput.value.trim(),
    };

    sendLeadToSheet(leadData);

    try {
      localStorage.setItem('infinitytech-lojista-cadastro', JSON.stringify(leadData));
    } catch (err) {
      // localStorage indisponível (modo privado etc.) — o checkout no catálogo
      // segue funcionando normalmente, só sem os dados do lojista na mensagem
    }

    window.setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, 1200);
  });
});
