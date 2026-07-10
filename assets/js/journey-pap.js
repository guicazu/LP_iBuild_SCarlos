(function () {
    'use strict';

    /* ============================================================
       PAP (Passo a Passo / Jornada) — Funcionalidade isolada
       Não inclui: IntersectionObserver (.reveal), contadores,
       nav scroll — esses já são tratados pelo JavaScript inline no HTML.
       ============================================================ */

    // --- Cache de elementos do PAP ---
    var papFlow = document.getElementById('papFlow');
    var papLineGlow = document.getElementById('papLineGlow');
    var papProgressLabel = document.getElementById('papProgressLabel');
    var papMobileTrackFill = document.getElementById('papMobileTrackFill');
    var papNodes = papFlow ? papFlow.querySelectorAll('.pap-node') : [];

    var total = papNodes.length; // Total de nós (12 etapas)
    var ticking = false;         // Flag para requestAnimationFrame

    /**
     * openPap(idx) — Função de clique ACUMULATIVA
     *
     * - Adiciona .active ao nó clicado (NÃO remove dos anteriores)
     * - Remove .open de TODOS os nós, depois adiciona .open apenas ao clicado
     *   (a visibilidade do tooltip usa .open, não .active)
     * - Calcula maxLit = maior índice que possui a classe .active
     * - Atualiza a largura do papLineGlow: (maxLit / (total - 1)) * 92
     * - Atualiza o papProgressLabel: texto e posição
     * - Adiciona .active ao glow se widthPct > 0
     * - Adiciona .visible ao rótulo de progresso
     *
     * Exposta como window.openPap porque o HTML usa onclick="openPap(N)"
     */
    window.openPap = function (idx) {
        if (!papNodes.length || idx < 0 || idx >= total) return;

        // 1. Adiciona .active ao nó clicado (acumulativo — não remove dos anteriores)
        papNodes[idx].classList.add('active');

        // 2. Remove .open de todos os nós (tooltip usa .open, não .active)
        for (var i = 0; i < total; i++) {
            papNodes[i].classList.remove('open');
        }
        // Adiciona .open apenas ao nó clicado
        papNodes[idx].classList.add('open');

        // 3. Calcula maxLit: maior índice com classe .active
        var maxLit = 0;
        for (var j = 0; j < total; j++) {
            if (papNodes[j].classList.contains('active')) {
                maxLit = j;
            }
        }

        // 4. Fórmula de progresso: (maxLit / (total - 1)) * 92 (máximo 92%)
        var widthPct = (maxLit / (total - 1)) * 92;

        // 5. Atualiza a largura da linha de brilho (horizontal, não altura)
        if (papLineGlow) {
            papLineGlow.style.width = widthPct + '%';
            if (widthPct > 0) {
                papLineGlow.classList.add('active');
            }
        }

        // 6. Atualiza o rótulo de progresso
        if (papProgressLabel) {
            var pct = Math.round((maxLit + 1) / total * 100);
            papProgressLabel.textContent = pct + '%';
            papProgressLabel.style.left = 'calc(4% + ' + widthPct + '%)';
            papProgressLabel.classList.add('visible');
        }
    };

    /**
     * activatePap(idx) — Função de scroll DESKTOP (NÃO-acumulativa)
     *
     * - Só executa se window.innerWidth > 900
     * - Remove .active de todos os nós, adiciona .active apenas ao índice atual
     * - Mesma fórmula de progresso do openPap, mas não-acumulativa (maxLit = idx)
     * - Remove .active do glow se widthPct for 0
     */
    function activatePap(idx) {
        if (window.innerWidth <= 900) return;
        if (!papNodes.length || idx < 0 || idx >= total) return;

        // Remove .active de todos os nós (não-acumulativo)
        for (var i = 0; i < total; i++) {
            papNodes[i].classList.remove('active');
        }
        // Adiciona .active apenas ao nó atual
        papNodes[idx].classList.add('active');

        // Fórmula de progresso não-acumulativa: maxLit = idx
        var widthPct = (idx / (total - 1)) * 92;

        // Atualiza a largura da linha de brilho
        if (papLineGlow) {
            papLineGlow.style.width = widthPct + '%';
            if (widthPct > 0) {
                papLineGlow.classList.add('active');
            } else {
                papLineGlow.classList.remove('active');
            }
        }

        // Atualiza o rótulo de progresso
        if (papProgressLabel) {
            var pct = Math.round((idx + 1) / total * 100);
            papProgressLabel.textContent = pct + '%';
            papProgressLabel.style.left = 'calc(4% + ' + widthPct + '%)';
            papProgressLabel.classList.add('visible');
        }
    }

    /**
     * updatePapMobile() — Função de scroll MOBILE (acumulativa)
     *
     * - Só executa se window.innerWidth <= 900
     * - Calcula progresso vertical com base na posição de scroll da seção
     * - Atualiza a altura do papMobileTrackFill
     * - Ativa nós que passam pelo centro da viewport (acumulativo)
     * - Abre o tooltip (.open) do nó ativo mais avançado
     */
    function updatePapMobile() {
        if (window.innerWidth > 900) return;
        if (!papFlow || !papNodes.length) return;

        var rect = papFlow.getBoundingClientRect();
        var viewportH = window.innerHeight;
        var centerY = viewportH / 2;

        // Calcula progresso vertical da seção em relação à viewport
        var sectionTop = rect.top;
        var sectionHeight = rect.height;
        var scrollable = sectionHeight - viewportH;
        var progress = 0;

        if (scrollable > 0) {
            // Seção maior que viewport: progresso baseado em quanto já rolou
            progress = Math.max(0, Math.min(1, -sectionTop / scrollable));
        } else {
            // Seção menor que viewport: progresso baseado no centro
            progress = Math.max(0, Math.min(1, (centerY - sectionTop) / sectionHeight));
        }

        // Atualiza a altura do preenchimento da trilha mobile (vertical)
        if (papMobileTrackFill) {
            papMobileTrackFill.style.height = (progress * 100) + '%';
        }

        // Ativa nós que passaram pelo centro da viewport (acumulativo)
        var maxActive = -1;
        for (var i = 0; i < total; i++) {
            var nodeRect = papNodes[i].getBoundingClientRect();
            var nodeCenter = nodeRect.top + nodeRect.height / 2;
            if (nodeCenter <= centerY) {
                papNodes[i].classList.add('active');
                maxActive = i;
            }
        }

        // Abre o tooltip do nó ativo mais avançado
        if (maxActive >= 0) {
            for (var k = 0; k < total; k++) {
                papNodes[k].classList.remove('open');
            }
            papNodes[maxActive].classList.add('open');

            // Atualiza progresso horizontal para consistência visual
            var widthPct = (maxActive / (total - 1)) * 92;
            if (papLineGlow) {
                papLineGlow.style.width = widthPct + '%';
                if (widthPct > 0) {
                    papLineGlow.classList.add('active');
                }
            }
            if (papProgressLabel) {
                var pct = Math.round((maxActive + 1) / total * 100);
                papProgressLabel.textContent = pct + '%';
                papProgressLabel.style.left = 'calc(4% + ' + widthPct + '%)';
                papProgressLabel.classList.add('visible');
            }
        }
    }

    /**
     * updatePapDesktop() — Handler de scroll DESKTOP
     *
     * - Só executa se window.innerWidth > 900
     * - Encontra o nó mais próximo do centro da viewport
     * - Chama activatePap com esse índice
     */
    function updatePapDesktop() {
        if (window.innerWidth <= 900) return;
        if (!papFlow || !papNodes.length) return;

        var centerY = window.innerHeight / 2;
        var closestIdx = 0;
        var closestDist = Infinity;

        for (var i = 0; i < total; i++) {
            var nodeRect = papNodes[i].getBoundingClientRect();
            var nodeCenter = nodeRect.top + nodeRect.height / 2;
            var dist = Math.abs(nodeCenter - centerY);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = i;
            }
        }

        activatePap(closestIdx);
    }

    /**
     * onScroll() — Função unificada de scroll com requestAnimationFrame
     *
     * Delega para updatePapDesktop ou updatePapMobile conforme a largura da tela.
     * Usa flag ticking para evitar múltiplas chamadas simultâneas.
     */
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function () {
                if (window.innerWidth > 900) {
                    updatePapDesktop();
                } else {
                    updatePapMobile();
                }
                ticking = false;
            });
            ticking = true;
        }
    }

    /**
     * init() — Inicialização do PAP
     *
     * Re-busca elementos (caso o DOM ainda não estivesse pronto),
     * registra os listeners de scroll, resize e load,
     * e faz a chamada inicial.
     */
    function init() {
        // Re-busca elementos caso não tenham sido encontrados antes
        if (!papFlow) {
            papFlow = document.getElementById('papFlow');
            papLineGlow = document.getElementById('papLineGlow');
            papProgressLabel = document.getElementById('papProgressLabel');
            papMobileTrackFill = document.getElementById('papMobileTrackFill');
            papNodes = papFlow ? papFlow.querySelectorAll('.pap-node') : [];
            total = papNodes.length;
        }

        if (!papFlow) return;

        // Listener de scroll unificado (passive: true para performance)
        window.addEventListener('scroll', onScroll, { passive: true });

        // Listener de resize (recalcula estado ao mudar tamanho da tela)
        window.addEventListener('resize', onScroll);

        // Listener de load (recalcula após carregamento completo da página)
        window.addEventListener('load', onScroll);

        // Chamada inicial para definir o estado correto logo no carregamento
        onScroll();
    }

    // Inicializa no DOMContentLoaded (ou imediatamente se o DOM já estiver pronto)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();