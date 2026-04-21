const STORAGE_KEY = 'notekeeper-data-v6';
const LEGACY_STORAGE_KEYS = ['notekeeper-data-v5'];
const MAX_RECENT_COLORS = 5;
const PROJECT_FILE_VERSION = 5;
const SEARCH_RESULTS_PAGE = 'search-results.html';
const DEFAULT_IMAGE_SIZE = 350;
const THEME_NAMES = [
  'dark', 'light', 'forest', 'ocean', 'sunset',
  'lavender', 'midnight', 'rose', 'mint', 'coffee',
  'arcane', 'neon', 'parchment', 'crimson', 'frost',
  'cozyhearth', 'meadowcozy', 'nordicminimal', 'carbonminimal', 'synthwave', 'crystalui'
];
const PROJECT_JSON_NAME = 'project.json';
const ASSETS_FOLDER = 'assets/';
const ASSET_URL_PREFIX = 'notekeeper-asset://';

const editor = document.getElementById('editor');
const pagesList = document.getElementById('pages-list');
const addPageBtn = document.getElementById('add-page-btn');
const addSectionBtn = document.getElementById('add-section-btn');
const searchInput = document.getElementById('search-input');
const deepSearchInput = document.getElementById('deep-search-input');
const deepSearchBtn = document.getElementById('deep-search-btn');
const textColor = document.getElementById('text-color');
const fontFamily = document.getElementById('font-family');
const fontSize = document.getElementById('font-size');
const pageTitle = document.getElementById('page-title');
const pageItemTemplate = document.getElementById('page-item-template');
const newProjectBtn = document.getElementById('new-project-btn');
const saveProjectBtn = document.getElementById('save-project-btn');
const saveAsProjectBtn = document.getElementById('save-as-project-btn');
const loadProjectBtn = document.getElementById('load-project-btn');
const loadProjectInput = document.getElementById('load-project-input');
const recentColorsContainer = document.getElementById('recent-colors');
const themeMenuBtn = document.getElementById('theme-menu-btn');
const themeMenuPopover = document.getElementById('theme-menu-popover');
const insertLinkBtn = document.getElementById('insert-link-btn');
const insertAnchorBtn = document.getElementById('insert-anchor-btn');
const uploadImageBtn = document.getElementById('upload-image-btn');
const uploadImageInput = document.getElementById('upload-image-input');
const autolinkToggle = document.getElementById('autolink-toggle');
const applyAutolinkBtn = document.getElementById('apply-autolink-btn');
const exportPageBtn = document.getElementById('export-page-btn');
const exportProjectPdfBtn = document.getElementById('export-project-pdf-btn');
const anchorsList = document.getElementById('anchors-list');
const imageWidthInput = document.getElementById('image-width');
const imageHeightInput = document.getElementById('image-height');
const applyImageSizeBtn = document.getElementById('apply-image-size-btn');
const tagSuggestions = document.getElementById('tag-suggestions');
const listMenuBtn = document.getElementById('list-menu-btn');
const listMenuPopover = document.getElementById('list-menu-popover');

let state = loadState();
let currentProjectHandle = null;
let autoLinkDebounce = null;
let isApplyingAutoLink = false;
let selectedImage = null;
let draggingItem = null;
let hasShownStorageQuotaWarning = false;

bootstrap();

function bootstrap() {
  if (!state.pages.length) {
    state.pages.push(createPage('Nova página'));
    state.activePageId = state.pages[0].id;
  }

  applyTheme(state.theme);
  autolinkToggle.checked = state.autolinkEnabled;
  renderPages();
  renderRecentColors();
  renderAnchorsList();
  loadActivePageToEditor();
  bindEvents();
  openPageFromQueryString();
  saveState();
}

