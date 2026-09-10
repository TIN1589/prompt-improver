/**
 * main.ts — Options Page Controller (TypeScript, Manifest V3 Clean Architecture)
 */

import { VaultRepository } from '../../infrastructure/storage/vault.repository';
import { SettingsRepository } from '../../infrastructure/storage/settings.repository';
import { iconSvg } from '../../shared/utils/svg-icons';
import { escapeHtml } from '../../shared/utils/entity-extractor';
import type { CustomTemplate } from '../../shared/types/settings';

interface OptionElements {
  apiKeyInput: HTMLInputElement | null;
  passphraseInput: HTMLInputElement | null;
  btnSaveApiKey: HTMLButtonElement | null;
  btnRemoveApiKey: HTMLButtonElement | null;
  keyStatus: HTMLElement | null;

  defaultModeSelect: HTMLSelectElement | null;
  enableContextMenuCheckbox: HTMLInputElement | null;
  btnSavePreferences: HTMLButtonElement | null;
  prefStatus: HTMLElement | null;

  tplTitle: HTMLInputElement | null;
  tplContent: HTMLTextAreaElement | null;
  btnAddTemplate: HTMLButtonElement | null;
  templateList: HTMLElement | null;
  btnExportTemplates: HTMLButtonElement | null;
  fileImportTemplates: HTMLInputElement | null;
}

function queryOptionElements(): OptionElements {
  return {
    apiKeyInput: document.getElementById('apiKey') as HTMLInputElement | null,
    passphraseInput: document.getElementById('passphrase') as HTMLInputElement | null,
    btnSaveApiKey: document.getElementById('btnSaveApiKey') as HTMLButtonElement | null,
    btnRemoveApiKey: document.getElementById('btnRemoveApiKey') as HTMLButtonElement | null,
    keyStatus: document.getElementById('keyStatus'),

    defaultModeSelect: document.getElementById('defaultMode') as HTMLSelectElement | null,
    enableContextMenuCheckbox: document.getElementById('enableContextMenu') as HTMLInputElement | null,
    btnSavePreferences: document.getElementById('btnSavePreferences') as HTMLButtonElement | null,
    prefStatus: document.getElementById('prefStatus'),

    tplTitle: document.getElementById('tplTitle') as HTMLInputElement | null,
    tplContent: document.getElementById('tplContent') as HTMLTextAreaElement | null,
    btnAddTemplate: document.getElementById('btnAddTemplate') as HTMLButtonElement | null,
    templateList: document.getElementById('templateList'),
    btnExportTemplates: document.getElementById('btnExportTemplates') as HTMLButtonElement | null,
    fileImportTemplates: document.getElementById('fileImportTemplates') as HTMLInputElement | null,
  };
}

