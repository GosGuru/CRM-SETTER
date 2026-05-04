(function () {
  const HOST_ID = "crm-maxi-manychat-panel";
  const DEFAULT_DEV_CRM_BASE_URL = "http://localhost:3000";
  const DEFAULT_PRODUCTION_CRM_BASE_URL = "https://crmmaxi.vercel.app";
  const DRAFT_OVERRIDES_KEY = "crmStructureDraftOverrides";
  const MAX_CONTEXT_LINES = 24;
  const AI_PROVIDERS = [
    { id: "deepseek", label: "DeepSeek" },
    { id: "edipsic", label: "Edipsic" },
    { id: "edith", label: "Edith" },
  ];

  const ICONS = {
    adapt:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.4 4.3L18 9l-4.6 1.7L12 15l-1.4-4.3L6 9l4.6-1.7L12 3z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z"/><path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    copy:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
    minimize:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    plus:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.15.36.36.7.6 1 .31.25.7.4 1.1.4H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.1.4c-.25.31-.46.64-.6 1z"/></svg>',
    target:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>',
    userPlus:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>',
  };

  if (document.getElementById(HOST_ID)) return;

  const state = {
    crmBaseMode: "auto",
    crmBaseUrl: DEFAULT_DEV_CRM_BASE_URL,
    extensionToken: "",
    aiProvider: "deepseek",
    activeView: "steps",
    settingsOpen: false,
    steps: [],
    labels: {},
    drafts: {},
    activeStepId: "",
    query: "",
    contactName: "",
    contactInstagram: "",
    chatContext: "",
    status: "Cargando estructura...",
    statusTone: "info",
    error: "",
    collapsed: false,
    loading: false,
    detectingStep: false,
    stepSuggestion: null,
    creatingLead: false,
    createdLeadId: "",
    adaptingBlockId: "",
    adaptedByBlock: {},
    copiedKey: "",
  };

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const app = document.createElement("div");
  shadow.appendChild(app);

  void boot();

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "CRM_MAXI_TOGGLE_PANEL") return;
    setCollapsed(!state.collapsed);
  });

  async function boot() {
    await loadStyles();
    const stored = await storageGet([
      "crmBaseMode",
      "crmBaseUrl",
      "extensionToken",
      "aiProvider",
      "crmPanelCollapsed",
      DRAFT_OVERRIDES_KEY,
    ]);
    state.crmBaseMode = stored.crmBaseMode || "auto";
    state.crmBaseUrl = normalizeBaseUrl(stored.crmBaseUrl || getAutoCrmBaseUrl());
    state.extensionToken = stored.extensionToken || "";
    state.aiProvider = stored.aiProvider || "deepseek";
    state.collapsed = Boolean(stored.crmPanelCollapsed);
    render();
    await loadSteps(stored[DRAFT_OVERRIDES_KEY] || {});
    refreshContext({ silent: true });
  }

  async function loadStyles() {
    try {
      const response = await fetch(chrome.runtime.getURL("panel.css"));
      const css = await response.text();
      const style = document.createElement("style");
      style.textContent = css;
      shadow.appendChild(style);
    } catch {
      const style = document.createElement("style");
      style.textContent = ".crm-panel{position:fixed;right:12px;top:72px;z-index:2147483647;background:white;border:1px solid #ddd;padding:12px}";
      shadow.appendChild(style);
    }
  }

  async function loadSteps(savedDraftOverrides) {
    state.loading = true;
    setStatus("Sincronizando estructura...", "info");
    render();

    try {
      const response = await fetch(`${getCrmBaseUrl()}/api/extension/steps`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      state.steps = Array.isArray(data.steps) ? data.steps : [];
      state.labels = data.labels || {};
      state.drafts = {
        ...(data.defaultDrafts || {}),
        ...(savedDraftOverrides || {}),
      };
      state.activeStepId = state.activeStepId || state.steps[0]?.id || "";
      setStatus(`${state.steps.length} pasos listos`, "success");
    } catch {
      setStatus(`No pude conectar con ${getCrmBaseUrl()}`, "error");
    } finally {
      state.loading = false;
      render();
    }
  }

  function render() {
    if (state.collapsed) {
      app.innerHTML = `
        <div class="crm-panel crm-panel--collapsed">
          <button class="crm-collapsed-button" type="button" data-action="expand" title="Abrir CRM Maxi">CRM Maxi</button>
        </div>
      `;
      bindEvents();
      return;
    }

    app.innerHTML = `
      <aside class="crm-panel" aria-label="CRM Maxi para Manychat">
        <header class="crm-header">
          <div class="crm-title">
            <strong>${state.activeView === "ingresar" ? "Ingresar al CRM" : "Pasos CRM"}</strong>
            <span>${escapeHtml(getHeaderSubtitle())}</span>
          </div>
          <div class="crm-header-actions">
            <button class="crm-icon-button" type="button" data-action="refresh-context" title="Actualizar datos visibles" aria-label="Actualizar datos visibles">${ICONS.refresh}</button>
            <button class="crm-icon-button" type="button" data-action="toggle-settings" title="Ajustes" aria-label="Ajustes">${ICONS.settings}</button>
            <button class="crm-icon-button" type="button" data-action="collapse" title="Colapsar" aria-label="Colapsar">${ICONS.minimize}</button>
          </div>
        </header>

        <nav class="crm-tabs" aria-label="Secciones del panel">
          <button class="crm-tab" type="button" data-action="set-view" data-view="steps" aria-current="${state.activeView === "steps" ? "page" : "false"}">Pasos</button>
          <button class="crm-tab" type="button" data-action="set-view" data-view="ingresar" aria-current="${state.activeView === "ingresar" ? "page" : "false"}">Ingresar al CRM</button>
        </nav>

        <div class="crm-scroll">
          <div class="crm-stack">
            ${renderStatus()}
            ${state.settingsOpen ? renderSettings() : ""}
            ${state.activeView === "ingresar" ? renderLeadView() : renderStepsView()}
          </div>
        </div>
      </aside>
    `;

    bindEvents();
  }

  function renderStatus() {
    return `<div class="crm-status crm-status--${escapeAttribute(state.statusTone)}">${escapeHtml(state.error || state.status)}</div>`;
  }

  function renderSettings() {
    return `
      <section class="crm-section crm-section--quiet">
        <div class="crm-section-title">
          <h2>Ajustes</h2>
          <span>Técnico</span>
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-base-mode">URL del CRM</label>
          <select id="crm-base-mode" class="crm-input" data-role="crm-base-mode">
            <option value="auto" ${state.crmBaseMode === "auto" ? "selected" : ""}>Auto: desarrollo / producción</option>
            <option value="manual" ${state.crmBaseMode === "manual" ? "selected" : ""}>Manual</option>
          </select>
        </div>
        <div class="crm-field ${state.crmBaseMode === "manual" ? "" : "crm-field--disabled"}">
          <label class="crm-label" for="crm-base-url">URL manual</label>
          <input id="crm-base-url" class="crm-input" data-role="crm-url" value="${escapeAttribute(state.crmBaseUrl)}" ${state.crmBaseMode === "manual" ? "" : "disabled"} />
          <div class="crm-hint">Usando ahora: ${escapeHtml(getCrmBaseUrl())}</div>
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-extension-token">Token técnico</label>
          <input id="crm-extension-token" class="crm-input" data-role="extension-token" type="password" value="${escapeAttribute(state.extensionToken)}" placeholder="Solo si el CRM lo pide" />
        </div>
      </section>
    `;
  }

  function renderStepsView() {
    const activeStep = getActiveStep();
    const visibleSteps = getVisibleSteps();

    return `
      <section class="crm-section crm-stack">
        <div class="crm-control-row">
          <div class="crm-field crm-field--grow">
            <label class="crm-label" for="crm-step-search">Paso</label>
            <input id="crm-step-search" class="crm-input" data-role="search" value="${escapeAttribute(state.query)}" placeholder="4, 10, objeción..." />
          </div>
          <div class="crm-field crm-ai-field">
            <label class="crm-label" for="crm-ai-provider">IA</label>
            <select id="crm-ai-provider" class="crm-input" data-role="ai-provider">
              ${AI_PROVIDERS.map((provider) => `<option value="${provider.id}" ${state.aiProvider === provider.id ? "selected" : ""}>${provider.label}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="crm-step-row" aria-label="Selector rápido de pasos">
          ${visibleSteps.map(renderStepChip).join("")}
        </div>
      </section>

      <section class="crm-section">
        <div class="crm-step-heading">
          <div>
            <h2>${activeStep ? `${activeStep.number}. ${escapeHtml(activeStep.title)}` : "Sin paso activo"}</h2>
            <p>${activeStep ? escapeHtml(activeStep.description || "") : "Cargá los pasos desde el CRM."}</p>
          </div>
          ${activeStep ? `<span class="crm-badge">${activeStep.number}</span>` : ""}
        </div>
        <div class="crm-actions">
          <button class="crm-button crm-button--primary" type="button" data-action="copy-step" ${activeStep ? "" : "disabled"}>${ICONS.copy}<span>Copiar paso</span></button>
          <button class="crm-button" type="button" data-action="reload-steps">${ICONS.refresh}<span>Recargar</span></button>
        </div>
      </section>

      ${renderContextSection()}

      <section class="crm-section crm-stack crm-block-list">
        ${activeStep ? activeStep.blocks.map((block) => renderBlock(block, activeStep)).join("") : `<p class="crm-muted">No hay bloques para mostrar.</p>`}
      </section>
    `;
  }

  function renderLeadView() {
    return `
      <section class="crm-section crm-stack crm-lead-card">
        <div class="crm-section-title">
          <h2>Nuevo lead</h2>
          <span>${state.createdLeadId ? "Cargado" : "Manychat"}</span>
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-contact-name">Nombre</label>
          <input id="crm-contact-name" class="crm-input crm-input--strong" data-role="contact-name" value="${escapeAttribute(state.contactName)}" placeholder="Nombre del lead" />
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-contact-instagram">Instagram</label>
          <input id="crm-contact-instagram" class="crm-input" data-role="contact-instagram" value="${escapeAttribute(state.contactInstagram)}" placeholder="usuario_instagram" />
        </div>
        <div class="crm-actions crm-actions--single">
          <button class="crm-button crm-button--primary" type="button" data-action="create-lead" ${state.creatingLead ? "disabled" : ""}>${state.creatingLead ? ICONS.refresh : ICONS.userPlus}<span>${state.creatingLead ? "Cargando..." : "Cargar lead"}</span></button>
        </div>
        ${state.createdLeadId ? `
          <button class="crm-button" type="button" data-action="open-created-lead">${ICONS.external}<span>Abrir lead</span></button>
        ` : ""}
      </section>

      ${renderContextSection()}
    `;
  }

  function renderContextSection() {
    return `
      <section class="crm-section crm-stack">
        <div class="crm-section-title">
          <h2>Contexto</h2>
          <span>${state.chatContext ? "Listo" : "Manual"}</span>
        </div>
        <div class="crm-actions crm-actions--three">
          <button class="crm-button crm-button--primary" type="button" data-action="detect-step" ${state.detectingStep ? "disabled" : ""}>${state.detectingStep ? ICONS.refresh : ICONS.target}<span>${state.detectingStep ? "Detectando..." : "Detectar paso"}</span></button>
          <button class="crm-button" type="button" data-action="refresh-context">${ICONS.refresh}<span>Leer visible</span></button>
          <button class="crm-button" type="button" data-action="clear-context">${ICONS.plus}<span>Limpiar</span></button>
        </div>
        ${renderStepSuggestion()}
        <div class="crm-field">
          <label class="crm-label" for="crm-chat-context">Mensajes para adaptar</label>
          <textarea id="crm-chat-context" class="crm-textarea crm-textarea--context" data-role="chat-context" placeholder="Pegá o seleccioná mensajes si Manychat no permite leerlos.">${escapeHtml(state.chatContext)}</textarea>
        </div>
      </section>
    `;
  }

  function renderStepSuggestion() {
    if (!state.stepSuggestion) return "";
    const step = state.steps.find((item) => item.id === state.stepSuggestion.stepId);
    if (!step) return "";

    return `
      <div class="crm-step-suggestion">
        <div>
          <strong>${step.number}. ${escapeHtml(step.title)}</strong>
          <p>${escapeHtml(state.stepSuggestion.reason || step.description)}</p>
        </div>
        <span>${Math.round((state.stepSuggestion.confidence || 0) * 100)}%</span>
      </div>
    `;
  }

  function renderStepChip(step) {
    const isActive = step.id === state.activeStepId;
    const title = `${step.number}. ${step.title}`;
    return `<button class="crm-step-chip" type="button" data-action="select-step" data-step-id="${escapeAttribute(step.id)}" aria-current="${isActive ? "step" : "false"}" title="${escapeAttribute(title)}"><span>${step.number}</span></button>`;
  }

  function renderBlock(block, step) {
    const value = state.drafts[block.id] || "";
    const lines = extractLines(value).slice(0, 3);
    const adapted = state.adaptedByBlock[block.id] || "";
    const isAdapting = state.adaptingBlockId === block.id;

    return `
      <article class="crm-block">
        <div class="crm-block-header">
          <div>
            <h3>${escapeHtml(block.title)}</h3>
            <div class="crm-block-kind">${escapeHtml(state.labels[block.kind] || block.kind)} · ${escapeHtml(step.title)}</div>
          </div>
        </div>

        <textarea class="crm-textarea" data-role="draft" data-block-id="${escapeAttribute(block.id)}" rows="5">${escapeHtml(value)}</textarea>

        <div class="crm-actions">
          <button class="crm-button crm-button--primary" type="button" data-action="adapt-block" data-block-id="${escapeAttribute(block.id)}" ${isAdapting ? "disabled" : ""}>${ICONS.adapt}<span>${isAdapting ? "Adaptando..." : "Adaptar con IA"}</span></button>
          <button class="crm-button" type="button" data-action="copy-block" data-block-id="${escapeAttribute(block.id)}">${ICONS.copy}<span>Copiar base</span></button>
        </div>

        ${adapted ? `
          <div class="crm-adapted">
            <label class="crm-label">Adaptado</label>
            <textarea class="crm-textarea" data-role="adapted" data-block-id="${escapeAttribute(block.id)}" rows="4">${escapeHtml(adapted)}</textarea>
            <button class="crm-button crm-button--primary" type="button" data-action="copy-adapted" data-block-id="${escapeAttribute(block.id)}">${ICONS.check}<span>Copiar adaptado</span></button>
          </div>
        ` : ""}

        ${lines.length ? `
          <div class="crm-line-list">
            ${lines.map((line, index) => `
              <div class="crm-line">
                <span class="crm-badge">${index + 1}</span>
                <p>${escapeHtml(line)}</p>
                <button class="crm-icon-button crm-icon-button--small" type="button" data-action="copy-line" data-block-id="${escapeAttribute(block.id)}" data-line-index="${index}" title="Copiar línea" aria-label="Copiar línea">${ICONS.copy}</button>
              </div>
            `).join("")}
          </div>
        ` : `<p class="crm-muted">Este bloque todavía no tiene texto.</p>`}
      </article>
    `;
  }

  function bindEvents() {
    app.onclick = handleClick;
    app.oninput = handleInput;
    app.onchange = handleChange;
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    if (action === "expand") return setCollapsed(false);
    if (action === "collapse") return setCollapsed(true);
    if (action === "toggle-settings") {
      state.settingsOpen = !state.settingsOpen;
      return render();
    }
    if (action === "set-view") {
      state.activeView = target.dataset.view || "steps";
      refreshContext({ silent: true });
      return render();
    }
    if (action === "reload-steps") return void loadSteps(state.drafts);
    if (action === "refresh-context") return refreshContext();
    if (action === "clear-context") {
      state.chatContext = "";
      state.stepSuggestion = null;
      setStatus("Contexto limpio", "info");
      return render();
    }
    if (action === "select-step") {
      state.activeStepId = target.dataset.stepId || state.activeStepId;
      state.query = "";
      return render();
    }
    if (action === "copy-step") return copyText(buildStepCopy(getActiveStep()), `step-${state.activeStepId}`);
    if (action === "copy-block") return copyText(state.drafts[target.dataset.blockId] || "", `block-${target.dataset.blockId}`);
    if (action === "copy-adapted") return copyText(state.adaptedByBlock[target.dataset.blockId] || "", `adapted-${target.dataset.blockId}`);
    if (action === "copy-line") {
      const blockId = target.dataset.blockId;
      const index = Number(target.dataset.lineIndex || 0);
      const line = extractLines(state.drafts[blockId] || "")[index] || "";
      return copyText(line, `line-${blockId}-${index}`);
    }
    if (action === "adapt-block") return void adaptBlock(target.dataset.blockId);
    if (action === "detect-step") return void detectCurrentStep();
    if (action === "create-lead") return void createLeadFromManychat();
    if (action === "open-created-lead") return openCreatedLead();
  }

  function handleInput(event) {
    const target = event.target;
    const role = target.dataset.role;

    if (role === "search") {
      const cursorPosition = target.selectionStart || target.value.length;
      state.query = target.value;
      render();
      const searchInput = shadow.querySelector("[data-role='search']");
      searchInput?.focus();
      searchInput?.setSelectionRange(cursorPosition, cursorPosition);
      return;
    }
    if (role === "contact-name") {
      state.contactName = target.value;
      return;
    }
    if (role === "contact-instagram") {
      state.contactInstagram = normalizeInstagramUsername(target.value);
      target.value = state.contactInstagram;
      return;
    }
    if (role === "chat-context") {
      state.chatContext = target.value;
      return;
    }
    if (role === "draft") {
      state.drafts[target.dataset.blockId] = target.value;
      saveDraftOverrides();
      return;
    }
    if (role === "adapted") {
      state.adaptedByBlock[target.dataset.blockId] = target.value;
    }
  }

  function handleChange(event) {
    const target = event.target;
    const role = target.dataset.role;
    if (role === "crm-base-mode") {
      state.crmBaseMode = target.value === "manual" ? "manual" : "auto";
      chrome.storage.local.set({ crmBaseMode: state.crmBaseMode });
      void loadSteps(state.drafts);
      return;
    }
    if (role === "crm-url") {
      state.crmBaseUrl = normalizeBaseUrl(target.value || DEFAULT_DEV_CRM_BASE_URL);
      chrome.storage.local.set({ crmBaseUrl: state.crmBaseUrl });
      void loadSteps(state.drafts);
      return;
    }
    if (role === "extension-token") {
      state.extensionToken = target.value.trim();
      chrome.storage.local.set({ extensionToken: state.extensionToken });
      return;
    }
    if (role === "ai-provider") {
      state.aiProvider = target.value || "deepseek";
      chrome.storage.local.set({ aiProvider: state.aiProvider });
    }
  }

  async function adaptBlock(blockId) {
    const step = getActiveStep();
    const block = step?.blocks.find((item) => item.id === blockId);
    const baseText = (state.drafts[blockId] || "").trim();

    if (!step || !block || !baseText) {
      setStatus("Elegí un bloque con texto antes de adaptar", "error");
      render();
      return;
    }

    state.adaptingBlockId = blockId;
    setStatus("Adaptando con IA...", "info");
    render();

    try {
      const response = await fetch(`${getCrmBaseUrl()}/api/extension/adapt-message`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          aiProvider: state.aiProvider,
          stepTitle: step.title,
          blockTitle: block.title,
          baseText,
          contactName: state.contactName,
          chatContext: getCleanChatContext(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo adaptar el mensaje.");

      state.adaptedByBlock[blockId] = data.adapted || "";
      setStatus("Mensaje adaptado", "success");
    } catch (error) {
      setStatus(error.message || "No se pudo adaptar el mensaje", "error");
    } finally {
      state.adaptingBlockId = "";
      render();
    }
  }

  async function detectCurrentStep() {
    refreshContext({ silent: true, skipRender: true });
    const chatContext = getCleanChatContext();

    if (!chatContext.trim()) {
      setStatus("No hay contexto para detectar el paso", "error");
      render();
      return;
    }

    state.detectingStep = true;
    setStatus("Detectando paso del chat...", "info");
    render();

    try {
      const response = await fetch(`${getCrmBaseUrl()}/api/extension/detect-step`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          aiProvider: state.aiProvider,
          contactName: state.contactName,
          chatContext,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo detectar el paso.");

      const detection = data.detection || null;
      const step = detection ? state.steps.find((item) => item.id === detection.stepId) : null;
      if (!step) throw new Error("La IA no devolvió un paso válido.");

      if (data.cleanedContext) state.chatContext = data.cleanedContext;
      state.activeView = "steps";
      state.activeStepId = step.id;
      state.query = "";
      state.stepSuggestion = detection;
      setStatus(`Paso sugerido: ${step.number}. ${step.title}`, "success");
    } catch (error) {
      setStatus(error.message || "No se pudo detectar el paso", "error");
    } finally {
      state.detectingStep = false;
      render();
    }
  }

  async function createLeadFromManychat() {
    const nombre = cleanText(state.contactName);
    if (!nombre || !isPossibleContactName(nombre)) {
      setStatus("Revisá el nombre antes de cargar el lead", "error");
      render();
      return;
    }

    state.creatingLead = true;
    setStatus("Cargando lead en CRM...", "info");
    render();

    try {
      const response = await fetch(`${getCrmBaseUrl()}/api/extension/leads`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          nombre,
          instagram: state.contactInstagram,
          chatContext: getCleanChatContext(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.leadId) state.createdLeadId = data.leadId;
        throw new Error(data.error || "No se pudo cargar el lead.");
      }

      state.createdLeadId = data.lead?.id || "";
      setStatus(`Lead cargado: ${data.lead?.nombre || nombre}`, "success");
    } catch (error) {
      setStatus(error.message || "No se pudo cargar el lead", "error");
    } finally {
      state.creatingLead = false;
      render();
    }
  }

  function openCreatedLead() {
    if (!state.createdLeadId) return;
    window.open(`${getCrmBaseUrl()}/leads/${state.createdLeadId}`, "_blank", "noopener,noreferrer");
  }

  async function copyText(text, key) {
    const value = (text || "").trim();
    if (!value) {
      setStatus("No hay texto para copiar", "error");
      render();
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      state.copiedKey = key;
      setStatus("Copiado", "success");
      render();
      window.setTimeout(() => {
        if (state.copiedKey === key) {
          state.copiedKey = "";
          render();
        }
      }, 1200);
    } catch {
      setStatus("Chrome no permitió copiar. Seleccioná el texto manualmente", "error");
      render();
    }
  }

  function refreshContext(options = {}) {
    const detectedName = detectContactName();
    const detectedInstagram = detectInstagramUsername();

    if (detectedName) state.contactName = detectedName;
    if (detectedInstagram) state.contactInstagram = detectedInstagram;
    state.chatContext = collectVisibleMessages();

    if (!options.silent) {
      setStatus(state.chatContext ? "Contexto visible actualizado" : "No detecté mensajes; podés pegarlos manualmente", state.chatContext ? "success" : "info");
    }
    if (!options.skipRender) render();
  }

  function collectVisibleMessages() {
    const selectedText = window.getSelection()?.toString() || "";
    const selected = splitUsefulLines(selectedText);
    const bubbleMessages = collectBubbleMessages();

    if (bubbleMessages.length > 0) {
      return uniqueStrings([...selected, ...bubbleMessages]).slice(-MAX_CONTEXT_LINES).join("\n");
    }

    return uniqueStrings(selected).slice(-MAX_CONTEXT_LINES).join("\n");
  }

  function getCleanChatContext() {
    const cleaned = sanitizeChatContext(state.chatContext);
    if (cleaned && cleaned !== state.chatContext) state.chatContext = cleaned;
    return cleaned;
  }

  function sanitizeChatContext(value) {
    return uniqueStrings(splitUsefulLines(value)).slice(-MAX_CONTEXT_LINES).join("\n");
  }

  function collectBubbleMessages() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || host.contains(parent)) return NodeFilter.FILTER_REJECT;
        if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;
        const text = cleanText(node.textContent || "");
        if (!isUsefulMessage(text) || isManychatSystemMessage(text)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const bubbles = new Map();

    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      const bubble = parent ? findMessageBubble(parent) : null;
      if (!bubble) continue;
      const text = normalizeMessageText(bubble.textContent || "");
      if (!isUsefulMessage(text) || isManychatSystemMessage(text)) continue;
      bubbles.set(getElementKey(bubble), text);
    }

    return uniqueStrings([...bubbles.values()]);
  }

  function findMessageBubble(element) {
    const chatLeft = getConversationLeft();
    const panelLeft = getPanelLeft();
    let current = element;

    for (let depth = 0; current && current !== document.body && depth < 8; depth += 1) {
      if (host.contains(current) || !isVisible(current)) return null;

      const rect = current.getBoundingClientRect();
      const style = window.getComputedStyle(current);
      const background = style.backgroundColor;
      const radius = maxBorderRadius(style);
      const text = normalizeMessageText(current.textContent || "");

      const looksLikeBubble =
        isColoredBackground(background) ||
        (radius >= 12 && rect.width >= 32 && rect.height >= 24 && rect.width <= Math.min(780, window.innerWidth * 0.72));

      const isInChatSpace =
        rect.top > 88 &&
        rect.bottom < window.innerHeight - 28 &&
        rect.left >= chatLeft - 36 &&
        rect.right <= panelLeft - 12;

      if (looksLikeBubble && isInChatSpace && isUsefulMessage(text) && !isManychatSystemMessage(text)) return current;

      current = current.parentElement;
    }

    return null;
  }

  function getConversationLeft() {
    const responder = findElementByText(/Responder aqu[ií]/i);
    if (!responder) return 0;

    let current = responder;
    let bestLeft = responder.getBoundingClientRect().left;

    for (let depth = 0; current && current !== document.body && depth < 6; depth += 1) {
      const rect = current.getBoundingClientRect();
      if (rect.width > 320 && rect.left <= bestLeft + 12) bestLeft = rect.left;
      current = current.parentElement;
    }

    return Math.max(0, bestLeft);
  }

  function detectContactName() {
    const profileName = detectProfilePanelContactName();
    if (profileName) return profileName;

    const headerName = detectHeaderContactName();
    if (headerName) return headerName;

    const title = cleanText(document.title || "");
    return isPossibleContactName(title) ? title.slice(0, 80) : "";
  }

  function detectProfilePanelContactName() {
    const panel = findProfilePanel();
    if (!panel) return "";

    const panelRect = panel.getBoundingClientRect();
    const boundary = findFirstTextTop(panel, /Suscrito|Tiempo de contacto|Aceptaci[oó]n de ingreso|Instagram/i) ?? panelRect.top + 260;
    const candidates = collectTextCandidates(panel).filter((item) => {
      if (!isPossibleContactName(item.text)) return false;
      if (item.rect.top < panelRect.top + 8 || item.rect.top > boundary - 6) return false;
      if (item.rect.left < panelRect.left + 12 || item.rect.right > panelRect.right - 12) return false;
      return true;
    });

    candidates.sort((a, b) => b.fontSize - a.fontSize || a.rect.top - b.rect.top);
    return candidates[0]?.text || "";
  }

  function detectHeaderContactName() {
    const panelLeft = getPanelLeft();
    const candidates = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || host.contains(parent) || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const text = cleanText(walker.currentNode.textContent || "");
      if (!isPossibleContactName(text)) continue;

      const rect = getTextRect(walker.currentNode) || walker.currentNode.parentElement.getBoundingClientRect();
      if (rect.top < 62 || rect.top > 150 || rect.left < 70 || rect.right > panelLeft - 16) continue;
      candidates.push({ text, left: rect.left, top: rect.top });
    }

    candidates.sort((a, b) => a.top - b.top || a.left - b.left);
    return candidates[0]?.text || "";
  }

  function detectInstagramUsername() {
    const panel = findProfilePanel() || document.body;
    const candidates = collectTextCandidates(panel).filter((item) => isInstagramUsername(item.text));
    candidates.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    return normalizeInstagramUsername(candidates[0]?.text || "");
  }

  function findProfilePanel() {
    const marker = findElementByText(/Suscrito|Tiempo de contacto|Aceptaci[oó]n de ingreso|Todo El Historial De Canales/i);
    if (!marker) return null;

    let current = marker;
    for (let depth = 0; current && current !== document.body && depth < 10; depth += 1) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= 240 && rect.width <= 520 && rect.height >= 260 && rect.left >= 60) return current;
      current = current.parentElement;
    }

    return marker.closest("aside") || null;
  }

  function collectTextCandidates(root) {
    const candidates = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || host.contains(parent) || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
        const text = cleanText(node.textContent || "");
        return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      const rect = getTextRect(walker.currentNode) || parent.getBoundingClientRect();
      const style = window.getComputedStyle(parent);
      candidates.push({ text: cleanText(walker.currentNode.textContent || ""), rect, fontSize: parseFloat(style.fontSize) || 0 });
    }

    return candidates;
  }

  function findFirstTextTop(root, pattern) {
    const candidates = collectTextCandidates(root).filter((item) => pattern.test(item.text));
    candidates.sort((a, b) => a.rect.top - b.rect.top);
    return candidates[0]?.rect.top ?? null;
  }

  function findElementByText(pattern) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = cleanText(node.textContent || "");
        return pattern.test(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    while (walker.nextNode()) {
      const element = walker.currentNode.parentElement;
      if (element && !host.contains(element) && isVisible(element)) return element;
    }

    return null;
  }

  function normalizeMessageText(value) {
    return cleanText(value)
      .replace(/PROPro indicator:\s*A premium offering that requires a paid subscription\.?/gi, " ")
      .replace(/\bT[uú]\d+\b/gi, " ")
      .replace(/^[✓✔]+\s*/, "")
      .replace(/\s*[✓✔]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitUsefulLines(value) {
    return prepareManychatLines(value)
      .map(normalizeMessageText)
      .filter((line) => isUsefulMessage(line) && !isManychatSystemMessage(line));
  }

  function prepareManychatLines(value) {
    return String(value || "")
      .replace(/\r/g, "\n")
      .replace(/\b(?:Hoy|Ayer),?\s*\d{1,2}:\d{2}\b/gi, "\n$&\n")
      .replace(/\b\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,12}\s+\d{4},\s*\d{1,2}:\d{2}\b/g, "\n$&\n")
      .split(/\n+/);
  }

  function uniqueStrings(values) {
    const unique = [];
    const seen = new Set();

    for (const value of values) {
      const text = normalizeMessageText(value);
      const key = normalizeSearch(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(text);
    }

    return unique;
  }

  function getElementKey(element) {
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)].join(":");
  }

  function getTextRect(textNode) {
    try {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rect = range.getBoundingClientRect();
      range.detach();
      return rect.width || rect.height ? rect : null;
    } catch {
      return null;
    }
  }

  function getPanelLeft() {
    const panel = shadow.querySelector(".crm-panel");
    const rect = panel?.getBoundingClientRect();
    return rect?.left && rect.left > 0 ? rect.left : window.innerWidth;
  }

  function maxBorderRadius(style) {
    return Math.max(
      parseFloat(style.borderTopLeftRadius) || 0,
      parseFloat(style.borderTopRightRadius) || 0,
      parseFloat(style.borderBottomRightRadius) || 0,
      parseFloat(style.borderBottomLeftRadius) || 0
    );
  }

  function isColoredBackground(value) {
    const color = String(value || "").toLowerCase();
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return false;
    return ![
      "rgb(255, 255, 255)",
      "rgba(255, 255, 255, 1)",
      "rgb(251, 251, 252)",
      "rgb(250, 251, 252)",
    ].includes(color);
  }

  function getHeaderSubtitle() {
    const parts = [];
    if (state.contactName) parts.push(state.contactName);
    if (state.contactInstagram) parts.push(`@${state.contactInstagram}`);
    return parts.join(" · ") || "Manychat";
  }

  function getActiveStep() {
    return state.steps.find((step) => step.id === state.activeStepId) || state.steps[0] || null;
  }

  function getVisibleSteps() {
    const query = normalizeSearch(state.query);
    if (!query) return state.steps;

    return state.steps.filter((step) => {
      const haystack = normalizeSearch([
        step.number,
        step.title,
        step.category,
        step.description,
        ...(step.blocks || []).flatMap((block) => [block.title, block.kind, state.drafts[block.id] || ""]),
      ].join(" "));
      return haystack.includes(query);
    });
  }

  function buildStepCopy(step) {
    if (!step) return "";
    const sections = step.blocks
      .map((block) => buildBlockCopy(block, state.drafts[block.id] || ""))
      .filter(Boolean);
    return sections.length ? `${step.number}. ${step.title}\n\n${sections.join("\n\n")}` : "";
  }

  function buildBlockCopy(block, content) {
    const trimmed = (content || "").trim();
    return trimmed ? `${block.title}\n${trimmed}` : "";
  }

  function extractLines(value) {
    return (value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function setCollapsed(collapsed) {
    state.collapsed = collapsed;
    chrome.storage.local.set({ crmPanelCollapsed: collapsed });
    render();
  }

  function setStatus(message, tone) {
    state.error = tone === "error" ? message : "";
    state.status = message;
    state.statusTone = tone || "info";
  }

  function saveDraftOverrides() {
    chrome.storage.local.set({ [DRAFT_OVERRIDES_KEY]: state.drafts });
  }

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function buildApiHeaders() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(state.extensionToken ? { "X-Extension-Token": state.extensionToken } : {}),
    };
  }

  function getCrmBaseUrl() {
    return state.crmBaseMode === "auto" ? getAutoCrmBaseUrl() : normalizeBaseUrl(state.crmBaseUrl);
  }

  function getAutoCrmBaseUrl() {
    const manifest = chrome.runtime.getManifest?.() || {};
    return manifest.update_url ? DEFAULT_PRODUCTION_CRM_BASE_URL : DEFAULT_DEV_CRM_BASE_URL;
  }

  function normalizeBaseUrl(value) {
    return String(value || DEFAULT_DEV_CRM_BASE_URL).replace(/\/+$/, "");
  }

  function normalizeSearch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function normalizeInstagramUsername(value) {
    return String(value || "").trim().replace(/^@/, "").toLowerCase();
  }

  function isVisible(element) {
    if (!element || element === host) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || 1) > 0;
  }

  function isUsefulMessage(text) {
    if (!text || text.length < 2 || text.length > 700) return false;
    if (isChromeNoise(text)) return false;
    return /[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(text);
  }

  function isPossibleContactName(text) {
    if (!text || text.length < 3 || text.length > 60) return false;
    if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(text)) return false;
    if (/^Yo$/i.test(text)) return false;
    if (/^Instagram$/i.test(text)) return false;
    if (/Inbox/i.test(text)) return false;
    if (/^\(?\d+\)?$/.test(text)) return false;
    if (isInstagramUsername(text)) return false;
    if (isChromeNoise(text)) return false;
    return true;
  }

  function isInstagramUsername(text) {
    const value = normalizeInstagramUsername(text);
    if (!/^[a-z0-9._]{3,30}$/.test(value)) return false;
    if (!/[a-z]/.test(value)) return false;
    if (["instagram", "responder", "suscrito", "desconocido", "manychat"].includes(value)) return false;
    return value.includes("_") || /\d/.test(value) || text.trim().startsWith("@");
  }

  function isChromeNoise(text) {
    return isManychatSystemMessage(text) || [
      /Abrir Chats/i,
      /Aceptar nuevas conversaciones/i,
      /Automatizaciones/i,
      /Bandeja de entrada/i,
      /Contexto para adaptar/i,
      /Etiquetas de contacto/i,
      /ha pausado temporalmente las respuestas automáticas/i,
      /ha pasado temporalmente las respuestas automáticas/i,
      /\bInbox\b/i,
      /No asignado/i,
      /Asignado a m[ií]/i,
      /Todos los chats/i,
      /La conversación fue/i,
      /Ordenar/i,
      /Responder/i,
      /^Hoy,?\s*\d{1,2}:\d{2}$/i,
      /Todos Los Canales/i,
      /Enviar A Instagram/i,
      /Suscrito a secuencias/i,
      /Todo El Historial De Canales/i,
      /Tiempo de contacto/i,
      /Aceptaci[oó]n de ingreso/i,
      /PROPro indicator/i,
    ].some((pattern) => pattern.test(text));
  }

  function isManychatSystemMessage(text) {
    const value = cleanText(text);
    return [
      /(^|\s)La conversaci[oó]n fue movida\b/i,
      /(^|\s)La conversaci[oó]n fue asignada\b/i,
      /(^|\s)La conversaci[oó]n fue cerrada\b/i,
      /(^|\s)La conversaci[oó]n fue abierta\b/i,
      /\bha (pausado|pasado) temporalmente las respuestas autom[aá]ticas\b/i,
      /\bpuedes editar la pausa o reanudar la automatizaci[oó]n\b/i,
      /^Maximo Gallo ha pausado temporalmente\b/i,
      /^M[aá]ximo Gallo ha pausado temporalmente\b/i,
      /^Yo$/i,
      /^Instagram$/i,
      /^T[uú]\d*$/i,
      /^PROPro indicator:/i,
      /^La automatizaci[oó]n\b.*\bse activ[oó]$/i,
      /^coment[oó] en tu publicaci[oó]n o reel$/i,
      /^Contenido no disponible$/i,
      /^Hoy,?\s*\d{1,2}:\d{2}$/i,
      /^Ayer,?\s*\d{1,2}:\d{2}$/i,
      /^\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,12}\s+\d{4},\s*\d{1,2}:\d{2}$/i,
    ].some((pattern) => pattern.test(value));
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