function bindEvents() {
  addPageBtn.addEventListener('click', () => {
    const page = createPage(`Página ${state.pages.length + 1}`);
    state.pages.push(page);
    state.activePageId = page.id;
    saveState();
    renderPages();
    renderAnchorsList();
    loadActivePageToEditor();
  });

  addSectionBtn.addEventListener('click', () => {
    const sectionName = prompt('Nome da nova seção:');
    if (!sectionName || !sectionName.trim()) return;
    state.sections.push(createSection(sectionName.trim()));
    saveState();
    renderPages();
  });

  themeMenuBtn.addEventListener('click', (event) => {
    event.preventDefault();
    themeMenuPopover.hidden = !themeMenuPopover.hidden;
    themeMenuBtn.setAttribute('aria-expanded', String(!themeMenuPopover.hidden));
  });

  themeMenuPopover.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      const theme = button.getAttribute('data-theme');
      if (!theme || !THEME_NAMES.includes(theme)) return;
      state.theme = theme;
      applyTheme(theme);
      saveState();
      themeMenuPopover.hidden = true;
      themeMenuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  autolinkToggle.addEventListener('change', () => {
    state.autolinkEnabled = autolinkToggle.checked;
    saveState();
  });

  applyAutolinkBtn.addEventListener('click', applyAutoLinksOnActivePage);
  exportPageBtn.addEventListener('click', exportCurrentPage);
  exportProjectPdfBtn.addEventListener('click', exportProjectAsPdf);
  applyImageSizeBtn.addEventListener('click', applySelectedImageSize);

  newProjectBtn.addEventListener('click', createNewProject);
  saveProjectBtn.addEventListener('click', saveProject);
  saveAsProjectBtn.addEventListener('click', saveProjectAs);
  loadProjectBtn.addEventListener('click', openProject);
  loadProjectInput.addEventListener('change', openProjectFromInput);

  pagesList.addEventListener('click', handlePagesClick);
  pagesList.addEventListener('dragstart', handlePagesDragStart);
  pagesList.addEventListener('dragend', handlePagesDragEnd);
  pagesList.addEventListener('dragover', handlePagesDragOver);
  pagesList.addEventListener('drop', handlePagesDrop);
  anchorsList.addEventListener('click', handleAnchorsClick);
  tagSuggestions.addEventListener('click', handleSuggestionClick);

  editor.addEventListener('click', handleEditorClick);
  editor.addEventListener('contextmenu', handleEditorContextMenu);
  editor.addEventListener('input', handleEditorInput);
  editor.addEventListener('keyup', handleTagSuggest);
  editor.addEventListener('paste', handlePasteImage);

  pageTitle.addEventListener('input', () => {
    updateActivePage((page) => {
      page.title = pageTitle.value.trim() || 'Sem título';
    });
    renderPages();
    renderAnchorsList();
  });

  document.querySelectorAll('[data-cmd]').forEach((button) => {
    button.addEventListener('click', () => {
      const cmd = button.getAttribute('data-cmd');
      if (!cmd) return;
      document.execCommand(cmd);
      editor.focus();
      editor.dispatchEvent(new Event('input'));
    });
  });

  insertAnchorBtn.addEventListener('click', createAnchorFromSelection);
  insertLinkBtn.addEventListener('click', insertInternalLink);
  uploadImageBtn.addEventListener('click', () => {
    uploadImageInput.value = '';
    uploadImageInput.click();
  });
  uploadImageInput.addEventListener('change', handleUploadImage);

  textColor.addEventListener('input', () => applyTextColor(textColor.value));
  recentColorsContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const color = target.dataset.color;
    if (!color) return;
    textColor.value = color;
    applyTextColor(color);
  });

  fontFamily.addEventListener('change', () => {
    document.execCommand('fontName', false, fontFamily.value);
    editor.focus();
    editor.dispatchEvent(new Event('input'));
  });

  fontSize.addEventListener('change', () => {
    document.execCommand('fontSize', false, fontSize.value);
    editor.focus();
    editor.dispatchEvent(new Event('input'));
  });

  listMenuBtn.addEventListener('click', (event) => {
    event.preventDefault();
    listMenuPopover.hidden = !listMenuPopover.hidden;
  });

  listMenuPopover.querySelectorAll('[data-list-cmd]').forEach((button) => {
    button.addEventListener('click', () => {
      const cmd = button.getAttribute('data-list-cmd');
      if (!cmd) return;
      document.execCommand(cmd);
      listMenuPopover.hidden = true;
      editor.focus();
      editor.dispatchEvent(new Event('input'));
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (!target.closest('#list-menu-btn') && !target.closest('#list-menu-popover')) {
      listMenuPopover.hidden = true;
    }

    if (!target.closest('#theme-menu-btn') && !target.closest('#theme-menu-popover')) {
      themeMenuPopover.hidden = true;
      themeMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('[data-align]').forEach((button) => {
    button.addEventListener('click', () => {
      const align = button.getAttribute('data-align');
      applyAlignment(align);
    });
  });

  searchInput.addEventListener('input', () => updateSearchResults(searchInput.value.trim().toLowerCase()));

  deepSearchBtn.addEventListener('click', openDeepSearchResults);
  deepSearchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    openDeepSearchResults();
  });
}

function createNewProject() {
  const shouldReset = confirm('Deseja iniciar um novo projeto? Alterações não salvas serão perdidas.');
  if (!shouldReset) return;

  state = createInitialState();
  currentProjectHandle = null;
  hasShownStorageQuotaWarning = false;
  applyTheme(state.theme);
  autolinkToggle.checked = state.autolinkEnabled;
  renderPages();
  renderRecentColors();
  renderAnchorsList();
  loadActivePageToEditor();
  saveState();
}

function openDeepSearchResults() {
  const term = deepSearchInput.value.trim();
  if (!term) {
    alert('Digite uma palavra-chave para pesquisar.');
    return;
  }

  syncEditorIntoActivePage();
  const params = new URLSearchParams({ q: term });
  window.open(`${SEARCH_RESULTS_PAGE}?${params.toString()}`, '_blank', 'noopener');
}

function openPageFromQueryString() {
  const params = new URLSearchParams(window.location.search);
  const pageId = params.get('page');
  const rawTerm = params.get('term');
  const hitIndex = Number.parseInt(params.get('hit') || '0', 10);
  if (!pageId || !rawTerm) return;

  const matchedPage = state.pages.find((page) => page.id === pageId);
  if (!matchedPage) return;

  state.activePageId = matchedPage.id;
  saveState();
  renderPages();
  loadActivePageToEditor();

  const term = rawTerm.trim().toLowerCase();
  if (!term) return;

  highlightSearchTermInEditor(term);
  const hits = Array.from(editor.querySelectorAll('mark.search-hit'));
  const safeIndex = Number.isInteger(hitIndex) ? Math.max(0, Math.min(hitIndex, hits.length - 1)) : 0;
  const targetHit = hits[safeIndex];
  if (targetHit) {
    targetHit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetHit.classList.add('search-hit-focus');
  }
}

function handleEditorClick(event) {
  const target = event.target;
  listMenuPopover.hidden = true;

  if (target instanceof HTMLImageElement) {
    event.preventDefault();
    selectedImage = target;
    updateImageInputsFromSelection();
    return;
  }

  if (target instanceof HTMLAnchorElement) {
    const href = target.getAttribute('href') || '';
    if (!href.startsWith('notekeeper://')) return;
    event.preventDefault();
    openInternalLink(href);
    return;
  }

  selectedImage = null;
}


function handleEditorContextMenu(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  event.preventDefault();
  window.open(target.src, '_blank', 'noopener,noreferrer');
}

async function handleUploadImage() {
  const file = uploadImageInput.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataURL(file);
  document.execCommand(
    'insertHTML',
    false,
    `<img src="${dataUrl}" style="width:${DEFAULT_IMAGE_SIZE}px;height:${DEFAULT_IMAGE_SIZE}px;object-fit:contain;" />`
  );
  editor.dispatchEvent(new Event('input'));
}

function updateImageInputsFromSelection() {
  if (!selectedImage) return;
  imageWidthInput.value = parseInt(selectedImage.style.width, 10) || DEFAULT_IMAGE_SIZE;
  imageHeightInput.value = parseInt(selectedImage.style.height, 10) || DEFAULT_IMAGE_SIZE;
}

function applySelectedImageSize() {
  if (!selectedImage) {
    alert('Selecione uma imagem (clique nela) antes de editar o tamanho.');
    return;
  }

  const width = Number(imageWidthInput.value) || DEFAULT_IMAGE_SIZE;
  const height = Number(imageHeightInput.value) || DEFAULT_IMAGE_SIZE;
  selectedImage.style.width = `${Math.max(50, width)}px`;
  selectedImage.style.height = `${Math.max(50, height)}px`;
  selectedImage.style.objectFit = 'contain';
  editor.dispatchEvent(new Event('input'));
}


function applyAlignment(align) {
  if (selectedImage) {
    selectedImage.style.display = 'block';
    if (align === 'left') {
      selectedImage.style.marginLeft = '0';
      selectedImage.style.marginRight = 'auto';
    } else if (align === 'center') {
      selectedImage.style.marginLeft = 'auto';
      selectedImage.style.marginRight = 'auto';
    } else if (align === 'right') {
      selectedImage.style.marginLeft = 'auto';
      selectedImage.style.marginRight = '0';
    }
    editor.dispatchEvent(new Event('input'));
    return;
  }

  if (align === 'left') document.execCommand('justifyLeft');
  if (align === 'center') document.execCommand('justifyCenter');
  if (align === 'right') document.execCommand('justifyRight');
  editor.dispatchEvent(new Event('input'));
}

function handleTagSuggest() {
  const prefix = getCurrentTagPrefix();
  if (!prefix || prefix.length < 2) {
    hideSuggestions();
    return;
  }

  const matches = getAllAnchors()
    .filter((anchor) => anchor.tag.toLowerCase().startsWith(prefix.toLowerCase()))
    .slice(0, 6);

  if (!matches.length) {
    hideSuggestions();
    return;
  }

  tagSuggestions.innerHTML = '';
  matches.forEach((anchor) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion-item';
    btn.dataset.pageId = anchor.pageId;
    btn.dataset.anchorId = anchor.anchorId;
    btn.dataset.tag = anchor.tag;
    btn.dataset.prefix = prefix;
    btn.textContent = `#${anchor.tag} → ${anchor.pageTitle}`;
    tagSuggestions.appendChild(btn);
  });

  tagSuggestions.hidden = false;
  positionSuggestionsNearCaret();
}


function positionSuggestionsNearCaret() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();

  const menuHeight = tagSuggestions.offsetHeight || 120;
  const menuWidth = tagSuggestions.offsetWidth || 260;

  let top = rect.top - menuHeight - 8;
  if (top < 8) {
    top = rect.bottom + 8;
  }

  let left = rect.left;
  const maxLeft = window.innerWidth - menuWidth - 8;
  if (left > maxLeft) left = maxLeft;
  if (left < 8) left = 8;

  tagSuggestions.style.top = `${top}px`;
  tagSuggestions.style.left = `${left}px`;
}

