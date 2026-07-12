/*
  ============================================================
  simulador/assets/js/simulador.js
  Lógica principal do Simulador de Orçamento por Ambientes
  iBUILD São Carlos · Light Steel Frame
  ============================================================
  - Renderização dinâmica dos ambientes
  - Cálculo em tempo real de área e custos
  - Resumo técnico, financeiro, tabela e composição visual
  - Reset e copiar resumo
  - HTML, CSS e JavaScript puro (sem frameworks)
  ============================================================
*/

(function () {
  'use strict';

  /* ============================================================
     CONFIGURAÇÃO CENTRALIZADA
     Usa window.SIMULADOR_CONFIG se simulador-dados.js carregou;
     caso contrário, usa fallback interno para garantir funcionamento.
     ============================================================ */
  var CONFIG_DEFAULT = {
    modulos: {
      pequeno: { largura: 3, comprimento: 4, label: 'Pequeno (3×4m)', area: 12 },
      medio: { largura: 4, comprimento: 5, label: 'Médio (4×5m)', area: 20 },
      grande: { largura: 5, comprimento: 6, label: 'Grande (5×6m)', area: 30 }
    },
    pedDireitoOpcoes: [
      { valor: 2.80, label: '2,80m (padrão)' },
      { valor: 3.00, label: '3,00m' },
      { valor: 3.20, label: '3,20m' },
      { valor: 3.50, label: '3,50m' },
      { valor: 4.00, label: '4,00m (pé-direito alto)' },
      { valor: 4.50, label: '4,50m (duplo)' }
    ],
    acabamentoOpcoes: [
      { valor: 'Standard', label: 'Standard', custoM2: 1200 },
      { valor: 'Premium', label: 'Premium', custoM2: 1800 },
      { valor: 'Supreme', label: 'Supreme', custoM2: 2500 }
    ],
    estiloMultiplicador: {
      'Contemporânea': 1.00,
      'Européia': 1.05,
      'Neo-Clássica': 1.10,
      'Brasileira': 1.00,
      'Mediterrânea': 1.05,
      'Clássica': 1.15
    },
    custos: {
      obraBrancaM2: 1800,
      freteKm: 8.50,
      piscinaM2: 1200,
      muroM2: 350,
      lajeM2: 250,
      esquadriasPctArea: 0.12,
      esquadriasM2: 320,
      bancadasPctArea: 0.04,
      bancadasM2: 450,
      portasPorAmbiente: 1.2,
      portasUnit: 480,
      eletricaM2: 85,
      pinturaIntM2: 45,
      pinturaExtM2: 55,
      forroM2: 65,
      pisoM2: 120,
      paredesExtPctArea: 0.45,
      paredesExtM2: 90,
      paredesIntPctArea: 0.65,
      paredesIntM2: 70,
      circulacaoPct: 0.10,
      prazoDiasPorM2: 1.5,
      pedDireitoBase: 2.80,
      pedDireitoMult: 0.06
    },
    ambientes: [
      { id: 'sala-estar', nome: 'Sala de Estar', icone: '🛋️', grupo: 'Social' },
      { id: 'sala-jantar', nome: 'Sala de Jantar', icone: '🍽️', grupo: 'Social' },
      { id: 'cozinha', nome: 'Cozinha', icone: '🍳', grupo: 'Íntimo' },
      { id: 'area-servico', nome: 'Área de Serviço', icone: '🧺', grupo: 'Serviço' },
      { id: 'dormitorio-1', nome: 'Dormitório 1', icone: '🛏️', grupo: 'Íntimo' },
      { id: 'dormitorio-2', nome: 'Dormitório 2', icone: '🛏️', grupo: 'Íntimo' },
      { id: 'suite', nome: 'Suíte Master', icone: '👑', grupo: 'Íntimo' },
      { id: 'banheiro-1', nome: 'Banheiro Social', icone: '🚿', grupo: 'Íntimo' },
      { id: 'banheiro-2', nome: 'Banheiro Suíte', icone: '🚿', grupo: 'Íntimo' },
      { id: 'hall', nome: 'Hall / Circulação', icone: '🚪', grupo: 'Circulação' },
      { id: 'garagem', nome: 'Garagem', icone: '🚗', grupo: 'Externo' },
      { id: 'varanda', nome: 'Varanda / Gourmet', icone: '🌿', grupo: 'Externo' }
    ]
  };

  var CONFIG = (typeof window !== 'undefined' && window.SIMULADOR_CONFIG)
    ? window.SIMULADOR_CONFIG
    : CONFIG_DEFAULT;

  /* ============================================================
     ESTADO GLOBAL DO SIMULADOR
     ============================================================ */
  var estado = {
    ambientes: []
  };

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function $(id) { return document.getElementById(id); }
  function fmtMoeda(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtNum(v, dec) {
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec || 2, maximumFractionDigits: dec || 2 });
  }
  function fmtArea(v) { return fmtNum(v, 2) + ' m²'; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ============================================================
     INICIALIZAÇÃO DOS AMBIENTES
     ============================================================ */
  function initAmbientes() {
    estado.ambientes = CONFIG.ambientes.map(function (amb) {
      return {
        id: amb.id,
        nome: amb.nome,
        icone: amb.icone,
        grupo: amb.grupo,
        expandido: false,
        ativo: false,
        modulos: { pequeno: 0, medio: 0, grande: 0 },
        personalizados: [],
        pedDireito: CONFIG.pedDireitoOpcoes[0].valor,
        acabamento: 'Standard'
      };
    });
  }

  /* ============================================================
     CÁLCULO DE ÁREA POR AMBIENTE
     ============================================================ */
  function calcAreaAmbiente(amb) {
    var area = 0;
    area += (amb.modulos.pequeno || 0) * CONFIG.modulos.pequeno.area;
    area += (amb.modulos.medio || 0) * CONFIG.modulos.medio.area;
    area += (amb.modulos.grande || 0) * CONFIG.modulos.grande.area;
    if (amb.personalizados && amb.personalizados.length) {
      amb.personalizados.forEach(function (p) {
        area += (Number(p.largura) || 0) * (Number(p.comprimento) || 0);
      });
    }
    return area;
  }

  function ambienteAtivo(amb) {
    var area = calcAreaAmbiente(amb);
    return area > 0;
  }

  /* ============================================================
     CÁLCULO DE CUSTO POR AMBIENTE
     ============================================================ */
  function calcCustoAmbiente(amb, area, estiloMult) {
    var c = CONFIG.custos;
    var pdMult = 1 + ((amb.pedDireito - c.pedDireitoBase) * c.pedDireitoMult);
    var acab = CONFIG.acabamentoOpcoes.find(function (a) { return a.valor === amb.acabamento; }) || CONFIG.acabamentoOpcoes[0];
    var custoObraBranca = area * c.obraBrancaM2 * pdMult * estiloMult;
    var custoAcabamento = area * acab.custoM2 * pdMult;
    return {
      obraBranca: custoObraBranca,
      acabamento: custoAcabamento,
      total: custoObraBranca + custoAcabamento,
      pdMult: pdMult,
      acabCustoM2: acab.custoM2
    };
  }

  /* ============================================================
     CÁLCULO GLOBAL DA OBRA
     ============================================================ */
  function calcular() {
    var c = CONFIG.custos;
    var estilo = $('estilo') ? $('estilo').value : 'Brasileira';
    var estiloMult = CONFIG.estiloMultiplicador[estilo] || 1.00;

    var ambientesAtivos = estado.ambientes.filter(ambienteAtivo);
    var areaTotal = 0;
    var totalObraBranca = 0;
    var totalAcabamentos = 0;
    var detalheAmbientes = [];

    estado.ambientes.forEach(function (amb) {
      var area = calcAreaAmbiente(amb);
      if (area <= 0) return;
      areaTotal += area;
      var custos = calcCustoAmbiente(amb, area, estiloMult);
      totalObraBranca += custos.obraBranca;
      totalAcabamentos += custos.acabamento;
      detalheAmbientes.push({
        amb: amb,
        area: area,
        custos: custos
      });
    });

    var pavimentos = parseInt(($('pavimentos') ? $('pavimentos').value : '1'), 10) || 1;
    var distancia = parseFloat(($('distancia') ? $('distancia').value : '0')) || 0;
    var piscina = parseFloat(($('piscina') ? $('piscina').value : '0')) || 0;
    var muro = parseFloat(($('muro') ? $('muro').value : '0')) || 0;
    var gorduraPct = parseFloat(($('gorduraPct') ? $('gorduraPct').value : '5')) || 0;
    var gorduraValor = parseFloat(($('gorduraValor') ? $('gorduraValor').value : '0')) || 0;

    /* Áreas derivadas */
    var circulacao = areaTotal * c.circulacaoPct;
    var areaPisos = areaTotal;
    var paredesExt = areaTotal * c.paredesExtPctArea;
    var paredesInt = areaTotal * c.paredesIntPctArea;
    var forro = areaTotal;
    var pinturaInt = paredesInt + areaTotal;
    var pinturaExt = paredesExt;
    var esquadriasArea = areaTotal * c.esquadriasPctArea;
    var bancadasArea = areaTotal * c.bancadasPctArea;
    var portasQtd = Math.ceil(ambientesAtivos.length * c.portasPorAmbiente);
    var lajeArea = pavimentos > 1 ? areaTotal * (pavimentos - 1) : 0;

    /* Custos derivados */
    var vEsquadrias = esquadriasArea * c.esquadriasM2 * estiloMult;
    var vBancadas = bancadasArea * c.bancadasM2;
    var vPortas = portasQtd * c.portasUnit;
    var vEletrica = areaTotal * c.eletricaM2;
    var vLaje = lajeArea * c.lajeM2;
    var vFrete = distancia * c.freteKm * 2;
    var vPiscina = piscina * c.piscinaM2;
    var vMuro = muro * c.muroM2;
    var vPisos = areaPisos * c.pisoM2;
    var vParedesExt = paredesExt * c.paredesExtM2;
    var vParedesInt = paredesInt * c.paredesIntM2;
    var vForro = forro * c.forroM2;
    var vPinturaInt = pinturaInt * c.pinturaIntM2;
    var vPinturaExt = pinturaExt * c.pinturaExtM2;

    /* Os custos de obra branca já incluem estrutura; acabamentos por ambiente já calculados */
    var vExtras = vEsquadrias + vBancadas + vPortas + vEletrica + vLaje + vFrete + vPiscina + vMuro;
    var subtotal = totalObraBranca + totalAcabamentos + vExtras;
    var vGordura = (subtotal * gorduraPct / 100) + gorduraValor;
    var totalGeral = subtotal + vGordura;
    var custoM2 = areaTotal > 0 ? totalGeral / areaTotal : 0;
    var prazoDias = Math.ceil(areaTotal * c.prazoDiasPorM2);
    var prazoMeses = Math.ceil(prazoDias / 30);

    return {
      areaTotal: areaTotal,
      circulacao: circulacao,
      areaPisos: areaPisos,
      paredesExt: paredesExt,
      paredesInt: paredesInt,
      forro: forro,
      pinturaInt: pinturaInt,
      pinturaExt: pinturaExt,
      esquadriasArea: esquadriasArea,
      bancadasArea: bancadasArea,
      portasQtd: portasQtd,
      lajeArea: lajeArea,
      distancia: distancia,
      totalObraBranca: totalObraBranca,
      totalAcabamentos: totalAcabamentos,
      vEsquadrias: vEsquadrias,
      vBancadas: vBancadas,
      vPortas: vPortas,
      vEletrica: vEletrica,
      vLaje: vLaje,
      vFrete: vFrete,
      vPiscina: vPiscina,
      vMuro: vMuro,
      vExtras: vExtras,
      vGordura: vGordura,
      subtotal: subtotal,
      totalGeral: totalGeral,
      custoM2: custoM2,
      prazoDias: prazoDias,
      prazoMeses: prazoMeses,
      detalheAmbientes: detalheAmbientes,
      ambientesAtivos: ambientesAtivos,
      estilo: estilo,
      estiloMult: estiloMult
    };
  }

  /* ============================================================
     RENDERIZAÇÃO DA LISTA DE AMBIENTES
     ============================================================ */
  function renderAmbientes() {
    var container = $('ambientesLista');
    if (!container) return;
    container.innerHTML = '';

    var grupos = {};
    estado.ambientes.forEach(function (amb) {
      if (!grupos[amb.grupo]) grupos[amb.grupo] = [];
      grupos[amb.grupo].push(amb);
    });

    Object.keys(grupos).forEach(function (grupoNome) {
      var grupoDiv = document.createElement('div');
      grupoDiv.className = 'amb-grupo';
      var grupoTitle = document.createElement('div');
      grupoTitle.className = 'amb-grupo-title';
      grupoTitle.textContent = grupoNome;
      grupoDiv.appendChild(grupoTitle);

      grupos[grupoNome].forEach(function (amb) {
        grupoDiv.appendChild(criarCardAmbiente(amb));
      });

      container.appendChild(grupoDiv);
    });
  }

  function criarCardAmbiente(amb) {
    var card = document.createElement('div');
    card.className = 'amb-card' + (amb.expandido ? ' expanded' : '');
    card.dataset.id = amb.id;

    /* Header do card */
    var header = document.createElement('div');
    header.className = 'amb-card-header';

    var left = document.createElement('div');
    left.className = 'amb-card-left';
    var icone = document.createElement('span');
    icone.className = 'amb-icone';
    icone.textContent = amb.icone;
    var nome = document.createElement('span');
    nome.className = 'amb-nome';
    nome.textContent = amb.nome;
    left.appendChild(icone);
    left.appendChild(nome);

    var right = document.createElement('div');
    right.className = 'amb-card-right';
    var areaBadge = document.createElement('span');
    areaBadge.className = 'amb-area-badge';
    var area = calcAreaAmbiente(amb);
    areaBadge.textContent = area > 0 ? fmtArea(area) : 'não configurado';
    if (area > 0) areaBadge.classList.add('active');
    right.appendChild(areaBadge);

    var chevron = document.createElement('span');
    chevron.className = 'amb-chevron';
    chevron.innerHTML = amb.expandido ? '▲' : '▼';
    right.appendChild(chevron);

    header.appendChild(left);
    header.appendChild(right);
    card.appendChild(header);

    /* Corpo do card (expansível) */
    if (amb.expandido) {
      var body = document.createElement('div');
      body.className = 'amb-card-body';

      /* Módulos padrão */
      var modulosDiv = document.createElement('div');
      modulosDiv.className = 'amb-modulos';

      ['pequeno', 'medio', 'grande'].forEach(function (tipo) {
        var mod = CONFIG.modulos[tipo];
        var wrap = document.createElement('div');
        wrap.className = 'amb-mod-item';
        var label = document.createElement('label');
        label.textContent = mod.label;
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.value = amb.modulos[tipo] || 0;
        input.dataset.amb = amb.id;
        input.dataset.tipo = tipo;
        input.addEventListener('input', onModuloChange);
        wrap.appendChild(label);
        wrap.appendChild(input);
        modulosDiv.appendChild(wrap);
      });

      body.appendChild(modulosDiv);

      /* Módulos personalizados */
      var persSection = document.createElement('div');
      persSection.className = 'amb-pers-section';
      var persTitle = document.createElement('div');
      persTitle.className = 'amb-pers-title';
      persTitle.textContent = 'Módulos personalizados';
      persSection.appendChild(persTitle);

      var persList = document.createElement('div');
      persList.className = 'amb-pers-list';

      amb.personalizados.forEach(function (p, idx) {
        persList.appendChild(criarLinhaPersonalizado(amb, idx, p));
      });

      var btnAdd = document.createElement('button');
      btnAdd.type = 'button';
      btnAdd.className = 'btn btn-small btn-outline';
      btnAdd.textContent = '+ Adicionar módulo personalizado';
      btnAdd.addEventListener('click', function () {
        amb.personalizados.push({ largura: 0, comprimento: 0 });
        renderAmbientes();
        atualizar();
      });

      persSection.appendChild(persList);
      persSection.appendChild(btnAdd);
      body.appendChild(persSection);

      /* Pé-direito e acabamento */
      var optsDiv = document.createElement('div');
      optsDiv.className = 'amb-opts';

      var pdGroup = document.createElement('div');
      pdGroup.className = 'form-group';
      var pdLabel = document.createElement('label');
      pdLabel.textContent = 'Pé-direito';
      var pdSelect = document.createElement('select');
      pdSelect.dataset.amb = amb.id;
      pdSelect.dataset.campo = 'pedDireito';
      CONFIG.pedDireitoOpcoes.forEach(function (op) {
        var opt = document.createElement('option');
        opt.value = op.valor;
        opt.textContent = op.label;
        if (Math.abs(op.valor - amb.pedDireito) < 0.01) opt.selected = true;
        pdSelect.appendChild(opt);
      });
      pdSelect.addEventListener('change', onSelectChange);
      pdGroup.appendChild(pdLabel);
      pdGroup.appendChild(pdSelect);
      optsDiv.appendChild(pdGroup);

      var acGroup = document.createElement('div');
      acGroup.className = 'form-group';
      var acLabel = document.createElement('label');
      acLabel.textContent = 'Acabamento';
      var acSelect = document.createElement('select');
      acSelect.dataset.amb = amb.id;
      acSelect.dataset.campo = 'acabamento';
      CONFIG.acabamentoOpcoes.forEach(function (op) {
        var opt = document.createElement('option');
        opt.value = op.valor;
        opt.textContent = op.label + ' (R$ ' + fmtNum(op.custoM2, 0) + '/m²)';
        if (op.valor === amb.acabamento) opt.selected = true;
        acSelect.appendChild(opt);
      });
      acSelect.addEventListener('change', onSelectChange);
      acGroup.appendChild(acLabel);
      acGroup.appendChild(acSelect);
      optsDiv.appendChild(acGroup);

      body.appendChild(optsDiv);
      card.appendChild(body);
    }

    /* Toggle expandir/recolher */
    header.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
      amb.expandido = !amb.expandido;
      renderAmbientes();
      atualizar();
    });

    return card;
  }

  function criarLinhaPersonalizado(amb, idx, p) {
    var row = document.createElement('div');
    row.className = 'amb-pers-row';

    var larguraGroup = document.createElement('div');
    larguraGroup.className = 'form-group';
    var lLabel = document.createElement('label');
    lLabel.textContent = 'Largura (m)';
    var lInput = document.createElement('input');
    lInput.type = 'number';
    lInput.min = '0';
    lInput.step = '0.1';
    lInput.value = p.largura || '';
    lInput.dataset.amb = amb.id;
    lInput.dataset.idx = idx;
    lInput.dataset.campo = 'largura';
    lInput.addEventListener('input', onPersChange);
    larguraGroup.appendChild(lLabel);
    larguraGroup.appendChild(lInput);

    var compGroup = document.createElement('div');
    compGroup.className = 'form-group';
    var cLabel = document.createElement('label');
    cLabel.textContent = 'Comprimento (m)';
    var cInput = document.createElement('input');
    cInput.type = 'number';
    cInput.min = '0';
    cInput.step = '0.1';
    cInput.value = p.comprimento || '';
    cInput.dataset.amb = amb.id;
    cInput.dataset.idx = idx;
    cInput.dataset.campo = 'comprimento';
    cInput.addEventListener('input', onPersChange);
    compGroup.appendChild(cLabel);
    compGroup.appendChild(cInput);

    var btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn btn-small btn-remove';
    btnRemove.textContent = '✕';
    btnRemove.title = 'Remover módulo';
    btnRemove.addEventListener('click', function () {
      amb.personalizados.splice(idx, 1);
      renderAmbientes();
      atualizar();
    });

    row.appendChild(larguraGroup);
    row.appendChild(compGroup);
    row.appendChild(btnRemove);
    return row;
  }

  /* ============================================================
     HANDLERS DE EVENTOS
     ============================================================ */
  function onModuloChange(e) {
    var ambId = e.target.dataset.amb;
    var tipo = e.target.dataset.tipo;
    var val = parseInt(e.target.value, 10) || 0;
    val = clamp(val, 0, 50);
    var amb = estado.ambientes.find(function (a) { return a.id === ambId; });
    if (amb) {
      amb.modulos[tipo] = val;
      amb.ativo = ambienteAtivo(amb);
      atualizarAreaBadge(amb);
    }
    atualizar();
  }

  function onSelectChange(e) {
    var ambId = e.target.dataset.amb;
    var campo = e.target.dataset.campo;
    var amb = estado.ambientes.find(function (a) { return a.id === ambId; });
    if (amb) {
      if (campo === 'pedDireito') {
        amb.pedDireito = parseFloat(e.target.value) || 2.80;
      } else if (campo === 'acabamento') {
        amb.acabamento = e.target.value;
      }
    }
    atualizar();
  }

  function onPersChange(e) {
    var ambId = e.target.dataset.amb;
    var idx = parseInt(e.target.dataset.idx, 10);
    var campo = e.target.dataset.campo;
    var amb = estado.ambientes.find(function (a) { return a.id === ambId; });
    if (amb && amb.personalizados[idx]) {
      amb.personalizados[idx][campo] = parseFloat(e.target.value) || 0;
      amb.ativo = ambienteAtivo(amb);
      atualizarAreaBadge(amb);
    }
    atualizar();
  }

  function atualizarAreaBadge(amb) {
    var card = document.querySelector('.amb-card[data-id="' + amb.id + '"]');
    if (!card) return;
    var badge = card.querySelector('.amb-area-badge');
    if (badge) {
      var area = calcAreaAmbiente(amb);
      badge.textContent = area > 0 ? fmtArea(area) : 'não configurado';
      badge.classList.toggle('active', area > 0);
    }
  }

  /* ============================================================
     ATUALIZAÇÃO DA INTERFACE (tempo real)
     ============================================================ */
  function atualizar() {
    var r = calcular();

    /* Barra de área em tempo real */
    if ($('areaBarValor')) $('areaBarValor').textContent = fmtNum(r.areaTotal, 2);
    if ($('areaBarInfo')) $('areaBarInfo').textContent = r.ambientesAtivos.length + ' ambiente' + (r.ambientesAtivos.length !== 1 ? 's' : '') + ' preenchido' + (r.ambientesAtivos.length !== 1 ? 's' : '');

    /* Painel de resultado - hero */
    if ($('rTotal')) $('rTotal').textContent = fmtMoeda(r.totalGeral);
    if ($('rSubtotal')) $('rSubtotal').textContent = 'Subtotal: ' + fmtMoeda(r.subtotal) + ' · ' + fmtNum(r.areaTotal, 2) + ' m²';
    if ($('rArea')) $('rArea').textContent = fmtArea(r.areaTotal);
    if ($('rCustoM2')) $('rCustoM2').textContent = r.areaTotal > 0 ? fmtMoeda(r.custoM2) : '—';
    if ($('rObraBranca')) $('rObraBranca').textContent = fmtMoeda(r.totalObraBranca);
    if ($('rAcabamentos')) $('rAcabamentos').textContent = fmtMoeda(r.totalAcabamentos);

    /* Detalhamento técnico - Áreas e Paredes */
    if ($('dAreaTotal')) $('dAreaTotal').textContent = fmtArea(r.areaTotal);
    if ($('dCirculacao')) $('dCirculacao').textContent = fmtArea(r.circulacao);
    if ($('dPisos')) $('dPisos').textContent = fmtArea(r.areaPisos);
    if ($('dParedesExt')) $('dParedesExt').textContent = fmtArea(r.paredesExt);
    if ($('dParedesInt')) $('dParedesInt').textContent = fmtArea(r.paredesInt);
    if ($('dForro')) $('dForro').textContent = fmtArea(r.forro);
    if ($('dPinturaInt')) $('dPinturaInt').textContent = fmtArea(r.pinturaInt);
    if ($('dPinturaExt')) $('dPinturaExt').textContent = fmtArea(r.pinturaExt);

    /* Detalhamento técnico - Componentes */
    if ($('dEsquadrias')) $('dEsquadrias').textContent = fmtArea(r.esquadriasArea) + ' · ' + fmtMoeda(r.vEsquadrias);
    if ($('dBancadas')) $('dBancadas').textContent = fmtArea(r.bancadasArea) + ' · ' + fmtMoeda(r.vBancadas);
    if ($('dPortas')) $('dPortas').textContent = r.portasQtd + ' un · ' + fmtMoeda(r.vPortas);
    if ($('dEletrica')) $('dEletrica').textContent = fmtMoeda(r.vEletrica);
    if ($('dLaje')) $('dLaje').textContent = fmtArea(r.lajeArea) + ' · ' + fmtMoeda(r.vLaje);
    if ($('dFrete')) $('dFrete').textContent = fmtNum(r.distancia, 0) + ' km · ' + fmtMoeda(r.vFrete);

    /* Resumo financeiro */
    if ($('dVObraBranca')) $('dVObraBranca').textContent = fmtMoeda(r.totalObraBranca);
    if ($('dVAcabamentos')) $('dVAcabamentos').textContent = fmtMoeda(r.totalAcabamentos);
    if ($('dVExtras')) $('dVExtras').textContent = fmtMoeda(r.vExtras);
    if ($('dVGordura')) $('dVGordura').textContent = fmtMoeda(r.vGordura);
    if ($('dPrazo')) $('dPrazo').textContent = r.prazoDias + ' dias (≈ ' + r.prazoMeses + ' meses)';

    /* Tabela de ambientes */
    renderTabela(r);

    /* Composição visual */
    renderComposicao(r);
  }

  /* ============================================================
     TABELA DE AMBIENTES
     ============================================================ */
  function renderTabela(r) {
    var tbody = $('tabelaBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    r.detalheAmbientes.forEach(function (d) {
      var tr = document.createElement('tr');
      var modulosDesc = [];
      if (d.amb.modulos.pequeno) modulosDesc.push(d.amb.modulos.pequeno + 'P');
      if (d.amb.modulos.medio) modulosDesc.push(d.amb.modulos.medio + 'M');
      if (d.amb.modulos.grande) modulosDesc.push(d.amb.modulos.grande + 'G');
      if (d.amb.personalizados && d.amb.personalizados.length) modulosDesc.push(d.amb.personalizados.length + ' pers.');
      var modulosStr = modulosDesc.join(' + ') || '—';
      var pct = r.areaTotal > 0 ? (d.area / r.areaTotal * 100) : 0;

      tr.innerHTML =
        '<td class="td-nome">' + d.amb.icone + ' ' + d.amb.nome + '</td>' +
        '<td>' + modulosStr + '</td>' +
        '<td>' + fmtNum(d.amb.pedDireito, 2) + 'm</td>' +
        '<td>' + d.amb.acabamento + '</td>' +
        '<td class="td-area">' + fmtArea(d.area) + '</td>' +
        '<td class="td-pct">' + fmtNum(pct, 1) + '%</td>';
      tbody.appendChild(tr);
    });

    if ($('tabelaTotal')) $('tabelaTotal').textContent = fmtArea(r.areaTotal);
  }

  /* ============================================================
     COMPOSIÇÃO VISUAL DA ÁREA
     ============================================================ */
  function renderComposicao(r) {
    var bar = $('compBar');
    var legenda = $('compLegenda');
    if (!bar || !legenda) return;
    bar.innerHTML = '';
    legenda.innerHTML = '';

    if (r.areaTotal <= 0) {
      bar.innerHTML = '<div class="comp-empty">Nenhum ambiente preenchido ainda.</div>';
      return;
    }

    var cores = [
      '#c9a227', '#d4af37', '#b8901f', '#e0c050', '#a87f15',
      '#c9a227', '#d4af37', '#b8901f', '#e0c050', '#a87f15',
      '#c9a227', '#d4af37'
    ];

    r.detalheAmbientes.forEach(function (d, i) {
      var pct = (d.area / r.areaTotal * 100);
      var seg = document.createElement('div');
      seg.className = 'comp-seg';
      seg.style.width = pct + '%';
      seg.style.background = cores[i % cores.length];
      seg.title = d.amb.nome + ' · ' + fmtArea(d.area) + ' (' + fmtNum(pct, 1) + '%)';
      bar.appendChild(seg);

      var item = document.createElement('div');
      item.className = 'comp-leg-item';
      item.innerHTML =
        '<span class="comp-leg-cor" style="background:' + cores[i % cores.length] + '"></span>' +
        '<span class="comp-leg-nome">' + d.amb.icone + ' ' + d.amb.nome + '</span>' +
        '<span class="comp-leg-area">' + fmtArea(d.area) + ' · ' + fmtNum(pct, 1) + '%</span>';
      legenda.appendChild(item);
    });
  }

  /* ============================================================
     COPIAR RESUMO
     ============================================================ */
  function copiarResumo() {
    var r = calcular();
    var linhas = [];
    linhas.push('═══════════════════════════════════════════');
    linhas.push('  iBUILD São Carlos · Simulador de Orçamento');
    linhas.push('  Light Steel Frame · Orçamento por Ambientes');
    linhas.push('═══════════════════════════════════════════');
    linhas.push('');
    linhas.push('▸ DADOS GERAIS');
    linhas.push('  Estilo arquitetônico: ' + r.estilo);
    linhas.push('  Pavimentos: ' + ($('pavimentos') ? $('pavimentos').value : '1'));
    linhas.push('  Distância Guarulhos→obra: ' + fmtNum(r.distancia, 0) + ' km');
    linhas.push('  Telha: ' + ($('telha') ? $('telha').value : '—'));
    if ($('piscina') && parseFloat($('piscina').value) > 0) linhas.push('  Piscina: ' + fmtArea(parseFloat($('piscina').value)));
    if ($('muro') && parseFloat($('muro').value) > 0) linhas.push('  Muro de divisa: ' + fmtArea(parseFloat($('muro').value)));
    linhas.push('');
    linhas.push('▸ ÁREA TOTAL DA CASA: ' + fmtArea(r.areaTotal));
    linhas.push('  Ambientes preenchidos: ' + r.ambientesAtivos.length);
    linhas.push('');
    linhas.push('▸ AMBIENTES');
    r.detalheAmbientes.forEach(function (d) {
      var modulosDesc = [];
      if (d.amb.modulos.pequeno) modulosDesc.push(d.amb.modulos.pequeno + 'P');
      if (d.amb.modulos.medio) modulosDesc.push(d.amb.modulos.medio + 'M');
      if (d.amb.modulos.grande) modulosDesc.push(d.amb.modulos.grande + 'G');
      if (d.amb.personalizados && d.amb.personalizados.length) modulosDesc.push(d.amb.personalizados.length + ' pers.');
      linhas.push('  ' + d.amb.nome + ': ' + (modulosDesc.join(' + ') || '—') + ' · ' + fmtArea(d.area) + ' · PD ' + fmtNum(d.amb.pedDireito, 2) + 'm · ' + d.amb.acabamento);
    });
    linhas.push('');
    linhas.push('▸ RESUMO FINANCEIRO');
    linhas.push('  Obra branca / estrutura: ' + fmtMoeda(r.totalObraBranca));
    linhas.push('  Acabamentos por ambiente: ' + fmtMoeda(r.totalAcabamentos));
    linhas.push('  Itens extras (esquadrias, bancadas, portas, elétrica, laje, frete, piscina, muro): ' + fmtMoeda(r.vExtras));
    linhas.push('  Gorduras/Imprevistos: ' + fmtMoeda(r.vGordura));
    linhas.push('  ─────────────────────────────────────');
    linhas.push('  TOTAL ESTIMADO: ' + fmtMoeda(r.totalGeral));
    linhas.push('  Custo/m²: ' + (r.areaTotal > 0 ? fmtMoeda(r.custoM2) : '—'));
    linhas.push('  Prazo estimado: ' + r.prazoDias + ' dias (≈ ' + r.prazoMeses + ' meses)');
    linhas.push('');
    linhas.push('⚠ Valor estimativo. Orçamento detalhado depende de');
    linhas.push('  validação técnica, projeto executivo e condições do terreno.');
    linhas.push('═══════════════════════════════════════════');

    var texto = linhas.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        mostrarToast('Resumo copiado!');
      }).catch(function () {
        fallbackCopiar(texto);
      });
    } else {
      fallbackCopiar(texto);
    }
  }

  function fallbackCopiar(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      mostrarToast('Resumo copiado!');
    } catch (e) {
      mostrarToast('Não foi possível copiar automaticamente.');
    }
    document.body.removeChild(ta);
  }

  function mostrarToast(msg) {
    var toast = $('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2500);
  }

  /* ============================================================
     RESET
     ============================================================ */
  function resetar() {
    initAmbientes();
    var defaults = {
      areaTerreno: 450, distancia: 330, estilo: 'Brasileira',
      pavimentos: '2', telha: 'Termoacústica', piscina: 0,
      muro: 0, gorduraPct: 5, gorduraValor: 0, impostosObs: ''
    };
    Object.keys(defaults).forEach(function (key) {
      if ($(key)) $(key).value = defaults[key];
    });
    renderAmbientes();
    atualizar();
    mostrarToast('Simulação reiniciada.');
  }

  /* ============================================================
     SCROLL SUAVE PARA RESULTADO
     ============================================================ */
  function scrollToResultado() {
    var el = $('resultado');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============================================================
     BIND DE EVENTOS GLOBAIS
     ============================================================ */
  function bindEventos() {
    var camposGlobais = ['areaTerreno', 'distancia', 'estilo', 'pavimentos', 'telha', 'piscina', 'muro', 'gorduraPct', 'gorduraValor', 'impostosObs'];
    camposGlobais.forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('input', atualizar);
        el.addEventListener('change', atualizar);
      }
    });

    if ($('btnReset')) $('btnReset').addEventListener('click', resetar);
    if ($('btnCalcular')) $('btnCalcular').addEventListener('click', scrollToResultado);
    if ($('btnCopiar')) $('btnCopiar').addEventListener('click', copiarResumo);
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function init() {
    initAmbientes();
    renderAmbientes();
    bindEventos();
    atualizar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ============================================================
     API PÚBLICA (opcional)
     ============================================================ */
  window.SimuladorIBUILD = {
    init: init,
    calcular: calcular,
    resetar: resetar,
    copiarResumo: copiarResumo,
    estado: estado,
    CONFIG: CONFIG
  };

})();
