(function () {
  'use strict';

  /* Ajustes de leitura */
  var raiz = document.documentElement;
  var CHAVE = 'acessibilidade-dia-a-dia';
  var ESCALAS = [1, 1.15, 1.3, 1.5, 1.75];
  var ajustes = lerAjustes();

  function ajustesPadrao() {
    return { escala: 0, contraste: false };
  }

  function validar(obj) {
    var pad = ajustesPadrao();
    if (!obj || typeof obj !== 'object') return pad;
    var e = parseInt(obj.escala, 10);
    if (isNaN(e) || e < 0 || e >= ESCALAS.length) e = 0;
    return { escala: e, contraste: obj.contraste === true };
  }

  function lerAjustes() {
    var bruto = null;
    try { bruto = window.localStorage.getItem(CHAVE); } catch (erro) { bruto = null; }
    if (!bruto && window.name.indexOf(CHAVE + '=') === 0) {
      bruto = window.name.slice(CHAVE.length + 1);
    }
    if (!bruto) return ajustesPadrao();
    try { return validar(JSON.parse(bruto)); } catch (erro) { return ajustesPadrao(); }
  }

  function salvarAjustes() {
    var texto = JSON.stringify(ajustes);
    try { window.localStorage.setItem(CHAVE, texto); } catch (erro) { /* sem armazenamento */ }
    if (window.name === '' || window.name.indexOf(CHAVE + '=') === 0) {
      window.name = CHAVE + '=' + texto;
    }
  }

  function aplicar() {
    raiz.style.fontSize = (ESCALAS[ajustes.escala] * 100) + '%';
    raiz.classList.toggle('alto-contraste', ajustes.contraste);
  }

  raiz.classList.add('js');
  aplicar();

  window.addEventListener('pageshow', function () {
    ajustes = lerAjustes();
    aplicar();
    atualizarInterface();
  });

  window.addEventListener('storage', function (evento) {
    if (evento.key === CHAVE) {
      ajustes = lerAjustes();
      aplicar();
      atualizarInterface();
    }
  });

  /* Interface dos ajustes */
  var anuncio = null;

  function anunciar(texto) {
    if (!anuncio) return;
    anuncio.textContent = '';
    window.setTimeout(function () { anuncio.textContent = texto; }, 60);
  }

  function atualizarInterface() {
    var menor = document.querySelector('[data-acao="menor"]');
    var maior = document.querySelector('[data-acao="maior"]');
    var contraste = document.querySelector('[data-acao="contraste"]');
    var nivel = document.querySelector('[data-nivel]');

    if (menor) menor.setAttribute('aria-disabled', String(ajustes.escala === 0));
    if (maior) maior.setAttribute('aria-disabled', String(ajustes.escala === ESCALAS.length - 1));
    if (contraste) contraste.setAttribute('aria-pressed', String(ajustes.contraste));
    if (nivel) nivel.textContent = 'Texto em ' + Math.round(ESCALAS[ajustes.escala] * 100) + '%';
  }

  function mudarEscala(delta) {
    var novo = ajustes.escala + delta;
    if (novo < 0) { anunciar('O texto já está no tamanho mínimo.'); return; }
    if (novo >= ESCALAS.length) { anunciar('O texto já está no tamanho máximo.'); return; }
    ajustes.escala = novo;
    aplicar();
    salvarAjustes();
    atualizarInterface();
    anunciar('Texto em ' + Math.round(ESCALAS[novo] * 100) + ' por cento.');
  }

  function restaurar() {
    ajustes.escala = 0;
    aplicar();
    salvarAjustes();
    atualizarInterface();
    anunciar('Tamanho padrão do texto.');
  }

  function alternarContraste() {
    ajustes.contraste = !ajustes.contraste;
    aplicar();
    salvarAjustes();
    atualizarInterface();
    anunciar(ajustes.contraste ? 'Alto contraste ligado.' : 'Alto contraste desligado.');
  }

  /* Barra de progresso */
  function iniciarProgresso() {
    var barra = document.createElement('div');
    barra.className = 'progresso';
    barra.setAttribute('aria-hidden', 'true');
    document.body.appendChild(barra);

    function atualizar() {
      var total = raiz.scrollHeight - window.innerHeight;
      var fracao = total > 0 ? window.scrollY / total : 0;
      raiz.style.setProperty('--progresso', Math.min(1, fracao).toFixed(3));
    }

    window.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);
    atualizar();
  }

  /* Calculadora de contraste */
  function luminancia(hex) {
    var canais = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
  }

  function razao(a, b) {
    var la = luminancia(a);
    var lb = luminancia(b);
    var maior = Math.max(la, lb);
    var menor = Math.min(la, lb);
    return (maior + 0.05) / (menor + 0.05);
  }

  function iniciarCalculadora() {
    var texto = document.getElementById('cor-texto');
    var fundo = document.getElementById('cor-fundo');
    if (!texto || !fundo) return;

    var hexTexto = document.getElementById('hex-texto');
    var hexFundo = document.getElementById('hex-fundo');
    var previa = document.getElementById('previa');
    var resultado = document.getElementById('resultado-contraste');
    var lista = document.getElementById('criterios-contraste');
    var temporizador = null;

    var criterios = [
      { nome: 'Texto normal, nível AA (mínimo 4,5 para 1)', minimo: 4.5 },
      { nome: 'Texto grande, nível AA (mínimo 3 para 1)', minimo: 3 },
      { nome: 'Texto normal, nível AAA (mínimo 7 para 1)', minimo: 7 }
    ];

    function formatar(n) {
      return n.toFixed(2).replace('.', ',');
    }

    function atualizar() {
      var r = razao(texto.value, fundo.value);
      hexTexto.textContent = texto.value;
      hexFundo.textContent = fundo.value;
      previa.style.color = texto.value;
      previa.style.background = fundo.value;
      resultado.textContent = 'Relação de contraste: ' + formatar(r) + ' para 1';
      lista.innerHTML = '';
      criterios.forEach(function (c) {
        var item = document.createElement('li');
        var passa = r >= c.minimo;
        item.className = passa ? 'ok' : 'falha';
        item.textContent = c.nome + ': ' + (passa ? 'passa' : 'não passa');
        lista.appendChild(item);
      });
    }

    function aoMudar() {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(atualizar, 350);
    }

    atualizar();
    texto.addEventListener('input', aoMudar);
    fundo.addEventListener('input', aoMudar);
  }

  /* Inicialização */
  document.addEventListener('DOMContentLoaded', function () {
    anuncio = document.getElementById('anuncio');

    document.querySelectorAll('[data-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-acao');
        if (acao === 'maior') mudarEscala(1);
        if (acao === 'menor') mudarEscala(-1);
        if (acao === 'restaurar') restaurar();
        if (acao === 'contraste') alternarContraste();
      });
    });

    atualizarInterface();
    iniciarProgresso();
    iniciarCalculadora();
  });
})();