function hideSuggestions() {
  tagSuggestions.hidden = true;
  tagSuggestions.innerHTML = '';
}

function handleSuggestionClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const prefix = target.dataset.prefix || '';
  const tag = target.dataset.tag;
  const pageId = target.dataset.pageId;
  const anchorId = target.dataset.anchorId;
  if (!tag || !pageId || !anchorId) return;

  replaceWordBeforeCaretWithLink(prefix, tag, pageId, anchorId);
  hideSuggestions();
}

function replaceWordBeforeCaretWithLink(prefix, tag, pageId, anchorId) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;

  const text = node.textContent || '';
  const cursor = range.startOffset;
  const start = cursor - prefix.length;
  if (start < 0) return;

  const before = text.slice(0, start);
  const after = text.slice(cursor);

  const fragment = document.createDocumentFragment();
  if (before) fragment.appendChild(document.createTextNode(before));

  const link = document.createElement('a');
  link.href = `notekeeper://page/${pageId}#${anchorId}`;
  link.textContent = tag;
  fragment.appendChild(link);

  if (after) fragment.appendChild(document.createTextNode(after));

  const parent = node.parentNode;
  parent.replaceChild(fragment, node);
  editor.dispatchEvent(new Event('input'));
}

function getCurrentTagPrefix() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return '';

  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return '';

  const textBefore = (node.textContent || '').slice(0, range.startOffset);
  const normalized = textBefore.replace(/\n/g, ' ');
  const chunks = normalized.split(/[.,;!?()\[\]{}:]/);
  const candidate = chunks[chunks.length - 1].trimStart();
  return candidate.slice(-60).trimStart();
}

function handleEditorInput() {
  if (isApplyingAutoLink) return;

  normalizeImageSizing();

  updateActivePage((page) => {
    page.content = editor.innerHTML;
    page.plainText = editor.innerText;
  });

  if (state.autolinkEnabled) {
    clearTimeout(autoLinkDebounce);
    autoLinkDebounce = setTimeout(applyAutoLinksOnActivePage, 450);
  }
}

function normalizeImageSizing() {
  editor.querySelectorAll('img').forEach((img) => {
    if (!img.style.width) img.style.width = `${DEFAULT_IMAGE_SIZE}px`;
    if (!img.style.height) img.style.height = `${DEFAULT_IMAGE_SIZE}px`;
    img.style.objectFit = 'contain';
  });
}

async function handlePasteImage(event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;

  const imageItem = Array.from(clipboard.items || []).find((item) => item.type.startsWith('image/'));
  if (!imageItem) return;

  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;

  const dataUrl = await fileToDataURL(file);
  document.execCommand(
    'insertHTML',
    false,
    `<img src="${dataUrl}" style="width:${DEFAULT_IMAGE_SIZE}px;height:${DEFAULT_IMAGE_SIZE}px;object-fit:contain;" />`
  );
  editor.dispatchEvent(new Event('input'));
}

async function saveProject() {
  syncEditorIntoActivePage();
  if (currentProjectHandle && window.showSaveFilePicker) {
    await writeProjectToHandle(currentProjectHandle);
    return;
  }

  if (window.showSaveFilePicker) {
    try {
      currentProjectHandle = await window.showSaveFilePicker({
        suggestedName: 'notekeeper-project.zip',
        types: [{ description: 'Projeto NoteKeeper', accept: { 'application/zip': ['.zip'] } }]
      });
      await writeProjectToHandle(currentProjectHandle);
      return;
    } catch (error) {
      if (error?.name !== 'AbortError') alert('Não foi possível salvar no arquivo selecionado.');
    }
  }

  await downloadProjectFallback();
}

async function saveProjectAs() {
  syncEditorIntoActivePage();
  currentProjectHandle = null;
  if (window.showSaveFilePicker) {
    try {
      currentProjectHandle = await window.showSaveFilePicker({
        suggestedName: 'notekeeper-project.zip',
        types: [{ description: 'Projeto NoteKeeper', accept: { 'application/zip': ['.zip'] } }]
      });
      await writeProjectToHandle(currentProjectHandle);
      return;
    } catch (error) {
      if (error?.name !== 'AbortError') alert('Não foi possível salvar no arquivo selecionado.');
    }
  }
  await downloadProjectFallback();
}

async function openProject() {
  if (window.showOpenFilePicker) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Projeto NoteKeeper', accept: { 'application/zip': ['.zip'], 'application/json': ['.json'] } }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      const extension = (file.name.split('.').pop() || '').toLowerCase();
      currentProjectHandle = extension === 'zip' ? fileHandle : null;
      await importProjectFromFile(file);
      return;
    } catch (error) {
      if (error?.name !== 'AbortError') alert('Não foi possível abrir o projeto selecionado.');
      return;
    }
  }

  loadProjectInput.value = '';
  loadProjectInput.click();
}

