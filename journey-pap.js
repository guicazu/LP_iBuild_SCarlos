/* ==========================================================================
   journey-pap.js
   Controla a seção "Jornada / Passo a Passo" (PAP) do site.
   - openPap(index): ativa um nó específico ao clicar
   - Progresso baseado em scroll da seção #papFlow
   - IntersectionObserver para elementos .reveal (com delays)
   - Animação de contadores que exibem "+0"
   Vanilla JavaScript, sem dependências.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  /* --------------------------------------------------------------------------
     0) Cache de elementos e variáveis globais
     -------------------------------------------------------------------------- */

  var papFlow = document.getElementById('papFlow');
  var papLineGlow = document.getElementById('papLineGlow');
  var papProgressLabel = document.getElementById('papProgressLabel');
  var papMobileTrackFill = document.getElementById('papMobileTrackFill');
  var papNodesContainer = document.querySelector('.pap-nodes');
  var papNodes = document.querySelectorAll('.pap-node');
  var papTooltips = document.querySelectorAll('.pap-tooltip');

  // Guarda o índice ativo atual para evitar atualizações redundantes
  var currentActiveIndex = -1;

  // Flag para evitar que o scroll sobrescreva imediatamente uma seleção manual
  var manualSelectionTimeout = null;

  /* --------------------------------------------------------------------------
     1) openPap(index)
     Chamado via onclick="openPap(N)" nos elementos .pap-node
     -------------------------------------------------------------------------- */

  // Expor a função globalmente porque o HTML usa onclick inline
  window.openPap = function (index) {
    if (!papNodes.length) return;

    // Normaliza o índice recebido
    var idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx >= papNodes.length) return;

    // Remove .active de todos os nós e tooltips
    papNodes.forEach(function (node) {
      node.classList.remove('active');
    });
    papTooltips.forEach(function (tooltip) {
      tooltip.classList.remove('active');
    });

    // Ativa o nó clicado
    var clickedNode = papNodes[idx];
    if (clickedNode) {
      clickedNode.classList.add('active');

      // Ativa o tooltip correspondente (dentro do nó)
      var tooltip = clickedNode.querySelector('.pap-tooltip');
      if (tooltip) {
        tooltip.classList.add('active');
      }
    }

    currentActiveIndex = idx;

    // Atualiza a barra de progresso para refletir a posição do nó
    var percent = papNodes.length > 1 ? (idx / (papNodes.length - 1)) * 100 : 100;
    updateProgressUI(percent);

    // Evita que o scroll reative outro nó logo após o clique
    clearTimeout(manualSelectionTimeout);
    manualSelectionTimeout = setTimeout(function () {
      manualSelectionTimeout = null;
    }, 800);
  };

  /* --------------------------------------------------------------------------
     2) Atualização visual do progresso
     -------------------------------------------------------------------------- */

  function updateProgressUI(percent) {
    var clamped = Math.max(0, Math.min(100, percent));
    var rounded = Math.round(clamped);

    // Linha dourada vertical (desktop)
    if (papLineGlow) {
      papLineGlow.style.height = clamped + '%';
    }

    // Rótulo de porcentagem
    if (papProgressLabel) {
      papProgressLabel.textContent = rounded + '%';
    }

    // Barra de progresso mobile
    if (papMobileTrackFill) {
      papMobileTrackFill.style.height = clamped + '%';
    }
  }

  /* --------------------------------------------------------------------------
     3) Ativa o nó mais próximo com base no progresso de scroll
     -------------------------------------------------------------------------- */

  function activateNearestNode(percent) {
    if (!papNodes.length || manualSelectionTimeout) return;

    var total = papNodes.length;
    // Mapeia percent (0-100) para índice do nó
    var nearestIndex = Math.round((percent / 100) * (total - 1));
    nearestIndex = Math.max(0, Math.min(total - 1, nearestIndex));

    if (nearestIndex === currentActiveIndex) return;

    // Remove .active de todos
    papNodes.forEach(function (node) {
      node.classList.remove('active');
    });
    papTooltips.forEach(function (tooltip) {
      tooltip.classList.remove('active');
    });

    var node = papNodes[nearestIndex];
    if (node) {
      node.classList.add('active');
      var tooltip = node.querySelector('.pap-tooltip');
      if (tooltip) {
        tooltip.classList.add('active');
      }
    }

    currentActiveIndex = nearestIndex;
  }

  /* --------------------------------------------------------------------------
     4) Cálculo do progresso de scroll da seção #papFlow
     -------------------------------------------------------------------------- */

  function computeScrollProgress() {
    if (!papFlow) return 0;

    var rect = papFlow.getBoundingClientRect();
    var windowHeight = window.innerHeight || document.documentElement.clientHeight;

    // Altura total "percorrível" da seção
    var scrollable = rect.height - windowHeight;
    if (scrollable <= 0) {
      // Se a seção couber inteira na tela, considera 100% quando visível
      return rect.top < windowHeight * 0.5 ? 100 : 0;
    }

    // Quanto já "subiu" além do topo da viewport
    var passed = -rect.top;

    var percent = (passed / scrollable) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  /* --------------------------------------------------------------------------
     5) Listener de scroll (com requestAnimationFrame para performance)
     -------------------------------------------------------------------------- */

  var ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        var percent = computeScrollProgress();
        updateProgressUI(percent);
        activateNearestNode(percent);
        ticking = false;
      });
      ticking = true;
    }
  }

  if (papFlow) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Chamada inicial
    onScroll();
  }

  /* --------------------------------------------------------------------------
     6) IntersectionObserver para elementos .reveal
     -------------------------------------------------------------------------- */

  var revealElements = document.querySelectorAll('.reveal, .reveal-delay-1, .reveal-delay-2');

  if ('IntersectionObserver' in window && revealElements.length) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = 0;

          if (el.classList.contains('reveal-delay-2')) {
            delay = 300;
          } else if (el.classList.contains('reveal-delay-1')) {
            delay = 150;
          }

          setTimeout(function () {
            el.classList.add('visible');
          }, delay);

          observer.unobserve(el);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -10% 0px'
    });

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: mostra tudo imediatamente se não houver suporte
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* --------------------------------------------------------------------------
     7) Animação de contadores ("+0" -> valor alvo)
     Procura elementos que contenham o padrão "+0" e anima até o valor alvo.
     -------------------------------------------------------------------------- */

  // Tenta identificar contadores por data-target; se não houver, usa heurística
  // baseada em texto "+0".
  function parseTargetValue(el) {
    // Prioridade: atributo data-target
    if (el.hasAttribute('data-target')) {
      var t = parseInt(el.getAttribute('data-target'), 10);
      if (!isNaN(t)) return t;
    }

    // Heurística: texto atual contém "+0" ou "+0 ..."
    var text = (el.textContent || '').trim();
    if (/\+\s*0/.test(text)) {
      // Tenta ler data-count ou data-value
      var attr = el.getAttribute('data-count') || el.getAttribute('data-value');
      if (attr) {
        var v = parseInt(attr, 10);
        if (!isNaN(v)) return v;
      }
    }

    return null;
  }

  function formatCounter(value) {
    return '+' + value.toLocaleString('pt-BR');
  }

  function animateCounter(el, target, duration) {
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = (timestamp - startTime) / duration;
      if (progress >= 1) progress = 1;

      // Easing easeOutCubic para suavizar a contagem
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);

      el.textContent = formatCounter(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatCounter(target);
      }
    }

    window.requestAnimationFrame(step);
  }

  // Seleciona candidatos a contador:
  // - elementos com [data-target]
  // - elementos com [data-count] / [data-value] que contenham "+0"
  var counterCandidates = document.querySelectorAll(
    '[data-target], [data-count], [data-value]'
  );

  var counters = [];

  counterCandidates.forEach(function (el) {
    var target = parseTargetValue(el);
    if (target !== null && target > 0) {
      counters.push({ el: el, target: target });
    }
  });

  // Caso não tenham sido encontrados via atributos, faz uma busca mais ampla
  // por elementos cujo texto comece com "+0".
  if (!counters.length) {
    var allText = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, strong, em');
    allText.forEach(function (el) {
      // Evita processar elementos com muitos filhos de texto
      if (el.children.length > 0) return;
      var text = (el.textContent || '').trim();
      if (/^\+\s*0\b/.test(text)) {
        var target = parseTargetValue(el);
        if (target !== null && target > 0) {
          counters.push({ el: el, target: target });
        }
      }
    });
  }

  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var match = counters.find(function (c) { return c.el === el; });
            if (match) {
              animateCounter(el, match.target, 1800);
            }
            observer.unobserve(el);
          }
        });
      }, {
        threshold: 0.4
      });

      counters.forEach(function (c) {
        // Inicializa com "+0" para garantir estado inicial
        c.el.textContent = formatCounter(0);
        counterObserver.observe(c.el);
      });
    } else {
      // Fallback sem IntersectionObserver
      counters.forEach(function (c) {
        animateCounter(c.el, c.target, 1800);
      });
    }
  }

  /* --------------------------------------------------------------------------
     8) Inicialização segura
     -------------------------------------------------------------------------- */

  // Garante estado inicial consistente
  if (papNodes.length) {
    // Ativa o primeiro nó por padrão
    window.openPap(0);
  }

  // Atualiza progresso inicial
  updateProgressUI(0);
});