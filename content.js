const ICON_COPY = '\uD83D\uDD17';  // ðŸ”—
const ICON_CHECK = '\u2705';        // âœ…
const ICON_SEARCH = '🔍';           // search icon
const JIRA_SEARCH_BASE = 'https://axilis.atlassian.net/issues?jql=project%20%3D%20%22Product%20Support%22%20AND%20%20%20text%20~%20%22%5C%22';
const JIRA_SEARCH_SUFFIX = '%5C%22%22%20ORDER%20BY%20created%20DESC';
const ICON_USER = '\uD83D\uDC64';
const ICON_FINANCE = '\uD83D\uDCB0';
const USER_URL_BASE = 'https://bacoff.services.production.betler.superbet.com/customer/';
const FINANCE_URL_BASE = 'https://bacoff.services.production.betler.superbet.com/finance/transactions/';
let currentBaseUrl = null;

function isSlackDomain() {
    return location.hostname.includes('slack.com');
}

function isJiraDomain() {
    return location.hostname.includes('atlassian.net');
}

// Fallback for SPA navigations: declarativeNetRequest only fires on main_frame
// HTTP requests, so client-side route changes inside Jira slip past rules.json.
const SERVICEDESK_REGEX = /^\/servicedesk\/customer\/portal\/\d+\/([A-Z][A-Z0-9_]*-\d+)/;

function redirectServicedeskIfNeeded() {
    const match = location.pathname.match(SERVICEDESK_REGEX);
    if (match) {
        location.replace(`https://axilis.atlassian.net/browse/${match[1]}${location.search}${location.hash}`);
        return true;
    }
    return false;
}

// popstate fires on back/forward across isolated worlds; pushState/replaceState
// from Jira's own code do not, so we also recheck on every MutationObserver tick
// (see fire() below).
window.addEventListener("popstate", redirectServicedeskIfNeeded);
redirectServicedeskIfNeeded();

const SPORT_DOMAINS = [
    { match: "Superbet Romania", url: "&target=1" },
    { match: "Superbet Poland", url: "&target=3" },
	{ match: "Superbet Serbia", url: "&target=7" },
	{ match: "Napoleon Belgium", url: "&target=8" },
	{ match: "Superbet Brazil", url: "&target=10" },
    { match: "Superbet Greece", url: "&target=11" }
];

function getSportBaseUrl() {
    // innerText (not textContent): must reflect only the *visible* sport
    // domain. The page lists every domain (e.g. in a dropdown) with all but
    // the active one hidden via CSS; textContent would match whichever one
    // comes first in DOM order regardless of which is actually shown.
    const text = document.body.innerText;

    for (const rule of SPORT_DOMAINS) {
        if (text.includes(rule.match)) {
            return rule.url;
        }
    }

    return ""; // fallback quando país ainda não foi atribuído
}

function updateExistingShortIdLinks(baseUrl) {
    document.querySelectorAll("a[href*='bookie.trading.superbet.com/ticket/details']").forEach(link => {
        const clean = link.href.replace(/&target=\d+/, "");
        link.href = clean + baseUrl;
    });
}

function buildHTML(id, url, color) {
    return `<a href="${url}" target="_blank" style="color:${color};font-weight:bold;text-decoration:none;white-space:nowrap;display:inline;vertical-align:baseline;"><span style="display:inline;">${id}</span><span class="copy-icon" data-id="${id}" title="Copiar ID" style="cursor:pointer;margin-left:4px;display:inline;">${ICON_COPY}</span></a>`;
}

function buildPlayerHTML(id) {
    const searchUrl = `${JIRA_SEARCH_BASE}${encodeURIComponent(id)}${JIRA_SEARCH_SUFFIX}`;
    const userUrl = `${USER_URL_BASE}${id}/edit`;
    const financeUrl = `${FINANCE_URL_BASE}${id}`;
    return `<span style="white-space:nowrap;display:inline;"><span style="display:inline;">${id}</span><span class="copy-icon" data-id="${id}" title="Copiar ID" style="cursor:pointer;margin-left:4px;display:inline;">${ICON_COPY}</span><span class="search-jira-btn" data-id="${id}" data-search-url="${searchUrl}" title="Search in Jira" style="cursor:pointer;margin-left:4px;display:inline;">${ICON_SEARCH}</span><a href="${userUrl}" target="_blank" title="Open user" style="text-decoration:none;margin-left:4px;display:inline;">${ICON_USER}</a><a href="${financeUrl}" target="_blank" title="Finance" style="text-decoration:none;margin-left:4px;display:inline;">${ICON_FINANCE}</a></span>`;
}