async function openProjectFromInput() {
  const file = loadProjectInput.files?.[0];
  if (!file) return;
  currentProjectHandle = null;
  await importProjectFromFile(file);
}

function handlePagesClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains('section-delete')) {
    const sectionItem = target.closest('.section-item');
    const sectionId = sectionItem?.dataset.sectionId;
    if (!sectionId) return;
    const section = state.sections.find((item) => item.id === sectionId);
    if (!section) return;

    if (!confirm(`Tem certeza que deseja remover a seção "${section.title}"? As páginas voltarão para "Páginas soltas".`)) return;

    state.sections = state.sections.filter((item) => item.id !== sectionId);
    state.pages.forEach((page) => {
      if (page.sectionId === sectionId) page.sectionId = null;
    });
    saveState();
    renderPages();
    return;
  }

  const sectionHeader = target.closest('.section-header');
  if (sectionHeader && !target.closest('.section-delete')) {
    const sectionItem = sectionHeader.closest('.section-item');
    const sectionId = sectionItem?.dataset.sectionId;
    if (!sectionId) return;
    const section = state.sections.find((item) => item.id === sectionId);
    if (!section) return;
    section.collapsed = !section.collapsed;
    saveState();
    renderPages();
    return;
  }

  const item = target.closest('.page-item');
  if (!item) return;
  const pageId = item.dataset.pageId;
  if (!pageId) return;

  if (target.classList.contains('page-delete')) {
    if (state.pages.length === 1) return;
    const page = state.pages.find((p) => p.id === pageId);
    if (!confirm(`Tem certeza que deseja remover a página "${page?.title || 'Sem título'}"?`)) return;

    state.pages = state.pages.filter((p) => p.id !== pageId);
    if (state.activePageId === pageId) state.activePageId = state.pages[0].id;
    saveState();
    renderPages();
    renderAnchorsList();
    loadActivePageToEditor();
    return;
  }

  if (target.classList.contains('page-open')) {
    state.activePageId = pageId;
    saveState();
    renderPages();
    loadActivePageToEditor();
  }
}

function handlePagesDragStart(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const pageItem = target.closest('.page-item');
  if (pageItem instanceof HTMLElement) {
    const pageId = pageItem.dataset.pageId;
    if (!pageId) return;
    draggingItem = { type: 'page', id: pageId };
    pageItem.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `page:${pageId}`);
    }
    return;
  }

  const sectionItem = target.closest('.section-item');
  if (sectionItem instanceof HTMLElement) {
    const sectionId = sectionItem.dataset.sectionId;
    if (!sectionId) return;
    draggingItem = { type: 'section', id: sectionId };
    sectionItem.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `section:${sectionId}`);
    }
  }
}

function clearDragVisualState() {
  pagesList.querySelectorAll('.dragging').forEach((node) => node.classList.remove('dragging'));
  pagesList.querySelectorAll('.drop-target').forEach((node) => node.classList.remove('drop-target'));
}

function parseDragPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const [type, id] = payload.split(':');
  if (!id || (type !== 'page' && type !== 'section')) return null;
  return { type, id };
}

function resolveDraggingItem(event) {
  if (draggingItem) return draggingItem;
  const payload = event.dataTransfer?.getData('text/plain') || '';
  return parseDragPayload(payload);
}

function getPageDropTarget(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('.page-item, .section-pages, .pages-root-dropzone, .section-header');
}

function getSectionDropTarget(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('.section-item, .section-header');
}

function reorderPages(dragPageId, targetPageId, targetSectionId) {
  if (dragPageId === targetPageId) return;
  const dragIndex = state.pages.findIndex((page) => page.id === dragPageId);
  const targetIndex = state.pages.findIndex((page) => page.id === targetPageId);
  if (dragIndex === -1 || targetIndex === -1) return;

  state.pages[dragIndex].sectionId = targetSectionId;
  const [draggedPage] = state.pages.splice(dragIndex, 1);
  const adjustedTargetIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
  state.pages.splice(adjustedTargetIndex, 0, draggedPage);
}

function movePageToContainerEnd(pageId, targetSectionId) {
  const dragIndex = state.pages.findIndex((page) => page.id === pageId);
  if (dragIndex === -1) return;
  state.pages[dragIndex].sectionId = targetSectionId;
  const [draggedPage] = state.pages.splice(dragIndex, 1);

  let insertIndex = state.pages.length;
  for (let index = state.pages.length - 1; index >= 0; index -= 1) {
    if ((state.pages[index].sectionId || null) === targetSectionId) {
      insertIndex = index + 1;
      break;
    }
  }

  state.pages.splice(insertIndex, 0, draggedPage);
}

function reorderSections(dragSectionId, targetSectionId) {
  if (dragSectionId === targetSectionId) return;
  const dragIndex = state.sections.findIndex((section) => section.id === dragSectionId);
  const targetIndex = state.sections.findIndex((section) => section.id === targetSectionId);
  if (dragIndex === -1 || targetIndex === -1) return;

  const [draggedSection] = state.sections.splice(dragIndex, 1);
  const adjustedTargetIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
  state.sections.splice(adjustedTargetIndex, 0, draggedSection);
}

function applyPageDrop(dragged, dropTarget) {
  const pageTarget = dropTarget.closest('.page-item');
  if (pageTarget) {
    const targetPageId = pageTarget.dataset.pageId;
    if (!targetPageId) return;
    const targetPage = state.pages.find((page) => page.id === targetPageId);
    if (!targetPage) return;
    reorderPages(dragged.id, targetPageId, targetPage.sectionId || null);
    return;
  }

  const sectionHeader = dropTarget.closest('.section-header');
  if (sectionHeader) {
    const sectionId = sectionHeader.closest('.section-item')?.dataset.sectionId || null;
    movePageToContainerEnd(dragged.id, sectionId);
    return;
  }

  const container = dropTarget.closest('.section-pages, .pages-root-dropzone');
  if (!container) return;
  movePageToContainerEnd(dragged.id, container.dataset.sectionId || null);
}

function applySectionDrop(dragged, dropTarget) {
  const targetSectionId = dropTarget.closest('.section-item')?.dataset.sectionId;
  if (!targetSectionId) return;
  reorderSections(dragged.id, targetSectionId);
}

function getClosestValidDropTarget(dragged, target) {
  if (dragged.type === 'page') return getPageDropTarget(target);
  return getSectionDropTarget(target);
}

function handlePagesDragEnd() {
  clearDragVisualState();
  draggingItem = null;
}