function bootstrapOptions(): void {
  const dom = queryOptionElements();
  setupEventListeners(dom);

  loadOptions(dom).catch((err) => console.error('[Options] Tải cấu hình lỗi:', err));
  renderTemplates(dom).catch((err) => console.error('[Options] Render templates lỗi:', err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapOptions);
} else {
  bootstrapOptions();
}

function setupEventListeners(dom: OptionElements): void {
  dom.btnSaveApiKey?.addEventListener('click', () => handleSaveApiKey(dom));
  dom.btnRemoveApiKey?.addEventListener('click', () => handleRemoveApiKey(dom));
  dom.btnSavePreferences?.addEventListener('click', () => handleSavePreferences(dom));
  dom.btnAddTemplate?.addEventListener('click', () => handleAddTemplate(dom));
  dom.btnExportTemplates?.addEventListener('click', () => handleExportTemplates());
  dom.fileImportTemplates?.addEventListener('change', (e) => handleImportTemplates(dom, e));
}

async function loadOptions(dom: OptionElements): Promise<void> {
  const settings = await SettingsRepository.getSettings();
  const hasKey = await VaultRepository.hasApiKey();

  if (hasKey && dom.keyStatus) {
    showStatus(dom.keyStatus, 'Đã cấu hình API Key (được mã hoá an toàn với Web Crypto).', 'success');
  }

  if (settings.defaultMode && dom.defaultModeSelect) {
    dom.defaultModeSelect.value = settings.defaultMode;
  }

  if (typeof settings.enableContextMenu !== 'undefined' && dom.enableContextMenuCheckbox) {
    dom.enableContextMenuCheckbox.checked = settings.enableContextMenu;
  }
}

async function handleSaveApiKey(dom: OptionElements): Promise<void> {
  const key = dom.apiKeyInput?.value.trim();
  const passphrase = dom.passphraseInput?.value.trim();

  if (!key || !passphrase) {
    showStatus(dom.keyStatus, 'Vui lòng nhập cả API Key và Mật khẩu bảo vệ!', 'error');
    return;
  }

  if (passphrase.length < 6) {
    showStatus(dom.keyStatus, 'Mật khẩu bảo vệ nên có ít nhất 6 ký tự!', 'error');
    return;
  }

  try {
    await VaultRepository.saveApiKey(key, passphrase);
    if (dom.apiKeyInput) dom.apiKeyInput.value = '';
    if (dom.passphraseInput) dom.passphraseInput.value = '';
    showStatus(dom.keyStatus, 'Đã mã hóa và lưu API Key an toàn!', 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showStatus(dom.keyStatus, `Lỗi mã hóa: ${msg}`, 'error');
  }
}

async function handleRemoveApiKey(dom: OptionElements): Promise<void> {
  if (confirm('Bạn có chắc chắn muốn xóa API Key đã lưu?')) {
    await VaultRepository.removeApiKey();
    showStatus(dom.keyStatus, 'Đã xóa API Key khỏi bộ nhớ local.', 'success');
  }
}

async function handleSavePreferences(dom: OptionElements): Promise<void> {
  const defaultMode = dom.defaultModeSelect?.value || 'concise';
  const enableContextMenu = dom.enableContextMenuCheckbox ? dom.enableContextMenuCheckbox.checked : true;

  await SettingsRepository.updateSettings({ defaultMode, enableContextMenu });
  showStatus(dom.prefStatus, 'Đã lưu cấu hình tùy chọn thành công!', 'success');
}

async function handleAddTemplate(dom: OptionElements): Promise<void> {
  const title = dom.tplTitle?.value.trim();
  const template = dom.tplContent?.value.trim();

  if (!title || !template) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung template.');
    return;
  }

  const settings = await SettingsRepository.getSettings();
  const list = settings.customTemplates || [];
  list.push({ id: Date.now().toString(), title, template });

  await SettingsRepository.updateSettings({ customTemplates: list });
  if (dom.tplTitle) dom.tplTitle.value = '';
  if (dom.tplContent) dom.tplContent.value = '';
  await renderTemplates(dom);
}

async function renderTemplates(dom: OptionElements): Promise<void> {
  const listEl = dom.templateList;
  if (!listEl) return;
  const settings = await SettingsRepository.getSettings();
  const list: CustomTemplate[] = settings.customTemplates || [
    {
      id: 'default-1',
      title: 'Tối ưu hàm & Logic (Code Only)',
      template:
        'TASK: Optimize logic in {concept}.\nCONTEXT: {context}\nCONSTRAINTS: {constraints}\nOUTPUT: TypeScript code only.',
    },
    {
      id: 'default-2',
      title: 'Sửa lỗi & Viết Unit Test',
      template:
        'TASK: Debug and write tests for {concept}.\nCONTEXT: {context}\nRULES: Strict types, zero side-effects.',
    },
  ];

  listEl.innerHTML = '';
  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'template-item';
    div.innerHTML = `
      <span class="template-item-title">${escapeHtml(item.title)}</span>
      <button class="btn btn-sm btn-danger btn-del" data-id="${item.id}" aria-label="Xóa template">${iconSvg('i-trash', 'pi-icon-xs')} Xóa</button>
    `;

    div.querySelector('.btn-del')?.addEventListener('click', async () => {
      const updated = list.filter((t) => t.id !== item.id);
      await SettingsRepository.updateSettings({ customTemplates: updated });
      await renderTemplates(dom);
    });

    listEl.appendChild(div);
  });
}

async function handleExportTemplates(): Promise<void> {
  const settings = await SettingsRepository.getSettings();
  const list = settings.customTemplates || [];
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-improver-templates-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportTemplates(dom: OptionElements, e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const text = event.target?.result as string;
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        await SettingsRepository.updateSettings({ customTemplates: imported });
        await renderTemplates(dom);
        alert('Đã nhập danh sách templates thành công!');
      } else {
        alert('File JSON không đúng định dạng mảng templates!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Lỗi đọc file JSON: ' + msg);
    }
  };
  reader.readAsText(file);
}

function showStatus(elem: HTMLElement | null, text: string, type: 'success' | 'error'): void {
  if (!elem) return;
  const icon =
    type === 'success'
      ? iconSvg('i-check-circle', 'pi-icon-ok')
      : iconSvg('i-x-circle', 'pi-icon-danger');
  elem.innerHTML = `${icon} <span>${escapeHtml(text)}</span>`;
  elem.className = `status-msg ${type}`;
  setTimeout(() => {
    elem.className = 'status-msg';
  }, 4000);
}