document.addEventListener("click", function (e) {
    const icon = e.target.closest(".copy-icon");
    const searchBtn = e.target.closest(".search-jira-btn");
    const isLink = e.target.closest("a[href*='superbet.com']");

    // Don't process copy/link if it's a search button click
    if (searchBtn) return;

    // Se for o ícone de copiar ou o próprio link que criamos
    if (icon || isLink) {
        e.stopPropagation();
        e.stopImmediatePropagation(); // Impede que o Jira sinta o clique

        if (icon) {
            e.preventDefault();
            const id = icon.getAttribute("data-id");
            copyToClipboard(id, icon);
        }
        // Se for o link (isLink), o comportamento padrão de abrir em nova aba continua
    }
}, true); // O 'true' aqui é vital para capturar o evento antes do Jira

function copyToClipboard(id, icon) {
    navigator.clipboard.writeText(id).then(() => {
        const original = icon.textContent;
        icon.textContent = ICON_CHECK;
        setTimeout(() => {
            icon.textContent = ICON_COPY;
        }, 1000);
    });
}

// Handle search button click
document.addEventListener("click", function (e) {
    const searchBtn = e.target.closest(".search-jira-btn");
    if (searchBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const searchUrl = searchBtn.getAttribute("data-search-url");
        window.open(searchUrl, "_blank");
    }
}, true);

// debounce + flag para evitar execução recursiva
let timeout;
let maxWaitTimeout;
let isProcessing = false;
const DEBOUNCE_MS = 400;
const MAX_WAIT_MS = 1500;

let lastPathname = location.pathname;

function fire() {
    clearTimeout(timeout);
    clearTimeout(maxWaitTimeout);
    timeout = null;
    maxWaitTimeout = null;

    // SPA navigations (pushState from Jira) don't fire popstate and can't be
    // intercepted from the isolated world, so check on every mutation tick.
    if (redirectServicedeskIfNeeded()) return;

    // Uma navegação SPA para outro ticket pode pertencer a um mercado/país
    // diferente, então o sport domain precisa ser redetectado nesse caso.
    if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        currentBaseUrl = null;
        needsFullScan = true;
    }

    // Verifica se o sport domain foi identificado após o carregamento inicial.
    // Uma vez resolvido para o ticket atual (valor não-vazio), não há motivo
    // para continuar recomputando isto a cada mutação enquanto permanecermos
    // na mesma página.
    if (!currentBaseUrl) {
        const detectedUrl = getSportBaseUrl();
        if (detectedUrl !== currentBaseUrl) {
            currentBaseUrl = detectedUrl;
            if (detectedUrl !== "") {
                // Retroativamente corrige links curtos já gerados sem o target
                updateExistingShortIdLinks(detectedUrl);
            }
        }
    }

    if (!isProcessing) {
        linkIDs();
    }
}

function runWithDebounce() {
    clearTimeout(timeout);
    timeout = setTimeout(fire, DEBOUNCE_MS);
    // Garante execução mesmo que mutações contínuas reiniciem o debounce.
    if (!maxWaitTimeout) {
        maxWaitTimeout = setTimeout(fire, MAX_WAIT_MS);
    }
}

const UUID_REGEX = /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi;
const SHORT_ID_REGEX = /\b[A-Z0-9]{4}-[A-Z0-9]{6}\b/g;