function handlePagesDragOver(event) {
  const dragged = resolveDraggingItem(event);
  if (!dragged) return;
  const dropTarget = getClosestValidDropTarget(dragged, event.target);
  if (!dropTarget) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  pagesList.querySelectorAll('.drop-target').forEach((node) => node.classList.remove('drop-target'));
  dropTarget.classList.add('drop-target');
}

function handlePagesDrop(event) {
  const dragged = resolveDraggingItem(event);
  if (!dragged) return;
  const dropTarget = getClosestValidDropTarget(dragged, event.target);
  if (!dropTarget) return;
  event.preventDefault();

  if (dragged.type === 'page') applyPageDrop(dragged, dropTarget);
  if (dragged.type === 'section') applySectionDrop(dragged, dropTarget);
  saveState();
  renderPages();
  clearDragVisualState();
  draggingItem = null;
}

function handleAnchorsClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const item = target.closest('.anchor-row');
  if (!item) return;

  const pageId = item.dataset.pageId;
  const anchorId = item.dataset.anchorId;
  const tag = item.dataset.tag;

  if (target.classList.contains('remove-tag')) {
    removeAnchorTag(pageId, anchorId, tag);
    return;
  }

  if (target.classList.contains('edit-tag')) {
    editAnchorTag(pageId, anchorId, tag);
    return;
  }

  openInternalLink(`notekeeper://page/${pageId}#${anchorId}`);
}

function editAnchorTag(pageId, oldAnchorId, oldTag) {
  const newTag = prompt('Novo nome/tag da âncora:', oldTag);
  if (!newTag || newTag.trim() === oldTag) return;

  const newAnchorId = sanitizeAnchorId(newTag);
  if (!newAnchorId) return;

  state.pages.forEach((page) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = page.content;

    wrap.querySelectorAll(`[id="${cssEscape(oldAnchorId)}"]`).forEach((el) => {
      el.id = newAnchorId;
      if ((el.textContent || '').trim() === oldTag) el.textContent = newTag;
    });

    wrap.querySelectorAll(`a[href="notekeeper://page/${pageId}#${oldAnchorId}"]`).forEach((link) => {
      link.setAttribute('href', `notekeeper://page/${pageId}#${newAnchorId}`);
      if ((link.textContent || '').trim() === oldTag) link.textContent = newTag;
    });

    if (Array.isArray(page.anchors)) {
      page.anchors = page.anchors.map((anchor) => {
        if (page.id === pageId && anchor.anchorId === oldAnchorId && anchor.tag === oldTag) {
          return { anchorId: newAnchorId, tag: newTag.trim() };
        }
        return anchor;
      });
    }

    page.content = wrap.innerHTML;
    page.plainText = wrap.textContent || '';
  });

  saveState();
  renderAnchorsList();
  loadActivePageToEditor();
}

function createAnchorFromSelection() {
  const tag = prompt('Tag da âncora (ex: João):');
  if (!tag) return;

  const anchorId = sanitizeAnchorId(tag);
  if (!anchorId) return;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  const text = selectedText || tag;

  document.execCommand('insertHTML', false, `<span id="${anchorId}" class="anchor-tag">${escapeHtml(text)}</span>`);

  updateActivePage((page) => {
    ensureAnchorTag(page, anchorId, tag);
    page.content = editor.innerHTML;
    page.plainText = editor.innerText;
  });

  renderAnchorsList();
}

function insertInternalLink() {
  const options = getAllAnchors().map((anchor, index) => ({
    number: index + 1,
    label: `#${anchor.tag} (${anchor.pageTitle})`,
    href: `notekeeper://page/${anchor.pageId}#${anchor.anchorId}`
  }));

  if (!options.length) {
    alert('Nenhuma âncora cadastrada ainda.');
    return;
  }

  const menu = options.map((opt) => `${opt.number} - ${opt.label}`).join('\n');
  const answer = prompt(`Escolha um destino pelo número:\n${menu}`);
  if (!answer) return;

  const choice = options.find((opt) => opt.number === Number(answer));
  if (!choice) return;

  const selectedText = window.getSelection()?.toString().trim() || choice.label;
  document.execCommand('insertHTML', false, `<a href="${choice.href}">${escapeHtml(selectedText)}</a>`);
  editor.dispatchEvent(new Event('input'));
}

function applyAutoLinksOnActivePage() {
  if (!state.autolinkEnabled) return;
  const tags = getAllAnchors().filter((anchor) => anchor.tag.trim().length > 0);
  if (!tags.length) return;

  const shouldRestoreCaret = document.activeElement === editor;
  const caretOffset = shouldRestoreCaret ? getCaretCharacterOffsetWithin(editor) : null;

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('a')) continue;
    textNodes.push(node);
  }

  isApplyingAutoLink = true;
  let changed = false;
  const sortedTags = [...tags].sort((a, b) => b.tag.length - a.tag.length);

  textNodes.forEach((node) => {
    const fragment = convertTextNodeToAutolinks(node.nodeValue, sortedTags);
    if (fragment) {
      changed = true;
      node.parentNode.replaceChild(fragment, node);
    }
  });

  if (changed && shouldRestoreCaret && Number.isFinite(caretOffset)) {
    setCaretCharacterOffsetWithin(editor, caretOffset);
  }

  isApplyingAutoLink = false;
  if (changed) {
    updateActivePage((page) => {
      page.content = editor.innerHTML;
      page.plainText = editor.innerText;
    });
  }
}

function getCaretCharacterOffsetWithin(root) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(root);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
}

function setCaretCharacterOffsetWithin(root, offset) {
  if (!Number.isFinite(offset)) return;
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.nodeValue?.length || 0;
    const next = current + length;

    if (offset <= next) {
      const position = Math.max(0, offset - current);
      const range = document.createRange();
      range.setStart(node, Math.min(position, length));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    current = next;
  }

  const fallbackRange = document.createRange();
  fallbackRange.selectNodeContents(root);
  fallbackRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(fallbackRange);
}

function convertTextNodeToAutolinks(text, tags) {
  if (!text) return null;
  const escaped = tags.map((item) => escapeRegExp(item.tag));
  if (!escaped.length) return null;

  const regex = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped.join('|')})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
  if (!regex.test(text)) return null;
  regex.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text))) {
    const start = match.index + match[1].length;
    const before = text.slice(lastIndex, start);
    if (before) fragment.appendChild(document.createTextNode(before));

    const matchedWord = match[2];
    const anchor = tags.find((item) => item.tag.toLowerCase() === matchedWord.toLowerCase());
    if (anchor) {
      const link = document.createElement('a');
      link.href = `notekeeper://page/${anchor.pageId}#${anchor.anchorId}`;
      link.textContent = matchedWord;
      fragment.appendChild(link);
    } else {
      fragment.appendChild(document.createTextNode(matchedWord));
    }

    lastIndex = start + matchedWord.length;
  }

  const after = text.slice(lastIndex);
  if (after) fragment.appendChild(document.createTextNode(after));
  return fragment;
}

