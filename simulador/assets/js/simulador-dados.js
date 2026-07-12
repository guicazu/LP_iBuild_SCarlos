/* =====================================================================
   ARQUIVO 3/4: simulador/assets/js/simulador-dados.js
   ===================================================================== */

/*
 * simulador-dados.js
 * Base de dados do Simulador iBUILD — ambientes, módulos, acabamentos e parâmetros técnicos.
 * Todos os valores são referências de mercado para Light Steel Frame e estão sujeitos a validação.
 */

window.SIM_DADOS = (function () {
    'use strict';

    /* Módulos padrão por categoria de ambiente.
       area = área em m² de UMA unidade do módulo. */
    var MODULOS = {
        pequeno: { label: 'Pequeno', area: 8 },
        medio: { label: 'Médio', area: 14 },
        grande: { label: 'Grande', area: 22 }
    };

    /* Ambientes disponíveis no simulador.
       Cada ambiente possui módulos sugeridos e categoria para cor/ícone. */
    var AMBIENTES = [
        {
            id: 'sala-estar', nome: 'Sala de Estar', icone: '🛋', categoria: 'social',
            modulos: { pequeno: 1, medio: 1, grande: 0 }, peDireito: 2.8, acabamento: 'Premium'
        },
        {
            id: 'sala-jantar', nome: 'Sala de Jantar', icone: '🍽', categoria: 'social',
            modulos: { pequeno: 0, medio: 1, grande: 1 }, peDireito: 2.8, acabamento: 'Premium'
        },
        {
            id: 'cozinha', nome: 'Cozinha', icone: '🍳', categoria: 'servico',
            modulos: { pequeno: 0, medio: 1, grande: 0 }, peDireito: 2.8, acabamento: 'Premium'
        },
        {
            id: 'area-gourmet', nome: 'Área Gourmet', icone: '🔥', categoria: 'social',
            modulos: { pequeno: 0, medio: 1, grande: 1 }, peDireito: 3.0, acabamento: 'Premium'
        },
        {
            id: 'dormitorio', nome: 'Dormitório', icone: '🛏', categoria: 'intimo',
            modulos: { pequeno: 1, medio: 1, grande: 0 }, peDireito: 2.8, acabamento: 'Standard'
        },
        {
            id: 'suite', nome: 'Suíte', icone: '🛁', categoria: 'intimo',
            modulos: { pequeno: 0, medio: 1, grande: 1 }, peDireito: 2.8, acabamento: 'Premium'
        },
        {
            id: 'banheiro', nome: 'Banheiro', icone: '🚿', categoria: 'servico',
            modulos: { pequeno: 1, medio: 0, grande: 0 }, peDireito: 2.6, acabamento: 'Standard'
        },
        {
            id: 'lavanderia', nome: 'Lavanderia', icone: '🧺', categoria: 'servico',
            modulos: { pequeno: 1, medio: 0, grande: 0 }, peDireito: 2.6, acabamento: 'Standard'
        },
        {
            id: 'escritorio', nome: 'Escritório', icone: '💻', categoria: 'intimo',
            modulos: { pequeno: 1, medio: 0, grande: 0 }, peDireito: 2.8, acabamento: 'Standard'
        },
        {
            id: 'garagem', nome: 'Garagem', icone: '🚗', categoria: 'externo',
            modulos: { pequeno: 0, medio: 0, grande: 2 }, peDireito: 3.0, acabamento: 'Standard'
        },
        {
            id: 'varanda', nome: 'Varanda', icone: '🌿', categoria: 'externo',
            modulos: { pequeno: 0, medio: 1, grande: 0 }, peDireito: 3.0, acabamento: 'Standard'
        },
        {
            id: 'hall', nome: 'Hall / Circulação', icone: '🚪', categoria: 'circulacao',
            modulos: { pequeno: 1, medio: 0, grande: 0 }, peDireito: 2.8, acabamento: 'Standard'
        }
    ];

    /* Níveis de acabamento — custo por m² do ambiente. */
    var ACABAMENTOS = {
        Standard: { label: 'Standard', custoM2: 320, fator: 1.0 },
        Premium: { label: 'Premium', custoM2: 520, fator: 1.25 },
        Supreme: { label: 'Supreme', custoM2: 780, fator: 1.6 }
    };

    /* Opções de pé-direito com fator de influência no custo. */
    var PE_DIREITO = [
        { valor: 2.6, label: '2,60 m', fator: 0.95 },
        { valor: 2.8, label: '2,80 m', fator: 1.0 },
        { valor: 3.0, label: '3,00 m', fator: 1.08 },
        { valor: 3.3, label: '3,30 m', fator: 1.18 },
        { valor: 3.6, label: '3,60 m', fator: 1.30 },
        { valor: 4.2, label: '4,20 m (pé-direito alto)', fator: 1.5 }
    ];

    /* Estilos arquitetônicos — fator multiplicador sobre o custo global. */
    var ESTILOS = {
        'Contemporânea': { fator: 1.0 },
        'Européia': { fator: 1.12 },
        'Neo-Clássica': { fator: 1.22 },
        'Brasileira': { fator: 1.0 },
        'Mediterrânea': { fator: 1.15 },
        'Clássica': { fator: 1.28 }
    };

    /* Parâmetros técnicos derivados da área total.
       Todos os custos em R$ por m² ou R$ por unidade. */
    var PARAMETROS = {
        obraBrancaM2: 1850,        // estrutura LSF + fechamentos + cobertura base
        circulacaoPct: 0.12,       // % da área total destinada à circulação
        pisosPct: 0.88,            // % da área total com piso revestido
        paredesExtFator: 0.55,     // m lineares de parede externa por m² de área
        paredesIntFator: 0.85,     // m lineares de parede interna por m² de área
        forroM2: 95,               // R$/m² de forro
        pinturaIntM2: 48,          // R$/m² de pintura interna
        pinturaExtM2: 72,          // R$/m² de pintura externa
        esquadriasM2: 680,         // R$/m² de esquadrias/vidros (aplicado sobre % da área)
        esquadriasPct: 0.14,       // % da área total em esquadrias
        bancadasM2: 28,            // R$/m² (aplicado sobre área total como referência)
        portasUn: 780,             // R$ por porta
        portasFator: 0.06,         // portas por m² de área
        eletricaM2: 85,            // R$/m² pontos elétricos
        lajeM2: 240,               // R$/m² de laje (verticalização por pavimento)
        freteKm: 9.5,              // R$/km (ida + volta)
        piscinaM2: 920,            // R$/m² de piscina
        muroM2: 380,               // R$/m² de muro de divisa
        telhaFator: {
            'Termoacústica': 1.0,
            'Fibrocimento': 0.82,
            'Cerâmica': 1.18,
            'Telha Metálica': 0.9,
            'Laje Impermeabilizada': 1.35
        },
        pavimentoLajeExtra: 0.5,   // acréscimo de laje por pavimento adicional
        prazoBaseDias: 90,         // dias base
        prazoM2: 0.55              // dias por m²
    };

    /* Paleta de cores para a composição visual por ambiente. */
    var CORES = [
        '#c9a227', '#e6c659', '#a8841d', '#d4b443',
        '#8f6f15', '#f0d97a', '#b8951f', '#d9b850',
        '#e8d98a', '#9c7e1a', '#cbb04a', '#d8c06b'
    ];

    return {
        MODULOS: MODULOS,
        AMBIENTES: AMBIENTES,
        ACABAMENTOS: ACABAMENTOS,
        PE_DIREITO: PE_DIREITO,
        ESTILOS: ESTILOS,
        PARAMETROS: PARAMETROS,
        CORES: CORES
    };
})();