function acceptTextNode(node) {
    // Rejeita nós que já foram processados
    if (node.parentNode && node.parentNode.closest(".processed-by-ext")) {
        return NodeFilter.FILTER_REJECT;
    }
    // Rejeita nós dentro de links
    if (node.parentNode && node.parentNode.closest("a")) {
        return NodeFilter.FILTER_REJECT;
    }
    // Rejeita nós dentro de campos editáveis (comentários sendo digitados)
    if (node.parentNode && node.parentNode.closest("textarea, input, [contenteditable='true']")) {
        return NodeFilter.FILTER_REJECT;
    }
    return NodeFilter.FILTER_ACCEPT;
}

// Coleta apenas os nós de texto dentro de `root`, em vez de percorrer a
// document.body inteira. Sem isto, cada mutação (um campo do Jira que chega,
// um comentário que carrega, etc.) disparava uma nova varredura da página
// completa — e essa varredura fica cada vez mais cara à medida que mais UUIDs
// já convertidos se acumulam no DOM, dando a impressão de que os links vão
// "aparecendo um a um, cada vez mais lentamente".
function collectTextNodes(root) {
    if (root.nodeType === Node.TEXT_NODE) {
        return acceptTextNode(root) === NodeFilter.FILTER_ACCEPT ? [root] : [];
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return [];

    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: acceptTextNode });
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
}

// Raízes acumuladas a partir dos próprios registros do MutationObserver
// (mutation.addedNodes), para que só o que de fato mudou seja reprocessado.
let pendingRoots = new Set();
// Varredura completa na carga inicial e a cada navegação SPA. Antes isto era
// inferido de pendingRoots estar vazio, mas qualquer mutação chegando durante
// o debounce inicial fazia a primeira passada ignorar o conteúdo já existente.
let needsFullScan = true;

function escapeHTML(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function linkIDs() {
    if (isProcessing) return;
    isProcessing = true;
    // Pausa o observer para que as nossas próprias substituições não realimentem o debounce.
    observer.disconnect();

    try {
        processPending();
    } finally {
        // Sem try/finally, qualquer exceção aqui deixava o observer desconectado
        // e isProcessing=true para sempre: a extensão parava de funcionar em silêncio.
        observer.observe(document.body, OBSERVER_OPTIONS);
        isProcessing = false;
    }
}

function processPending() {
    const roots = needsFullScan || !pendingRoots.size ? [document.body] : Array.from(pendingRoots);
    needsFullScan = false;
    pendingRoots.clear();

    const seen = new Set();
    const textNodes = [];
    for (const root of roots) {
        if (!root.isConnected) continue; // já removido do DOM desde a mutação
        for (const tn of collectTextNodes(root)) {
            if (!seen.has(tn)) {
                seen.add(tn);
                textNodes.push(tn);
            }
        }
    }

    for (const node of textNodes) {
        if (!node.parentNode) continue;
        let text = node.nodeValue;
        // innerHTML abaixo interpreta o texto como HTML; sem escapar, qualquer
        // "<" ou "&" literal no texto do Jira corrompia o conteúdo do nó.
        const escaped = escapeHTML(text);

        let updatedText = escaped
            .replace(UUID_REGEX, (id) => buildPlayerHTML(id));
        
        // Only process short IDs on Jira, not on Slack
        if (isJiraDomain()) {
            updatedText = updatedText.replace(SHORT_ID_REGEX, (id) => {
                return buildHTML(id, `https://bookie.trading.superbet.com/ticket/details/?ticketCode=${id}${currentBaseUrl}`, "#d93025");
            });
        }

        if (updatedText !== escaped) {
			const span = document.createElement("span");
			span.className = "processed-by-ext"; // Marca para não re-processar
			span.innerHTML = updatedText;
			node.parentNode.replaceChild(span, node);
		}
    }
}

// init
// characterData: o React do Jira costuma atualizar o texto de um nó existente
// (ex.: ao trocar de ticket) sem adicionar nós, o que childList não detecta.
const OBSERVER_OPTIONS = { childList: true, subtree: true, characterData: true };
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "characterData") {
            pendingRoots.add(mutation.target);
            continue;
        }
        for (const node of mutation.addedNodes) {
            pendingRoots.add(node);
        }
    }
    runWithDebounce();
});
observer.observe(document.body, OBSERVER_OPTIONS);
runWithDebounce();