function removeAnchorTag(pageId, anchorId, tag) {
  const page = state.pages.find((p) => p.id === pageId);
  if (!page || !Array.isArray(page.anchors)) return;

  page.anchors = page.anchors.filter((item) => !(item.anchorId === anchorId && item.tag === tag));
  state.pages.forEach((eachPage) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = eachPage.content;
    wrap.querySelectorAll(`a[href="notekeeper://page/${pageId}#${anchorId}"]`).forEach((link) => {
      link.replaceWith(document.createTextNode(link.textContent || ''));
    });
    eachPage.content = wrap.innerHTML;
    eachPage.plainText = wrap.textContent || '';
  });

  saveState();
  renderAnchorsList();
  loadActivePageToEditor();
}

function getAllAnchors() {
  return state.pages.flatMap((page) => (page.anchors || []).map((anchor) => ({
    ...anchor,
    pageId: page.id,
    pageTitle: page.title
  })));
}

function openInternalLink(href) {
  const match = href.match(/^notekeeper:\/\/page\/([^#]+)(?:#(.+))?$/);
  if (!match) return;

  const pageId = match[1];
  const anchorId = match[2];
  if (!state.pages.some((page) => page.id === pageId)) return;

  state.activePageId = pageId;
  saveState();
  renderPages();
  loadActivePageToEditor();

  if (anchorId) {
    const target = editor.querySelector(`#${cssEscape(anchorId)}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateSearchResults(term) {
  for (const li of pagesList.querySelectorAll('.page-item')) {
    const id = li.dataset.pageId;
    const page = state.pages.find((p) => p.id === id);
    if (!page) continue;
    const matches = !term || page.plainText.toLowerCase().includes(term) || page.title.toLowerCase().includes(term);
    li.style.display = matches ? '' : 'none';
  }

  removeSearchMarks();
  if (!term) return;
  highlightSearchTermInEditor(term);
}

function highlightSearchTermInEditor(term) {
  const regex = new RegExp(escapeRegExp(term), 'gi');
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    if (!regex.test(node.nodeValue)) return;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let last = 0;
    let match;

    while ((match = regex.exec(node.nodeValue))) {
      const before = node.nodeValue.slice(last, match.index);
      if (before) fragment.appendChild(document.createTextNode(before));
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = match[0];
      fragment.appendChild(mark);
      last = match.index + match[0].length;
    }

    const after = node.nodeValue.slice(last);
    if (after) fragment.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(fragment, node);
  });
}

function removeSearchMarks() {
  editor.querySelectorAll('mark.search-hit').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent || '')));
}

function renderAnchorsList() {
  anchorsList.innerHTML = '';
  const anchors = getAllAnchors();

  if (!anchors.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Nenhuma âncora criada.';
    empty.className = 'anchors-empty';
    anchorsList.appendChild(empty);
    return;
  }

  anchors.forEach((anchor) => {
    const li = document.createElement('li');
    li.className = 'anchor-row';
    li.dataset.pageId = anchor.pageId;
    li.dataset.anchorId = anchor.anchorId;
    li.dataset.tag = anchor.tag;
    li.innerHTML = `<span class="anchor-label">#${escapeHtml(anchor.tag)} <small>(${escapeHtml(anchor.pageTitle)})</small></span><div class="anchor-actions"><button class="edit-tag" title="Editar tag">✎</button><button class="remove-tag" title="Remover autolink da tag">✕</button></div>`;
    anchorsList.appendChild(li);
  });
}

function renderPages() {
  pagesList.innerHTML = '';
  const validSectionIds = new Set(state.sections.map((section) => section.id));
  const rootPages = state.pages.filter((page) => !page.sectionId || !validSectionIds.has(page.sectionId));
  const rootDropzone = document.createElement('li');
  rootDropzone.className = 'pages-root-dropzone';
  rootDropzone.dataset.sectionId = '';
  rootDropzone.innerHTML = '<div class="dropzone-title">Páginas soltas</div>';
  rootPages.forEach((page) => rootDropzone.appendChild(createPageItem(page)));
  pagesList.appendChild(rootDropzone);

  state.sections.forEach((section) => {
    const sectionItem = document.createElement('li');
    sectionItem.className = 'section-item';
    sectionItem.dataset.sectionId = section.id;
    sectionItem.draggable = true;

    const sectionPages = state.pages.filter((page) => page.sectionId === section.id);
    const sectionList = document.createElement('ul');
    sectionList.className = 'section-pages';
    sectionList.dataset.sectionId = section.id;
    if (section.collapsed) sectionList.classList.add('is-collapsed');
    sectionPages.forEach((page) => sectionList.appendChild(createPageItem(page)));

    sectionItem.innerHTML = `<div class="section-header"><span class="section-caret">${section.collapsed ? '▸' : '▾'}</span><span class="section-title">${escapeHtml(section.title)}</span><span class="section-count">${sectionPages.length}</span><button type="button" class="section-delete" title="Remover seção" aria-label="Remover seção">✕</button></div>`;
    sectionItem.appendChild(sectionList);
    pagesList.appendChild(sectionItem);
  });
}

function createPageItem(page) {
  const item = pageItemTemplate.content.firstElementChild.cloneNode(true);
  item.dataset.pageId = page.id;
  item.draggable = true;
  item.querySelector('.page-open').textContent = page.title || 'Sem título';
  if (page.id === state.activePageId) item.classList.add('active');
  return item;
}

function loadActivePageToEditor() {
  const active = getActivePage();
  if (!active) return;
  editor.innerHTML = active.content;
  normalizeImageSizing();
  pageTitle.value = active.title;
  updateSearchResults(searchInput.value.trim().toLowerCase());
}

function exportCurrentPage() {
  syncEditorIntoActivePage();
  const page = getActivePage();
  if (!page) return;

  const payload = { app: 'NoteKeeper', version: PROJECT_FILE_VERSION, exportedAt: new Date().toISOString(), page };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${sanitizeFilename(page.title || 'pagina')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportProjectAsPdf() {
  syncEditorIntoActivePage();
  if (!window.jspdf?.jsPDF || typeof window.html2canvas !== 'function') {
    alert('Não foi possível exportar PDF: bibliotecas de PDF não carregaram.');
    return;
  }

  const appThemeStylesheet = document.querySelector('link[href$="styles.css"]');
  const previousMedia = appThemeStylesheet?.getAttribute('media');
  if (appThemeStylesheet) appThemeStylesheet.setAttribute('media', 'not all');

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    let isFirstPdfPage = true;

    for (const page of state.pages) {
      const printable = buildPrintablePageNode(page, contentWidth);
      document.body.appendChild(printable);

      try {
        const canvas = await window.html2canvas(printable, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const ratio = contentWidth / canvas.width;
        const scaledHeight = canvas.height * ratio;

        let sourceY = 0;
        let remainingHeight = scaledHeight;

        while (remainingHeight > 0) {
          if (!isFirstPdfPage) pdf.addPage();
          isFirstPdfPage = false;

          const sliceHeightInPdf = Math.min(contentHeight, remainingHeight);
          const sliceHeightInCanvas = sliceHeightInPdf / ratio;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.ceil(sliceHeightInCanvas);
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) break;

          ctx.drawImage(canvas, 0, sourceY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
          const imageData = pageCanvas.toDataURL('image/png');
          pdf.addImage(imageData, 'PNG', margin, margin, contentWidth, sliceHeightInPdf, undefined, 'FAST');

          sourceY += pageCanvas.height;
          remainingHeight -= sliceHeightInPdf;
        }
      } finally {
        printable.remove();
      }
    }

    pdf.save('notekeeper-projeto.pdf');
  } finally {
    if (appThemeStylesheet) {
      if (previousMedia === null) appThemeStylesheet.removeAttribute('media');
      else appThemeStylesheet.setAttribute('media', previousMedia);
    }
  }
}

function buildPrintablePageNode(page, width) {
  const wrapper = document.createElement('section');
  wrapper.className = 'pdf-print-stage';
  wrapper.style.width = `${Math.max(320, width)}px`;
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#111111';
  wrapper.style.padding = '24px';
  wrapper.style.fontFamily = 'Roboto, Arial, sans-serif';
  wrapper.style.lineHeight = '1.5';
  wrapper.style.border = '1px solid #d7d7d7';

  const title = document.createElement('h1');
  title.textContent = page.title || 'Sem título';
  title.style.margin = '0 0 12px';
  title.style.fontSize = '24px';

  const body = document.createElement('div');
  body.innerHTML = page.content || '';
  body.style.fontSize = '13px';
  body.style.wordBreak = 'break-word';

  body.querySelectorAll('img').forEach((img) => {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '10px 0';
  });

  body.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('notekeeper://')) {
      link.replaceWith(document.createTextNode(link.textContent || ''));
    }
  });

  wrapper.append(title, body);
  return wrapper;
}

function syncEditorIntoActivePage() {
  updateActivePage((page) => {
    page.content = editor.innerHTML;
    page.plainText = editor.innerText;
    page.title = pageTitle.value.trim() || 'Sem título';
  });
}

function updateActivePage(mutator) {
  const page = getActivePage();
  if (!page) return;
  mutator(page);
  saveState();
}

function getActivePage() {
  return state.pages.find((page) => page.id === state.activePageId);
}

function applyTheme(theme) {
  const normalizedTheme = THEME_NAMES.includes(theme) ? theme : 'dark';
  document.body.dataset.theme = normalizedTheme;

  const selectedThemeButton = themeMenuPopover.querySelector(`[data-theme="${normalizedTheme}"]`);
  if (selectedThemeButton) {
    themeMenuBtn.textContent = `🎨 ${selectedThemeButton.textContent?.trim() || 'Tema'}`;
  }
}

function applyTextColor(color) {
  document.execCommand('foreColor', false, color);
  editor.focus();
  rememberRecentColor(color);
  editor.dispatchEvent(new Event('input'));
}

function rememberRecentColor(color) {
  const normalized = color.toLowerCase();
  state.recentColors = [normalized, ...state.recentColors.filter((item) => item !== normalized)].slice(0, MAX_RECENT_COLORS);
  renderRecentColors();
  saveState();
}

function renderRecentColors() {
  recentColorsContainer.innerHTML = '';
  state.recentColors.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-color';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.title = color;
    recentColorsContainer.appendChild(btn);
  });
}

