/**
 * Simulador de Orçamento - iBUILD São Carlos
 * 
 * Este módulo realiza o cálculo de simulação com base em parâmetros carregados
 * do GitHub e envia o resultado para um webhook n8n.
 */

const PARAMETROS_URL = 'https://raw.githubusercontent.com/guicazu/guicazu.github.io/main/data/parametros.json';
const CLIENTES_URL   = 'https://raw.githubusercontent.com/guicazu/guicazu.github.io/main/data/clientes.json';
const SIMULACOES_URL = 'https://raw.githubusercontent.com/guicazu/guicazu.github.io/main/data/simulacoes.json';

// URL do webhook n8n (substituir pelo valor real)
const WEBHOOK_N8N_URL = 'https://webhook.n8n.cloud/seu-webhook-id';

// Cache de parâmetros carregados
let parametros = null;

/**
 * Carrega os parâmetros de construção a partir do arquivo JSON no GitHub.
 * @returns {Promise<void>}
 */
async function loadParametros() {
    try {
        console.log('Carregando parâmetros...');
        const response = await fetch(PARAMETROS_URL);
        if (!response.ok) {
            throw new Error(`Falha ao buscar parâmetros (status ${response.status})`);
        }
        parametros = await response.json();
        console.log('Parâmetros carregados com sucesso.');
    } catch (error) {
        console.error('Erro ao carregar parâmetros:', error);
        throw error; // Propaga o erro para o chamador
    }
}

/**
 * Calcula a simulação de orçamento.
 * @param {Object} dados - Dados da simulação.
 * @param {number} dados.areaTotal - Área total da casa em m².
 * @param {Array<{area: number, acabamento: string, peDireito: number}>} dados.ambientes - Lista de ambientes.
 * @param {string} dados.estilo - Estilo arquitetônico (ex: 'Brasileira').
 * @param {string} dados.tipoTelha - Tipo de telha (ex: 'Termoacústica').
 * @param {number} dados.distanciaKm - Distância em km entre Guarulhos e a obra.
 * @param {number} [dados.pavimentos=1] - Número de pavimentos.
 * @returns {Object} Resultado com valorTotal, metragemTotal, valorPorM2, prazo.
 */
function calcularSimulacao(dados) {
    if (!parametros) {
        throw new Error('Parâmetros ainda não foram carregados. Execute loadParametros() primeiro.');
    }

    // Extrai os dados com valores padrão para segurança
    const {
        areaTotal = 0,
        ambientes = [],
        estilo = 'Brasileira',
        tipoTelha = 'Termoacústica',
        distanciaKm = 0,
        pavimentos = 1
    } = dados;

    if (areaTotal <= 0) {
        throw new Error('Área total deve ser maior que zero.');
    }

    // --- Fatores de ajuste ---
    const fatorEstilo = (parametros.estilos && parametros.estilos[estilo]?.fator) || 1.0;
    const fatorTelha = (parametros.telhaFator && parametros.telhaFator[tipoTelha]) || 1.0;

    // --- Custo base da obra branca (estrutura) ---
    const custoBaseM2 = parametros.obraBrancaM2 || 1850;
    const custoObraBranca = areaTotal * custoBaseM2 * fatorTelha * fatorEstilo;

    // --- Custo de acabamentos por ambiente ---
    let custoAcabamentos = 0;
    for (const amb of ambientes) {
        const { area, acabamento, peDireito } = amb;
        if (area <= 0) continue;

        // Custo por m² do tipo de acabamento
        const acabamentoInfo = parametros.acabamentos?.[acabamento] || { custoM2: 320 };
        const custoAcabM2 = acabamentoInfo.custoM2 || 320;

        // Fator de pé-direito
        const peDireitoInfo = parametros.peDireito?.find(pd => Math.abs(pd.valor - peDireito) < 0.001);
        const fatorPeDireito = peDireitoInfo?.fator || 1.0;

        custoAcabamentos += area * custoAcabM2 * fatorPeDireito * fatorEstilo;
    }

    // --- Frete (ida + volta) ---
    const freteKm = parametros.freteKm || 9.5;
    const custoFrete = distanciaKm * freteKm * 2;

    // --- Subtotal antes dos custos indiretos ---
    // (Poderiam ser incluídos outros componentes, mas mantemos o essencial)
    const subtotal = custoObraBranca + custoAcabamentos + custoFrete;

    // --- Custos indiretos (margem, impostos, contingência) ---
    // Percentuais retirados dos parâmetros (se existirem)
    const margemPct = parametros.margemPct || 0;
    const impostosPct = parametros.impostosPct || 0;
    const contingenciaPct = parametros.contingenciaPct || 0;
    const indiretosPct = margemPct + impostosPct + contingenciaPct;
    const custosIndiretos = subtotal * (indiretosPct / 100);

    // --- Valor total final ---
    const valorTotal = subtotal + custosIndiretos;

    // --- Métricas adicionais ---
    const metragemTotal = areaTotal;
    const valorPorM2 = metragemTotal > 0 ? valorTotal / metragemTotal : 0;

    // --- Prazo estimado ---
    const prazoBaseDias = parametros.prazoBaseDias || 90;
    const prazoM2 = parametros.prazoM2 || 0.55;
    const prazo = Math.round(prazoBaseDias + metragemTotal * prazoM2);

    // Retorna APENAS os quatro campos solicitados
    return {
        valorTotal,
        metragemTotal,
        valorPorM2,
        prazo
    };
}

/**
 * Envia o resultado da simulação para o webhook n8n via POST.
 * @param {Object} resultado - Objeto com valorTotal, metragemTotal, valorPorM2, prazo.
 * @returns {Promise<void>}
 */
async function enviarParaN8n(resultado) {
    try {
        console.log('Enviando resultado para n8n...');
        const response = await fetch(WEBHOOK_N8N_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultado)
        });
        if (!response.ok) {
            throw new Error(`Webhook respondeu com status ${response.status}`);
        }
        console.log('Resultado enviado com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar para n8n:', error);
        throw error;
    }
}

// --- Outras funções auxiliares (caso necessário futuramente) ---

/**
 * (Opcional) Carrega dados de clientes do GitHub.
 */
async function loadClientes() {
    // Implementação similar a loadParametros, se necessário.
}

/**
 * (Opcional) Carrega dados de simulações do GitHub.
 */
async function loadSimulacoes() {
    // Implementação similar a loadParametros, se necessário.
}

// Exporta as funções para uso como módulo (Node.js)
module.exports = {
    loadParametros,
    calcularSimulacao,
    enviarParaN8n
};

// Se este arquivo for executado diretamente (node simulacao.js), roda um exemplo.
if (require.main === module) {
    (async () => {
        try {
            await loadParametros();

            // Dados de exemplo – em um cenário real, estes viriam de um formulário ou serviço
            const dados = {
                areaTotal: 150,
                ambientes: [
                    { area: 40, acabamento: 'Premium', peDireito: 2.8 },
                    { area: 80, acabamento: 'Standard', peDireito: 2.6 },
                    { area: 30, acabamento: 'Supreme', peDireito: 3.0 }
                ],
                estilo: 'Contemporânea',
                tipoTelha: 'Cerâmica',
                distanciaKm: 330,
                pavimentos: 2
            };

            const resultado = calcularSimulacao(dados);
            console.log('Resultado da simulação:');
            console.log(JSON.stringify(resultado, null, 2));

            await enviarParaN8n(resultado);
        } catch (err) {
            console.error('Execução interrompida:', err.message);
            process.exit(1);
        }
    })();
}
