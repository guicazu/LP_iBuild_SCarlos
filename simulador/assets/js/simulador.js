/* =====================================================================
   ARQUIVO 4/4: simulador/assets/js/simulador.js
   ===================================================================== */

/*
 * simulador.js
 * Lógica do Simulador iBUILD — renderização de ambientes, cálculo de área e custo,
 * atualização de UI em tempo real, tabela resumo, composição visual e cópia de resumo.
 * Inclui modal de primeiro acesso com validação, localStorage e ponto para webhook n8n.
 */

(function () {
    'use strict';

    var D = window.SIM_DADOS;
    if (!D) { console.error('simulador-dados.js não carregado.'); return; }

    /* ---------- Estado ---------- */
    var estado = {};

    function estadoInicial() {
        estado = {};
        D.AMBIENTES.forEach(function (amb) {
            estado[amb.id] = {
                ativo: false,
                modulos: {
                    pequeno: amb.modulos.pequeno || 0,
                    medio: amb.modulos.medio || 0,
                    grande: amb.modulos.grande || 0
                },
                personalizados: [],
                peDireito: amb.peDireito,
                acabamento: amb.acabamento
            };
        });
    }

    /* ---------- Utilidades ---------- */
    function fmtMoeda(v) {
        if (isNaN(v) || v === null) v = 0;
        return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function fmtMoedaCurta(v) {
        if (isNaN(v) || v === null) v = 0;
        return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    function fmtArea(v) {
        if (isNaN(v) || v === null) v = 0;
        return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
    }
    function num(id) {
        var el = document.getElementById(id);
        if (!el) return 0;
        var v = parseFloat(el.value);
        return isNaN(v) ? 0 : v;
    }
    function str(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }
    function setText(id, txt) {
        var el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    /* ---------- Área de um ambiente ---------- */
    function areaAmbiente(ambId) {
        var st = estado[ambId];
        if (!st) return 0;
        var total = 0;
        total += (st.modulos.pequeno || 0) * D.MODULOS.pequeno.area;
        total += (st.modulos.medio || 0) * D.MODULOS.medio.area;
        total += (st.modulos.grande || 0) * D.MODULOS.grande.area;
        st.personalizados.forEach(function (p) {
            var l = parseFloat(p.largura) || 0;
            var c = parseFloat(p.comprimento) || 0;
            total += l * c;
        });
        return total;
    }

    function ambientePreenchido(ambId) {
        var st = estado[ambId];
        if (!st) return false;
        return areaAmbiente(ambId) > 0;
    }

    function areaTotal() {
        var t = 0;
        Object.keys(estado).forEach(function (id) { t += areaAmbiente(id); });
        return t;
    }

    function ambientesPreenchidos() {
        return Object.keys(estado).filter(function (id) { return ambientePreenchido(id); });
    }

    /* ---------- Renderização dos ambientes ---------- */
    function renderAmbientes() {
        var container = document.getElementById('ambientesLista');
        if (!container) return;
        container.innerHTML = '';

        D.AMBIENTES.forEach(function (amb, idx) {
            var card = document.createElement('div');
            card.className = 'amb-card';
            card.dataset.id = amb.id;

            var head = document.createElement('div');
            head.className = 'amb-head';
            head.innerHTML =
                '<div class="amb-icone">' + amb.icone + '</div>' +
                '<div class="amb-nome">' + amb.nome + '</div>' +
                '<div class="amb-area" data-area>' + fmtArea(0) + '</div>' +
                '<div class="amb-toggle">▾</div>';

            var body = document.createElement('div');
            body.className = 'amb-body';
            body.innerHTML = renderBodyAmbiente(amb);

            head.addEventListener('click', function () {
                card.classList.toggle('aberto');
            });

            card.appendChild(head);
            card.appendChild(body);
            container.appendChild(card);

            bindAmbienteEventos(card, amb);
            atualizarCardAmbiente(card, amb);
        });
    }

    function renderBodyAmbiente(amb) {
        var st = estado[amb.id];
        var html = '';

        html += '<div class="amb-modulos">';
        html += renderModulo('pequeno', amb.id, st.modulos.pequeno);
        html += renderModulo('medio', amb.id, st.modulos.medio);
        html += renderModulo('grande', amb.id, st.modulos.grande);
        html += '</div>';

        html += '<div class="amb-personalizados">';
        html += '<div class="amb-personalizados-title">Módulos personalizados (largura × comprimento em metros)</div>';
        html += '<div class="amb-personalizado-lista" data-lista></div>';
        html += '<button type="button" class="amb-add-personalizado" data-add>+ Adicionar módulo personalizado</button>';
        html += '</div>';

        html += '<div class="amb-opcoes">';
        html += '<div class="form-group"><label>Pé-direito</label>' + renderSelectPeDireito(amb.id, st.peDireito) + '</div>';
        html += '<div class="form-group"><label>Acabamento</label>' + renderSelectAcabamento(amb.id, st.acabamento) + '</div>';
        html += '</div>';

        return html;
    }

    function renderModulo(tipo, ambId, val) {
        var m = D.MODULOS[tipo];
        return '' +
            '<div class="amb-mod">' +
            '<div class="amb-mod-label">' + m.label + '</div>' +
            '<div class="amb-mod-area">' + m.area.toFixed(0) + ' m² cada</div>' +
            '<input type="number" min="0" step="1" value="' + (val || 0) + '" data-mod="' + tipo + '" data-amb="' + ambId + '">' +
            '</div>';
    }

    function renderSelectPeDireito(ambId, atual) {
        var opts = D.PE_DIREITO.map(function (pd) {
            var sel = Math.abs(pd.valor - atual) < 0.001 ? ' selected' : '';
            return '<option value="' + pd.valor + '"' + sel + '>' + pd.label + '</option>';
        }).join('');
        return '<select data-pd="1" data-amb="' + ambId + '">' + opts + '</select>';
    }

    function renderSelectAcabamento(ambId, atual) {
        var opts = Object.keys(D.ACABAMENTOS).map(function (k) {
            var sel = k === atual ? ' selected' : '';
            return '<option value="' + k + '"' + sel + '>' + D.ACABAMENTOS[k].label + '</option>';
        }).join('');
        return '<select data-acab="1" data-amb="' + ambId + '">' + opts + '</select>';
    }

    function renderPersonalizados(card, amb) {
        var lista = card.querySelector('[data-lista]');
        if (!lista) return;
        lista.innerHTML = '';
        var st = estado[amb.id];
        st.personalizados.forEach(function (p, i) {
            var row = document.createElement('div');
            row.className = 'amb-personalizado-row';
            row.innerHTML =
                '<input type="number" min="0" step="0.1" placeholder="Largura (m)" value="' + (p.largura || '') + '" data-pl="' + i + '">' +
                '<input type="number" min="0" step="0.1" placeholder="Comprimento (m)" value="' + (p.comprimento || '') + '" data-pc="' + i + '">' +
                '<button type="button" data-prem="' + i + '">✕</button>';
            lista.appendChild(row);

            row.querySelector('[data-pl]').addEventListener('input', function (e) {
                st.personalizados[i].largura = parseFloat(e.target.value) || 0;
                atualizarCardAmbiente(card, amb);
                atualizarTempoReal();
            });
            row.querySelector('[data-pc]').addEventListener('input', function (e) {
                st.personalizados[i].comprimento = parseFloat(e.target.value) || 0;
                atualizarCardAmbiente(card, amb);
                atualizarTempoReal();
            });
            row.querySelector('[data-prem]').addEventListener('click', function () {
                st.personalizados.splice(i, 1);
                renderPersonalizados(card, amb);
                atualizarCardAmbiente(card, amb);
                atualizarTempoReal();
            });
        });
    }

    /* ---------- Bind de eventos de um ambiente ---------- */
    function bindAmbienteEventos(card, amb) {
        var st = estado[amb.id];

        card.querySelectorAll('[data-mod]').forEach(function (input) {
            input.addEventListener('input', function (e) {
                var tipo = e.target.dataset.mod;
                st.modulos[tipo] = Math.max(0, parseInt(e.target.value, 10) || 0);
                atualizarCardAmbiente(card, amb);
                atualizarTempoReal();
            });
        });

        var selPd = card.querySelector('[data-pd]');
        if (selPd) {
            selPd.addEventListener('change', function (e) {
                st.peDireito = parseFloat(e.target.value) || 2.8;
                atualizarTempoReal();
            });
        }

        var selAcab = card.querySelector('[data-acab]');
        if (selAcab) {
            selAcab.addEventListener('change', function (e) {
                st.acabamento = e.target.value;
                atualizarTempoReal();
            });
        }

        var btnAdd = card.querySelector('[data-add]');
        if (btnAdd) {
            btnAdd.addEventListener('click', function () {
                st.personalizados.push({ largura: 0, comprimento: 0 });
                renderPersonalizados(card, amb);
            });
        }

        renderPersonalizados(card, amb);
    }

    function atualizarCardAmbiente(card, amb) {
        var area = areaAmbiente(amb.id);
        var areaEl = card.querySelector('[data-area]');
        if (areaEl) areaEl.textContent = fmtArea(area);
        if (area > 0) {
            card.classList.add('ativo');
            estado[amb.id].ativo = true;
        } else {
            card.classList.remove('ativo');
            estado[amb.id].ativo = false;
        }
    }

    /* ---------- Cálculo completo ---------- */
    function calcular() {
        var area = areaTotal();
        var preenchidos = ambientesPreenchidos();
        var P = D.PARAMETROS;

        var estilo = str('estilo');
        var fatorEstilo = (D.ESTILOS[estilo] && D.ESTILOS[estilo].fator) || 1.0;
        var telha = str('telha');
        var fatorTelha = P.telhaFator[telha] || 1.0;
        var pavimentos = parseInt(str('pavimentos'), 10) || 1;
        var distancia = num('distancia');
        var piscina = num('piscina');
        var muro = num('muro');
        var gorduraPct = num('gorduraPct');
        var gorduraValor = num('gorduraValor');

        if (area <= 0) {
            return { vazio: true };
        }

        /* Áreas derivadas */
        var circulacao = area * P.circulacaoPct;
        var pisos = area * P.pisosPct;
        var paredesExt = area * P.paredesExtFator;
        var paredesInt = area * P.paredesIntFator;
        var forro = area;
        var pinturaInt = area * 2.2;          // paredes internas + forro aproximado
        var pinturaExt = paredesExt * 2.8;    // perímetro × altura média
        var esquadrias = area * P.esquadriasPct;
        var bancadas = area;
        var portas = area * P.portasFator;
        var laje = area * (1 + (pavimentos - 1) * P.pavimentoLajeExtra);
        var frete = distancia * P.freteKm * 2;

        /* Custos base */
        var obraBranca = area * P.obraBrancaM2 * fatorTelha * fatorEstilo;

        /* Acabamentos por ambiente */
        var acabamentos = 0;
        preenchidos.forEach(function (id) {
            var st = estado[id];
            var amb = D.AMBIENTES.find(function (a) { return a.id === id; });
            var a = areaAmbiente(id);
            var ac = D.ACABAMENTOS[st.acabamento] || D.ACABAMENTOS.Standard;
            var pd = D.PE_DIREITO.find(function (p) { return Math.abs(p.valor - st.peDireito) < 0.001; });
            var fatorPd = pd ? pd.fator : 1.0;
            acabamentos += a * ac.custoM2 * fatorPd * fatorEstilo;
        });

        /* Componentes derivados */
        var vForro = forro * P.forroM2;
        var vPinturaInt = pinturaInt * P.pinturaIntM2;
        var vPinturaExt = pinturaExt * P.pinturaExtM2;
        var vEsquadrias = esquadrias * P.esquadriasM2;
        var vBancadas = bancadas * P.bancadasM2;
        var vPortas = portas * P.portasUn;
        var vEletrica = area * P.eletricaM2;
        var vLaje = laje * P.lajeM2;

        var extras = vForro + vPinturaInt + vPinturaExt + vEsquadrias + vBancadas + vPortas + vEletrica + vLaje;
        extras += piscina * P.piscinaM2;
        extras += muro * P.muroM2;

        var subtotal = obraBranca + acabamentos + extras + frete;
        var gordura = (subtotal * (gorduraPct / 100)) + gorduraValor;
        var total = subtotal + gordura;
        var custoM2 = area > 0 ? total / area : 0;

        var prazo = Math.round(P.prazoBaseDias + area * P.prazoM2);

        return {
            vazio: false,
            area: area,
            circulacao: circulacao,
            pisos: pisos,
            paredesExt: paredesExt,
            paredesInt: paredesInt,
            forro: forro,
            pinturaInt: pinturaInt,
            pinturaExt: pinturaExt,
            esquadrias: esquadrias,
            bancadas: bancadas,
            portas: portas,
            laje: laje,
            frete: frete,
            obraBranca: obraBranca,
            acabamentos: acabamentos,
            extras: extras,
            gordura: gordura,
            subtotal: subtotal,
            total: total,
            custoM2: custoM2,
            prazo: prazo,
            preenchidos: preenchidos
        };
    }

    /* ---------- Atualização em tempo real (barra de área) ---------- */
    function atualizarTempoReal() {
        var area = areaTotal();
        var preenchidos = ambientesPreenchidos().length;
        setText('areaBarValor', area.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setText('areaBarInfo', preenchidos + (preenchidos === 1 ? ' ambiente preenchido' : ' ambientes preenchidos'));
        atualizarTabela();
        atualizarComposicao();
    }

    /* ---------- Atualização do resultado ---------- */
    function atualizarResultado() {
        var r = calcular();
        if (r.vazio) {
            setText('rTotal', fmtMoeda(0));
            setText('rSubtotal', 'Preencha ao menos um ambiente para calcular');
            setText('rArea', '0 m²');
            setText('rCustoM2', fmtMoedaCurta(0));
            setText('rObraBranca', fmtMoedaCurta(0));
            setText('rAcabamentos', fmtMoedaCurta(0));
            limparDetalhes();
            return;
        }

        setText('rTotal', fmtMoeda(r.total));
        setText('rSubtotal', fmtMoedaCurta(r.subtotal) + ' + ' + fmtMoedaCurta(r.gordura) + ' de gorduras');
        setText('rArea', fmtArea(r.area));
        setText('rCustoM2', fmtMoedaCurta(r.custoM2));
        setText('rObraBranca', fmtMoedaCurta(r.obraBranca));
        setText('rAcabamentos', fmtMoedaCurta(r.acabamentos));

        setText('dAreaTotal', fmtArea(r.area));
        setText('dCirculacao', fmtArea(r.circulacao));
        setText('dPisos', fmtArea(r.pisos));
        setText('dParedesExt', r.paredesExt.toFixed(1) + ' m lineares');
        setText('dParedesInt', r.paredesInt.toFixed(1) + ' m lineares');
        setText('dForro', fmtArea(r.forro) + ' · ' + fmtMoedaCurta(r.forro * D.PARAMETROS.forroM2));
        setText('dPinturaInt', r.pinturaInt.toFixed(1) + ' m² · ' + fmtMoedaCurta(r.pinturaInt * D.PARAMETROS.pinturaIntM2));
        setText('dPinturaExt', r.pinturaExt.toFixed(1) + ' m² · ' + fmtMoedaCurta(r.pinturaExt * D.PARAMETROS.pinturaExtM2));
        setText('dEsquadrias', fmtArea(r.esquadrias) + ' · ' + fmtMoedaCurta(r.esquadrias * D.PARAMETROS.esquadriasM2));
        setText('dBancadas', fmtArea(r.bancadas) + ' · ' + fmtMoedaCurta(r.bancadas * D.PARAMETROS.bancadasM2));
        setText('dPortas', Math.ceil(r.portas) + ' un · ' + fmtMoedaCurta(Math.ceil(r.portas) * D.PARAMETROS.portasUn));
        setText('dEletrica', fmtArea(r.area) + ' · ' + fmtMoedaCurta(r.area * D.PARAMETROS.eletricaM2));
        setText('dLaje', fmtArea(r.laje) + ' · ' + fmtMoedaCurta(r.laje * D.PARAMETROS.lajeM2));
        setText('dFrete', num('distancia') + ' km · ' + fmtMoedaCurta(r.frete));

        setText('dVObraBranca', fmtMoeda(r.obraBranca));
        setText('dVAcabamentos', fmtMoeda(r.acabamentos));
        setText('dVExtras', fmtMoeda(r.extras + r.frete));
        setText('dVGordura', fmtMoeda(r.gordura));
        setText('dPrazo', r.prazo + ' dias (aprox.)');
    }

    function limparDetalhes() {
        ['dAreaTotal','dCirculacao','dPisos','dParedesExt','dParedesInt','dForro','dPinturaInt','dPinturaExt',
         'dEsquadrias','dBancadas','dPortas','dEletrica','dLaje','dFrete','dVObraBranca','dVAcabamentos',
         'dVExtras','dVGordura','dPrazo'].forEach(function (id) { setText(id, '—'); });
    }

    /* ---------- Tabela de ambientes ---------- */
    function atualizarTabela() {
        var tbody = document.getElementById('tabelaBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        var total = areaTotal();
        var preenchidos = ambientesPreenchidos();

        if (preenchidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:24px">Nenhum ambiente preenchido ainda.</td></tr>';
            setText('tabelaTotal', '0,00 m²');
            return;
        }

        preenchidos.forEach(function (id) {
            var amb = D.AMBIENTES.find(function (a) { return a.id === id; });
            var st = estado[id];
            var area = areaAmbiente(id);
            var pct = total > 0 ? (area / total * 100) : 0;

            var modDesc = [];
            if (st.modulos.pequeno) modDesc.push(st.modulos.pequeno + 'P');
            if (st.modulos.medio) modDesc.push(st.modulos.medio + 'M');
            if (st.modulos.grande) modDesc.push(st.modulos.grande + 'G');
            if (st.personalizados.length) modDesc.push(st.personalizados.length + ' personalizado(s)');
            var modTxt = modDesc.join(' · ') || '—';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + amb.icone + ' ' + amb.nome + '</td>' +
                '<td>' + modTxt + '</td>' +
                '<td>' + st.peDireito.toFixed(2).replace('.', ',') + ' m</td>' +
                '<td>' + (D.ACABAMENTOS[st.acabamento] ? D.ACABAMENTOS[st.acabamento].label : st.acabamento) + '</td>' +
                '<td class="td-area">' + fmtArea(area) + '</td>' +
                '<td>' + pct.toFixed(1) + '%</td>';
            tbody.appendChild(tr);
        });

        setText('tabelaTotal', fmtArea(total));
    }

    /* ---------- Composição visual ---------- */
    function atualizarComposicao() {
        var bar = document.getElementById('compBar');
        var leg = document.getElementById('compLegenda');
        if (!bar || !leg) return;
        bar.innerHTML = '';
        leg.innerHTML = '';

        var total = areaTotal();
        var preenchidos = ambientesPreenchidos();
        if (total <= 0 || preenchidos.length === 0) {
            bar.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:13px">Preencha ambientes para ver a composição</div>';
            return;
        }

        preenchidos.forEach(function (id, i) {
            var amb = D.AMBIENTES.find(function (a) { return a.id === id; });
            var area = areaAmbiente(id);
            var pct = (area / total) * 100;
            var cor = D.CORES[i % D.CORES.length];

            var seg = document.createElement('div');
            seg.className = 'comp-seg';
            seg.style.width = pct + '%';
            seg.style.background = cor;
            seg.title = amb.nome + ' · ' + fmtArea(area) + ' (' + pct.toFixed(1) + '%)';
            if (pct > 8) seg.textContent = pct.toFixed(0) + '%';
            bar.appendChild(seg);

            var item = document.createElement('div');
            item.className = 'comp-leg';
            item.innerHTML = '<span class="comp-leg-cor" style="background:' + cor + '"></span>' + amb.nome + ' · ' + fmtArea(area);
            leg.appendChild(item);
        });
    }

    /* ---------- Cópia de resumo ---------- */
    function copiarResumo() {
        var r = calcular();
        var linhas = [];
        linhas.push('=== SIMULAÇÃO iBUILD SÃO CARLOS ===');
        linhas.push('Data: ' + new Date().toLocaleString('pt-BR'));
        linhas.push('');
        linhas.push('DADOS GLOBAIS');
        linhas.push('Estilo: ' + str('estilo'));
        linhas.push('Pavimentos: ' + str('pavimentos'));
        linhas.push('Telha: ' + str('telha'));
        linhas.push('Distância Guarulhos: ' + num('distancia') + ' km');
        linhas.push('Piscina: ' + fmtArea(num('piscina')));
        linhas.push('Muro: ' + num('muro') + ' m²');
        linhas.push('');
        linhas.push('AMBIENTES');
        ambientesPreenchidos().forEach(function (id) {
            var amb = D.AMBIENTES.find(function (a) { return a.id === id; });
            var st = estado[id];
            linhas.push('- ' + amb.nome + ': ' + fmtArea(areaAmbiente(id)) + ' | PD ' + st.peDireito + 'm | ' + st.acabamento);
        });
        linhas.push('');
        if (r.vazio) {
            linhas.push('Nenhum ambiente preenchido.');
        } else {
            linhas.push('RESULTADO');
            linhas.push('Área total: ' + fmtArea(r.area));
            linhas.push('Obra branca: ' + fmtMoeda(r.obraBranca));
            linhas.push('Acabamentos: ' + fmtMoeda(r.acabamentos));
            linhas.push('Extras + frete: ' + fmtMoeda(r.extras + r.frete));
            linhas.push('Gorduras: ' + fmtMoeda(r.gordura));
            linhas.push('TOTAL ESTIMADO: ' + fmtMoeda(r.total));
            linhas.push('Custo/m²: ' + fmtMoeda(r.custoM2));
            linhas.push('Prazo estimado: ' + r.prazo + ' dias');
        }
        linhas.push('');
        linhas.push('Valor estimativo sujeito a validação técnica e projeto executivo.');

        var texto = linhas.join('\n');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(mostrarToast, function () { fallbackCopy(texto); });
        } else {
            fallbackCopy(texto);
        }
    }

    function fallbackCopy(texto) {
        var ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); mostrarToast(); } catch (e) {}
        document.body.removeChild(ta);
    }

    function mostrarToast() {
        var t = document.getElementById('toast');
        if (!t) return;
        t.classList.add('show');
        setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    /* ---------- Reset ---------- */
    function resetar() {
        estadoInicial();
        renderAmbientes();
        atualizarTempoReal();
        atualizarResultado();
    }

    /* ---------- MODAL DE PRIMEIRO ACESSO ---------- */
    var FIRST_ACCESS_KEY = 'ibuildFirstAccess';

    function checkFirstAccess() {
        var data = localStorage.getItem(FIRST_ACCESS_KEY);
        if (!data) {
            showFirstAccessModal();
        } else {
            // Dados já preenchidos, garantimos que o overlay está oculto
            var overlay = document.getElementById('firstAccessOverlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    function showFirstAccessModal() {
        var overlay = document.getElementById('firstAccessOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';

        var form = document.getElementById('firstAccessForm');
        var error = document.getElementById('faError');

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var nome = document.getElementById('faNome').value.trim();
            var telefone = document.getElementById('faTelefone').value.trim();
            var email = document.getElementById('faEmail').value.trim();
            var consent = document.getElementById('faConsent').checked;

            // Validações simples
            if (!nome || !telefone || !email || !consent) {
                error.style.display = 'block';
                return;
            }

            // Validação básica de email
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                error.style.display = 'block';
                return;
            }

            // Se passou, salva no localStorage
            var dados = {
                nome: nome,
                telefone: telefone,
                email: email,
                consent: consent,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(FIRST_ACCESS_KEY, JSON.stringify(dados));

            // ---- FUTURA INTEGRAÇÃO COM WEBHOOK n8n ----
            // Descomente e ajuste a URL do webhook e os dados conforme necessário.
            // Exemplo:
            // var payload = { nome: nome, telefone: telefone, email: email };
            // fetch('https://seu-webhook-n8n.com/endpoint', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload)
            // }).catch(function(err) { console.error('Erro ao enviar para webhook:', err); });
            // ---- FIM WEBHOOK ----

            // Oculta o modal
            overlay.style.display = 'none';

            // Atualiza interface caso necessário (nada a fazer, simulador já estava bloqueado visualmente?)
            // O simulador fica visível atrás do modal, então após fechar está liberado.
        });
    }

    // Função para resetar o primeiro acesso (útil para testes)
    window.resetFirstAccess = function () {
        localStorage.removeItem(FIRST_ACCESS_KEY);
        location.reload();
    };

    /* ---------- Inicialização ---------- */
    function init() {
        // Verificar primeiro acesso antes de qualquer outra inicialização
        checkFirstAccess();

        estadoInicial();
        renderAmbientes();
        atualizarTempoReal();
        atualizarResultado();

        var btnCalc = document.getElementById('btnCalcular');
        if (btnCalc) btnCalc.addEventListener('click', function () {
            atualizarResultado();
            var res = document.getElementById('resultado');
            if (res) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        var btnReset = document.getElementById('btnReset');
        if (btnReset) btnReset.addEventListener('click', resetar);

        var btnCopiar = document.getElementById('btnCopiar');
        if (btnCopiar) btnCopiar.addEventListener('click', copiarResumo);

        /* Inputs globais recalculam resultado */
        ['estilo','pavimentos','telha','distancia','piscina','muro','gorduraPct','gorduraValor'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', atualizarResultado);
            if (el) el.addEventListener('change', atualizarResultado);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