function ensureAnchorTag(page, anchorId, tag) {
  if (!Array.isArray(page.anchors)) page.anchors = [];
  const exists = page.anchors.some((item) => item.anchorId === anchorId && item.tag.toLowerCase() === tag.toLowerCase());
  if (!exists) page.anchors.push({ anchorId, tag: tag.trim() });
}

function createInitialState() {
  const firstPage = createPage('Nova página');
  return {
    version: PROJECT_FILE_VERSION,
    theme: 'dark',
    autolinkEnabled: true,
    recentColors: ['#d6c4b4'],
    pages: [firstPage],
    sections: [],
    activePageId: firstPage.id
  };
}

function createPage(title) {
  return { id: crypto.randomUUID(), title, content: '', plainText: '', anchors: [], sectionId: null };
}

function createSection(title) {
  return { id: crypto.randomUUID(), title, collapsed: false };
}

async function importProjectFromFile(file) {
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  if (extension === 'zip' || file.type === 'application/zip') {
    await importProjectFromZip(file);
    return;
  }

  const text = await file.text();
  importProjectFromJson(text);
}

async function importProjectFromZip(file) {
  if (typeof window.JSZip === 'undefined') {
    alert('Não foi possível abrir ZIP. Biblioteca JSZip não foi carregada.');
    return;
  }

  try {
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const projectEntry = zip.file(PROJECT_JSON_NAME);
    if (!projectEntry) {
      alert('ZIP inválido: arquivo project.json não encontrado.');
      return;
    }

    const parsed = JSON.parse(await projectEntry.async('string'));
    const importedState = extractStateFromImportedFile(parsed);
    if (!isValidState(importedState)) {
      alert('Arquivo inválido. Selecione um export do NoteKeeper.');
      return;
    }

    const hydratedState = await restoreAssetReferencesFromZip(normalizeState(importedState), zip, parsed.assets);
    hydrateImportedState(hydratedState);
  } catch {
    alert('Não foi possível abrir o projeto ZIP.');
  }
}

function importProjectFromJson(text) {
  try {
    const parsed = JSON.parse(text);
    const importedState = extractStateFromImportedFile(parsed);
    if (!isValidState(importedState)) {
      alert('Arquivo inválido. Selecione um export do NoteKeeper.');
      return;
    }

    hydrateImportedState(normalizeState(importedState));
  } catch {
    alert('Não foi possível abrir o projeto. Verifique o arquivo JSON.');
  }
}

function hydrateImportedState(importedState) {
  state = importedState;
  applyTheme(state.theme);
  autolinkToggle.checked = state.autolinkEnabled;
  saveState();
  renderPages();
  renderRecentColors();
  renderAnchorsList();
  loadActivePageToEditor();
}

