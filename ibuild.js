/* ============================================================
   iBUILD Construtora — Script principal
   Reúne: Scroll Reveal, Contadores, Nav Scroll,
   Passo a Passo (PAP) Desktop e Mobile
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Aguarda o DOM estar pronto para inicializar tudo
     ---------------------------------------------------------- */
  function init() {

    /* ========================================================
       1. SCROLL REVEAL (IntersectionObserver)
       Observa elementos .reveal, .reveal-line e .reveal-scale
       Adiciona a classe .visible quando entram na viewport
       ======================================================== */
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal, .reveal-line, .reveal-scale').forEach(function (el) {
      obs.observe(el);
    });

    /* ========================================================
       2. COUNTER ANIMATION (data-count)
       Anima números de 0 até o valor de data-count
       Duração: 3500ms | Easing: easeInOutCubic
       Formatação: toLocaleString("pt-BR")
       ======================================================== */
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'));

          // Mede a largura final antes de zerar para evitar "pulo" visual
          el.textContent = target.toLocaleString("pt-BR");
          el.style.minWidth = el.offsetWidth + 'px';
          el.style.display = 'inline-block';
          el.textContent = '0';

          // Pequeno atraso para suavizar a entrada
          setTimeout(function () {
            var duration = 3500;
            var startTime = performance.now();

            // Função de easing: easeInOutCubic
            function easeInOutCubic(x) {
              return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
            }

            function update(now) {
              var progress = Math.min((now - startTime) / duration, 1);
              el.textContent = Math.floor(easeInOutCubic(progress) * target).toLocaleString("pt-BR");
              if (progress < 1) {
                requestAnimationFrame(update);
              }
            }

            requestAnimationFrame(update);
          }, 600);

          cObs.unobserve(el);
        }
      });
    }, {
      threshold: 0.5
    });

    document.querySelectorAll('[data-count]').forEach(function (el) {
      cObs.observe(el);
    });

    /* ========================================================
       3. NAV SCROLL
       Adiciona a classe .scrolled na nav após 80px de scroll
       ======================================================== */
    window.addEventListener('scroll', function () {
      var nav = document.getElementById('nav');
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 80);
      }
    }, { passive: true });

    /* ========================================================
       4. openPap (DESKTOP — hover/click, ACUMULATIVO)
       - Adiciona .active ao nó clicado (sem remover dos anteriores)
       - Usa .open para controlar a visibilidade do tooltip
       - Linha de progresso horizontal (width), limitada a 92%
       - Fórmula: (maxLit / (total - 1)) * 92
       - Posição do label: calc(4% + widthPct%)
       Exposta globalmente pois o HTML usa onclick="openPap(N)"
       ======================================================== */
    window.openPap = function (idx) {
      var nodes = document.querySelectorAll('.pap-node');
      if (idx < 0 || idx >= nodes.length) return;

      // Acumulativo: apenas adiciona .active (não remove dos anteriores)
      nodes[idx].classList.add('active');

      // .open controla qual tooltip fica visível (apenas o clicado)
      nodes.forEach(function (n) { n.classList.remove('open'); });
      nodes[idx].classList.add('open');

      // Descobre o índice mais avançado que já recebeu .active
      var maxLit = -1;
      nodes.forEach(function (nn, i) {
        if (nn.classList.contains('active')) maxLit = Math.max(maxLit, i);
      });

      var total = nodes.length;
      var widthPct = total > 1 ? (maxLit / (total - 1)) * 92 : 0;

      // Atualiza a linha de progresso dourada (horizontal)
      var glow = document.getElementById('papLineGlow');
      if (glow) {
        glow.style.width = widthPct + '%';
        if (widthPct > 0) glow.classList.add('active');
      }

      // Atualiza o rótulo de porcentagem
      var pl = document.getElementById('papProgressLabel');
      if (pl) {
        var percent = Math.round(((maxLit + 1) / total) * 100);
        pl.textContent = percent + '%';
        pl.style.left = 'calc(4% + ' + widthPct + '%)';
        pl.classList.add('visible');
      }
    };

    /* ========================================================
       5. activatePap (DESKTOP — scroll, NÃO-acumulativo)
       - Ativa apenas o nó correspondente ao scroll atual
       - Remove .active dos demais nós
       - Usada pelo listener de scroll desktop
       ======================================================== */
    function activatePap(idx) {
      if (window.innerWidth <= 900) return; // Mobile usa updatePapMobile

      var nodes = document.querySelectorAll('.pap-node');
      nodes.forEach(function (n, i) {
        if (i === idx) n.classList.add('active');
        else n.classList.remove('active');
      });

      var total = nodes.length;
      var percent = Math.round(((idx + 1) / total) * 100);
      var widthPct = (idx / (total - 1)) * 92;

      var glow = document.getElementById('papLineGlow');
      if (glow) {
        glow.style.width = widthPct + '%';
        if (widthPct > 0) glow.classList.add('active');
        else glow.classList.remove('active');
      }

      var progLabel = document.getElementById('papProgressLabel');
      if (progLabel) {
        progLabel.textContent = percent + '%';
        progLabel.style.left = 'calc(4% + ' + widthPct + '%)';
        progLabel.classList.add('visible');
      }
    }

    /* ========================================================
       6. updatePapMobile (MOBILE — scroll, acumulativo)
       - Preenche a trilha vertical dourada conforme o scroll
       - Ativa nós que passam do ponto central da viewport
       - Abre o tooltip do nó ativo mais avançado
       ======================================================== */
    var _papLastActive = -2;

    function updatePapMobile() {
      if (window.innerWidth > 900) return; // Desktop usa activatePap

      var flow = document.getElementById('papFlow');
      var track = document.querySelector('.pap-mobile-track');
      var fill = document.getElementById('papMobileTrackFill');
      var nodes = document.querySelectorAll('.pap-node');
      if (!flow || !track || !fill || !nodes.length) return;

      // Calcula o centro vertical de cada nó em relação ao papFlow
      var flowTop = flow.getBoundingClientRect().top;

      function numCenter(node) {
        var el = node.querySelector('.pap-num') || node.querySelector('.pap-circle') || node;
        var rect = el.getBoundingClientRect();
        return (rect.top + rect.height / 2) - flowTop;
      }

      var firstCenter = numCenter(nodes[0]);
      var lastCenter = numCenter(nodes[nodes.length - 1]);

      // Calcula o progresso do scroll
      var winH = window.innerHeight;
      var targetY = winH * 0.5; // Centro da viewport
      var progress = (targetY - firstCenter) / (lastCenter - firstCenter);
      progress = Math.max(0, Math.min(1, progress));

      // Atualiza a altura do preenchimento dourado
      fill.style.height = (progress * 100) + '%';

      // Ativa nós que estão acima do ponto central (acumulativo)
      var activeIdx = -1;
      nodes.forEach(function (node, i) {
        var center = numCenter(node);
        if (center <= targetY) {
          node.classList.add('active');
          activeIdx = i;
        } else {
          node.classList.remove('active');
        }
      });

      // Abre o tooltip do nó ativo mais avançado
      if (activeIdx !== _papLastActive && activeIdx >= 0) {
        nodes.forEach(function (n) { n.classList.remove('open'); });
        nodes[activeIdx].classList.add('open');
        _papLastActive = activeIdx;
      }
    }

    /* ========================================================
       7. DESKTOP SCROLL para PAP
       Calcula qual nó está mais próximo do centro da viewport
       e chama activatePap() com esse índice (não-acumulativo)
       ======================================================== */
    function updatePapDesktop() {
      if (window.innerWidth <= 900) return; // Mobile usa updatePapMobile

      var flow = document.getElementById('papFlow');
      var nodes = document.querySelectorAll('.pap-node');
      if (!flow || !nodes.length) return;

      var flowRect = flow.getBoundingClientRect();
      var winH = window.innerHeight;
      var targetY = winH * 0.5; // Centro da viewport

      // Se a seção ainda não está visível, não faz nada
      if (flowRect.bottom < 0 || flowRect.top > winH) return;

      // Encontra o nó cujo centro está mais próximo do centro da viewport
      var closestIdx = 0;
      var closestDist = Infinity;

      nodes.forEach(function (node, i) {
        var el = node.querySelector('.pap-num') || node.querySelector('.pap-circle') || node;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var dist = Math.abs(center - targetY);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });

      activatePap(closestIdx);
    }

    /* ========================================================
       Listener unificado de scroll para PAP (Desktop + Mobile)
       Usa requestAnimationFrame e passive: true
       ======================================================== */
    var _papTicking = false;

    function _onPapScroll() {
      if (!_papTicking) {
        requestAnimationFrame(function () {
          updatePapMobile();
          updatePapDesktop();
          _papTicking = false;
        });
        _papTicking = true;
      }
    }

    window.addEventListener('scroll', _onPapScroll, { passive: true });
    window.addEventListener('resize', _onPapScroll, { passive: true });
    window.addEventListener('load', function () {
      updatePapMobile();
      updatePapDesktop();
    });

    // Executa uma vez ao iniciar para definir o estado correto
    updatePapMobile();
    updatePapDesktop();
  }

  /* ----------------------------------------------------------
     Inicializa quando o DOM estiver pronto
     ---------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();