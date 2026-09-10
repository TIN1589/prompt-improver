/**
 * main.ts — Options Page Controller (TypeScript, Manifest V3 Clean Architecture)
 */

import { VaultRepository } from '../../infrastructure/storage/vault.repository';
import { SettingsRepository } from '../../infrastructure/storage/settings.repository';
import { iconSvg } from '../../shared/utils/svg-icons';
import { escapeHtml } from '../../shared/utils/entity-extractor';
import type { CustomTemplate } from '../../shared/types/settings';

const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
const btnSaveApiKey = document.getElementById('btnSaveApiKey') as HTMLButtonElement;
const btnRemoveApiKey = document.getElementById('btnRemoveApiKey') as HTMLButtonElement;
const keyStatus = document.getElementById('keyStatus') as HTMLElement;

const defaultModeSelect = document.getElementById('defaultMode') as HTMLSelectElement;
const enableContextMenuCheckbox = document.getElementById('enableContextMenu') as HTMLInputElement;
const btnSavePreferences = document.getElementById('btnSavePreferences') as HTMLButtonElement;
const prefStatus = document.getElementById('prefStatus') as HTMLElement;

const tplTitle = document.getElementById('tplTitle') as HTMLInputElement;
const tplContent = document.getElementById('tplContent') as HTMLTextAreaElement;
const btnAddTemplate = document.getElementById('btnAddTemplate') as HTMLButtonElement;
const templateList = document.getElementById('templateList') as HTMLElement;
const btnExportTemplates = document.getElementById('btnExportTemplates') as HTMLButtonElement;
const fileImportTemplates = document.getElementById('fileImportTemplates') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  await renderTemplates();

  btnSaveApiKey?.addEventListener('click', handleSaveApiKey);
  btnRemoveApiKey?.addEventListener('click', handleRemoveApiKey);
  btnSavePreferences?.addEventListener('click', handleSavePreferences);
  btnAddTemplate?.addEventListener('click', handleAddTemplate);
  btnExportTemplates?.addEventListener('click', handleExportTemplates);
  fileImportTemplates?.addEventListener('change', handleImportTemplates);
});

async function loadOptions(): Promise<void> {
  const settings = await SettingsRepository.getSettings();
  const hasKey = await VaultRepository.hasApiKey();

  if (hasKey && keyStatus) {
    showStatus(keyStatus, 'Đã cấu hình API Key (được mã hoá an toàn với Web Crypto).', 'success');
  }

  if (settings.defaultMode && defaultModeSelect) {
    defaultModeSelect.value = settings.defaultMode;
  }

  if (typeof settings.enableContextMenu !== 'undefined' && enableContextMenuCheckbox) {
    enableContextMenuCheckbox.checked = settings.enableContextMenu;
  }
}

async function handleSaveApiKey(): Promise<void> {
  const key = apiKeyInput?.value.trim();
  const passphrase = passphraseInput?.value.trim();

  if (!key || !passphrase) {
    showStatus(keyStatus, 'Vui lòng nhập cả API Key và Mật khẩu bảo vệ!', 'error');
    return;
  }

  if (passphrase.length < 6) {
    showStatus(keyStatus, 'Mật khẩu bảo vệ nên có ít nhất 6 ký tự!', 'error');
    return;
  }

  try {
    await VaultRepository.saveApiKey(key, passphrase);
    if (apiKeyInput) apiKeyInput.value = '';
    if (passphraseInput) passphraseInput.value = '';
    showStatus(keyStatus, 'Đã mã hóa và lưu API Key an toàn!', 'success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showStatus(keyStatus, `Lỗi mã hóa: ${msg}`, 'error');
  }
}

async function handleRemoveApiKey(): Promise<void> {
  if (confirm('Bạn có chắc chắn muốn xóa API Key đã lưu?')) {
    await VaultRepository.removeApiKey();
    showStatus(keyStatus, 'Đã xóa API Key khỏi bộ nhớ local.', 'success');
  }
}

async function handleSavePreferences(): Promise<void> {
  const defaultMode = defaultModeSelect?.value || 'concise';
  const enableContextMenu = enableContextMenuCheckbox ? enableContextMenuCheckbox.checked : true;

  await SettingsRepository.updateSettings({ defaultMode, enableContextMenu });
  showStatus(prefStatus, 'Đã lưu cấu hình tùy chọn thành công!', 'success');
}

async function handleAddTemplate(): Promise<void> {
  const title = tplTitle?.value.trim();
  const template = tplContent?.value.trim();

  if (!title || !template) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung template.');
    return;
  }

  const settings = await SettingsRepository.getSettings();
  const list = settings.customTemplates || [];
  list.push({ id: Date.now().toString(), title, template });

  await SettingsRepository.updateSettings({ customTemplates: list });
  if (tplTitle) tplTitle.value = '';
  if (tplContent) tplContent.value = '';
  await renderTemplates();
}

async function renderTemplates(): Promise<void> {
  if (!templateList) return;
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

  templateList.innerHTML = '';
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
      await renderTemplates();
    });

    templateList.appendChild(div);
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

function handleImportTemplates(e: Event): void {
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
        await renderTemplates();
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

function showStatus(elem: HTMLElement, text: string, type: 'success' | 'error'): void {
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