async function writeProjectToHandle(handle) {
  try {
    const zipBlob = await generateProjectZip(state);
    const writable = await handle.createWritable();
    await writable.write(zipBlob);
    await writable.close();
  } catch {
    alert('Falha ao salvar no arquivo atual.');
  }
}

async function downloadProjectFallback() {
  const blob = await generateProjectZip(state);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notekeeper-project-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function generateProjectZip(currentState) {
  if (typeof window.JSZip === 'undefined') {
    throw new Error('JSZip indisponível');
  }

  const zip = new window.JSZip();
  const assetsFolder = zip.folder('assets');
  const serialized = await serializeStateWithAssets(currentState, assetsFolder);
  const payload = {
    app: 'NoteKeeper',
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    assets: serialized.assets,
    data: serialized.state
  };
  zip.file(PROJECT_JSON_NAME, JSON.stringify(payload, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

async function serializeStateWithAssets(rawState, assetsFolder) {
  const nextState = structuredClone(rawState);
  const assets = [];

  for (const page of nextState.pages) {
    const doc = htmlToDocument(page.content || '');
    const images = Array.from(doc.querySelectorAll('img'));
    for (const image of images) {
      const src = image.getAttribute('src') || '';
      if (!src.startsWith('data:')) continue;
      const { blob, extension, mimeType } = dataUrlToBlob(src);
      const assetId = crypto.randomUUID();
      const assetName = `${assetId}.${extension}`;
      assetsFolder.file(assetName, blob);
      assets.push({ id: assetId, path: `${ASSETS_FOLDER}${assetName}`, mimeType });
      image.setAttribute('src', `${ASSET_URL_PREFIX}${assetId}`);
    }
    page.content = doc.body.innerHTML;
  }

  return { state: nextState, assets };
}

async function restoreAssetReferencesFromZip(rawState, zip, rawAssets) {
  const assets = Array.isArray(rawAssets) ? rawAssets : [];
  if (!assets.length) return rawState;

  const assetMap = new Map();
  for (const asset of assets) {
    if (!asset || typeof asset.id !== 'string' || typeof asset.path !== 'string') continue;
    const zipEntry = zip.file(asset.path);
    if (!zipEntry) continue;
    const mimeType = typeof asset.mimeType === 'string' && asset.mimeType ? asset.mimeType : guessMimeFromPath(asset.path);
    const base64 = await zipEntry.async('base64');
    assetMap.set(asset.id, `data:${mimeType};base64,${base64}`);
  }

  const nextState = structuredClone(rawState);
  nextState.pages = nextState.pages.map((page) => {
    const doc = htmlToDocument(page.content || '');
    doc.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || '';
      if (!src.startsWith(ASSET_URL_PREFIX)) return;
      const assetId = src.slice(ASSET_URL_PREFIX.length);
      const dataUrl = assetMap.get(assetId);
      if (dataUrl) image.setAttribute('src', dataUrl);
    });
    return { ...page, content: doc.body.innerHTML };
  });

  return nextState;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migratedState = normalizeState(JSON.parse(legacyRaw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
      return migratedState;
    }

    return defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return { pages: [], sections: [], activePageId: null, recentColors: [], theme: 'dark', autolinkEnabled: true };
}

function normalizeState(rawState) {
  const sections = Array.isArray(rawState.sections)
    ? rawState.sections
        .filter((section) => section && typeof section.id === 'string')
        .map((section) => ({
          id: section.id,
          title: typeof section.title === 'string' && section.title.trim() ? section.title.trim() : 'Seção',
          collapsed: Boolean(section.collapsed)
        }))
    : [];
  const sectionIdSet = new Set(sections.map((section) => section.id));

  const validPages = Array.isArray(rawState.pages) ? rawState.pages.filter((page) => page && typeof page.id === 'string') : [];

  const pages = validPages.map((page) => ({
    id: page.id,
    title: typeof page.title === 'string' ? page.title : 'Sem título',
    content: typeof page.content === 'string' ? page.content : '',
    plainText: typeof page.plainText === 'string' ? page.plainText : '',
    sectionId: typeof page.sectionId === 'string' && sectionIdSet.has(page.sectionId) ? page.sectionId : null,
    anchors: Array.isArray(page.anchors)
      ? page.anchors.filter((anchor) => anchor && typeof anchor.anchorId === 'string' && typeof anchor.tag === 'string').map((anchor) => ({ anchorId: anchor.anchorId, tag: anchor.tag }))
      : []
  }));

  return {
    pages,
    sections,
    activePageId: typeof rawState.activePageId === 'string' ? rawState.activePageId : pages[0]?.id || null,
    recentColors: Array.isArray(rawState.recentColors) ? rawState.recentColors.slice(0, MAX_RECENT_COLORS) : [],
    theme: THEME_NAMES.includes(rawState.theme) ? rawState.theme : 'dark',
    autolinkEnabled: rawState.autolinkEnabled !== false
  };
}

function isValidState(importedState) {
  return Boolean(importedState && typeof importedState === 'object' && Array.isArray(importedState.pages));
}

function extractStateFromImportedFile(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  if (Array.isArray(parsed.pages)) return parsed;
  if (parsed.data && typeof parsed.data === 'object' && Array.isArray(parsed.data.pages)) return parsed.data;
  return null;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      if (!hasShownStorageQuotaWarning) {
        hasShownStorageQuotaWarning = true;
        alert('Seu navegador ficou sem espaço no armazenamento local. Continue editando e use "Salvar projeto (💾)" para baixar um arquivo e não perder progresso.');
      }
      return;
    }
    throw error;
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function htmlToDocument(html) {
  const parser = new DOMParser();
  return parser.parseFromString(`<body>${html || ''}</body>`, 'text/html');
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = dataUrl.split(',');
  const mimeMatch = header.match(/^data:([^;]+);base64$/i);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
    extension: mimeTypeToExtension(mimeType)
  };
}

function mimeTypeToExtension(mimeType) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico'
  };
  return map[mimeType.toLowerCase()] || 'bin';
}

function guessMimeFromPath(path) {
  const extension = (path.split('.').pop() || '').toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon'
  };
  return map[extension] || 'application/octet-stream';
}

function sanitizeAnchorId(value) {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

function sanitizeFilename(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 40) || 'pagina';
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return value.replace(/([ #;?%&,.+*~\':"!^$\[\]()=>|\/@])/g, '\\$1');
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isQuotaExceededError(error) {
  if (!error || typeof error !== 'object') return false;
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}
