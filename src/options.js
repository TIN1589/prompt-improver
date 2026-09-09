import { encryptData } from './utils.js';
import { iconSvg } from './icons.js';

const apiKeyInput = document.getElementById('apiKey');
const passphraseInput = document.getElementById('passphrase');
const btnSaveApiKey = document.getElementById('btnSaveApiKey');
const btnRemoveApiKey = document.getElementById('btnRemoveApiKey');
const keyStatus = document.getElementById('keyStatus');

const defaultModeSelect = document.getElementById('defaultMode');
const enableContextMenuCheckbox = document.getElementById('enableContextMenu');
const btnSavePreferences = document.getElementById('btnSavePreferences');
const prefStatus = document.getElementById('prefStatus');

const tplTitle = document.getElementById('tplTitle');
const tplContent = document.getElementById('tplContent');
const btnAddTemplate = document.getElementById('btnAddTemplate');
const templateList = document.getElementById('templateList');
const btnExportTemplates = document.getElementById('btnExportTemplates');
const fileImportTemplates = document.getElementById('fileImportTemplates');

document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  await renderTemplates();

  btnSaveApiKey.addEventListener('click', handleSaveApiKey);
  btnRemoveApiKey.addEventListener('click', handleRemoveApiKey);
  btnSavePreferences.addEventListener('click', handleSavePreferences);
  btnAddTemplate.addEventListener('click', handleAddTemplate);
  btnExportTemplates.addEventListener('click', handleExportTemplates);
  fileImportTemplates.addEventListener('change', handleImportTemplates);
});

/**
 * Tải cài đặt hiện tại
 */
async function loadOptions() {
  const data = await chrome.storage.local.get(['encryptedApiKey', 'defaultMode', 'enableContextMenu']);
  if (data.encryptedApiKey) {
    showStatus(keyStatus, 'Đã cấu hình API Key (được mã hoá an toàn).', 'success');
  }
  if (data.defaultMode) {
    defaultModeSelect.value = data.defaultMode;
  }
  if (typeof data.enableContextMenu !== 'undefined') {
    enableContextMenuCheckbox.checked = data.enableContextMenu;
  }
}

/**
 * Mã hóa và lưu API Key
 */
async function handleSaveApiKey() {
  const key = apiKeyInput.value.trim();
  const passphrase = passphraseInput.value.trim();

  if (!key || !passphrase) {
    showStatus(keyStatus, 'Vui lòng nhập cả API Key và Mật khẩu bảo vệ!', 'error');
    return;
  }

  if (passphrase.length < 6) {
    showStatus(keyStatus, 'Mật khẩu bảo vệ nên có ít nhất 6 ký tự!', 'error');
    return;
  }

  try {
    const encrypted = await encryptData(key, passphrase);
    await chrome.storage.local.set({ encryptedApiKey: encrypted });
    apiKeyInput.value = '';
    passphraseInput.value = '';
    showStatus(keyStatus, 'Đã mã hóa và lưu API Key an toàn!', 'success');
  } catch (err) {
    showStatus(keyStatus, `Lỗi mã hóa: ${err.message}`, 'error');
  }
}

/**
 * Xóa API Key
 */
async function handleRemoveApiKey() {
  if (confirm('Bạn có chắc chắn muốn xóa API Key đã lưu?')) {
    await chrome.storage.local.remove('encryptedApiKey');
    showStatus(keyStatus, 'Đã xóa API Key khỏi bộ nhớ local.', 'success');
  }
}

/**
 * Lưu tùy chọn chung
 */
async function handleSavePreferences() {
  const defaultMode = defaultModeSelect.value;
  const enableContextMenu = enableContextMenuCheckbox.checked;

  await chrome.storage.local.set({ defaultMode, enableContextMenu });
  showStatus(prefStatus, 'Đã lưu cấu hình tùy chọn thành công!', 'success');
}

/**
 * Thêm template mới
 */
async function handleAddTemplate() {
  const title = tplTitle.value.trim();
  const template = tplContent.value.trim();

  if (!title || !template) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung template.');
    return;
  }

  const data = await chrome.storage.local.get(['customTemplates']);
  const list = data.customTemplates || [];
  list.push({ id: Date.now().toString(), title, template });

  await chrome.storage.local.set({ customTemplates: list });
  tplTitle.value = '';
  tplContent.value = '';
  await renderTemplates();
}

/**
 * Hiển thị danh sách Template
 */
async function renderTemplates() {
  const data = await chrome.storage.local.get(['customTemplates']);
  const list = data.customTemplates || [
    {
      id: 'default-1',
      title: 'Tối ưu hàm & Logic (Code Only)',
      template: 'TASK: Optimize logic in {concept}.\nCONTEXT: {context}\nCONSTRAINTS: {constraints}\nOUTPUT: TypeScript code only.'
    },
    {
      id: 'default-2',
      title: 'Sửa lỗi & Viết Unit Test',
      template: 'TASK: Debug and write tests for {concept}.\nCONTEXT: {context}\nRULES: Strict types, zero side-effects.'
    }
  ];

  templateList.innerHTML = '';
  list.forEach(item => {
    const div = document.createElement('div');
    div.className = 'template-item';
    div.innerHTML = `
      <span class="template-item-title">${escapeHtml(item.title)}</span>
      <button class="btn btn-sm btn-danger btn-del" data-id="${item.id}" aria-label="Xóa template">${iconSvg('i-trash', 'pi-icon-xs')} Xóa</button>
    `;

    div.querySelector('.btn-del').addEventListener('click', async () => {
      const updated = list.filter(t => t.id !== item.id);
      await chrome.storage.local.set({ customTemplates: updated });
      await renderTemplates();
    });

    templateList.appendChild(div);
  });
}

/**
 * Xuất Templates ra file JSON
 */
async function handleExportTemplates() {
  const data = await chrome.storage.local.get(['customTemplates']);
  const list = data.customTemplates || [];
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `claude-optimizer-templates-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Nhập Templates từ file JSON
 */
async function handleImportTemplates(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        await chrome.storage.local.set({ customTemplates: imported });
        await renderTemplates();
        alert('Đã nhập danh sách templates thành công!');
      } else {
        alert('File JSON không đúng định dạng mảng templates!');
      }
    } catch (err) {
      alert('Lỗi đọc file JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function showStatus(elem, text, type) {
  const icon = type === 'success' ? iconSvg('i-check-circle', 'pi-icon-ok') : iconSvg('i-x-circle', 'pi-icon-danger');
  elem.innerHTML = `${icon} <span>${escapeHtml(text)}</span>`;
  elem.className = `status-msg ${type}`;
  setTimeout(() => {
    elem.className = 'status-msg';
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
