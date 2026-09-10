/**
 * improve-modal.ts — Modal Xem trước, Chọn Persona, So sánh & Chấm điểm Prompt
 */

import { getOrCreateModalShadowRoot } from '../ui-mount';
import { iconSvg } from '../../shared/utils/svg-icons';
import { escapeHtml } from '../../shared/utils/entity-extractor';
import { estimateTokens } from '../../shared/utils/token-counter';
import { PERSONA_LIST, PersonaId } from '../../core/models/persona.entity';
import { TASK_TYPE_CONFIG } from '../../core/models/task-type.entity';
import type { PromptImproveResult } from '../../shared/types/messages';
import { MessageClient } from '../../infrastructure/messaging/message-client';

let currentEscListener: ((e: KeyboardEvent) => void) | null = null;
let currentActivePersona: PersonaId = 'developer';

export function safelyCloseModal(): void {
  if (currentEscListener) {
    window.removeEventListener('keydown', currentEscListener);
    currentEscListener = null;
  }
  const shadow = getOrCreateModalShadowRoot();
  const backdrop = shadow.querySelector('.pi-overlay-backdrop');
  if (backdrop) backdrop.remove();
}

function calcDiff(orig: number, opt: number): string {
  if (orig <= 0) return '';
  const diff = opt - orig;
  if (diff < 0) {
    const pct = Math.round((Math.abs(diff) / orig) * 100);
    return `-${pct}% token`;
  }
  return `+${diff} token`;
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'pi-score-high';
  if (score >= 50) return 'pi-score-med';
  return 'pi-score-low';
}

export async function openImproveModal(
  promptText: string,
  onApply: (newPrompt: string) => void,
  selectedPersona: PersonaId = currentActivePersona
): Promise<void> {
  const shadow = getOrCreateModalShadowRoot();
  safelyCloseModal();

  currentActivePersona = selectedPersona;

  const backdrop = document.createElement('div');
  backdrop.className = 'pi-overlay-backdrop';

  const modal = document.createElement('div');
  modal.className = 'pi-modal';

  modal.innerHTML = `
    <div class="pi-header">
      <div class="pi-header-left">
        <h3 class="pi-title">${iconSvg('i-spark', 'pi-icon-accent')} Prompt Improver</h3>
        <span id="piTaskBadge" class="pi-badge">Đang phân tích...</span>
        <span id="piEngineBadge" class="pi-badge pi-badge-instant">${iconSvg('i-bolt', 'pi-icon-accent')} <span>Siêu tốc</span></span>
        <span id="piCacheBadge" class="pi-badge pi-badge-cached" style="display: none;">${iconSvg('i-bolt', 'pi-icon-ok')} Cache</span>
      </div>
      <div class="pi-header-right" style="display: flex; align-items: center; gap: 8px;">
        <button id="piBtnUpgradeCloud" class="pi-btn-upgrade" style="display: none;" title="Nâng cấp chất lượng chi tiết hơn với Gemini Cloud AI">
          ${iconSvg('i-spark')} <span>Nâng cấp AI</span>
        </button>
        <button id="piBtnClose" class="pi-btn-close" title="Đóng (Esc)" aria-label="Đóng">${iconSvg('i-x')}</button>
      </div>
    </div>

    <!-- Persona Selector Bar -->
    <div class="pi-persona-bar">
      ${PERSONA_LIST.map(
        (p) => `
        <button class="pi-persona-chip ${p.id === currentActivePersona ? 'active' : ''}" data-persona="${p.id}">
          ${iconSvg(p.iconId)}
          <span>${escapeHtml(p.label)}</span>
        </button>
      `
      ).join('')}
    </div>

    <div id="piModalBody" class="pi-body">
      <div class="pi-skeleton-box">
        <div class="pi-spinner"></div>
        <div class="pi-loading-text">Đang tối ưu hóa prompt siêu tốc...</div>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  shadow.appendChild(backdrop);

  // Đóng Modal an toàn
  const closeBtn = modal.querySelector('#piBtnClose');
  closeBtn?.addEventListener('click', safelyCloseModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) safelyCloseModal();
  });

  // Đăng ký Escape Listener có cleanup
  currentEscListener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      safelyCloseModal();
    }
  };
  window.addEventListener('keydown', currentEscListener);

  // Gắn sự kiện chọn Persona
  modal.querySelectorAll<HTMLButtonElement>('.pi-persona-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const pId = chip.dataset.persona as PersonaId;
      if (pId && pId !== currentActivePersona) {
        openImproveModal(promptText, onApply, pId);
      }
    });
  });

  // Gắn sự kiện Nâng cấp Cloud AI (Async, không chặn giao diện)
  const upgradeBtn = modal.querySelector<HTMLButtonElement>('#piBtnUpgradeCloud');
  upgradeBtn?.addEventListener('click', async () => {
    if (upgradeBtn.disabled) return;
    upgradeBtn.disabled = true;
    const oldHtml = upgradeBtn.innerHTML;
    upgradeBtn.innerHTML = `${iconSvg('i-refresh', 'pi-icon-spin')} <span>Đang gọi AI...</span>`;

    try {
      const cloudRes = await MessageClient.send<PromptImproveResult>({
        type: 'PROMPT:IMPROVE',
        payload: { prompt: promptText, persona: currentActivePersona, mode: 'cloud' },
      });
      renderModalContent(modal, promptText, cloudRes, onApply);
    } catch (err: unknown) {
      upgradeBtn.disabled = false;
      const isRateLimit = String(err).includes('429') || String(err).includes('RATE_LIMIT') || String(err).includes('Quota');
      upgradeBtn.innerHTML = `${iconSvg('i-clock', 'pi-icon-warn')} <span>${isRateLimit ? 'AI 429 (Bận)' : 'AI không phản hồi'}</span>`;
      setTimeout(() => {
        upgradeBtn.innerHTML = oldHtml;
      }, 4000);
    }
  });

  try {
    // Gọi Instant Engine để phản hồi < 20ms
    const res = await MessageClient.send<PromptImproveResult>({
      type: 'PROMPT:IMPROVE',
      payload: { prompt: promptText, persona: currentActivePersona, mode: 'instant' },
    });

    renderModalContent(modal, promptText, res, onApply);
  } catch (err: unknown) {
    renderModalError(modal, promptText, err, onApply);
  }
}

function renderModalContent(
  modal: HTMLElement,
  originalPrompt: string,
  data: PromptImproveResult,
  onApply: (newPrompt: string) => void
): void {
  const body = modal.querySelector('#piModalBody');
  const taskBadge = modal.querySelector('#piTaskBadge');
  const engineBadge = modal.querySelector('#piEngineBadge');
  const cacheBadge = modal.querySelector('#piCacheBadge');
  const upgradeBtn = modal.querySelector<HTMLButtonElement>('#piBtnUpgradeCloud');
  if (!body) return;

  const task = TASK_TYPE_CONFIG[data.taskType] || TASK_TYPE_CONFIG.general;
  if (taskBadge) {
    taskBadge.innerHTML = `${iconSvg(task.iconId)} <span>${escapeHtml(task.label)}</span>`;
  }

  if (engineBadge) {
    if (data.engine === 'cloud') {
      engineBadge.className = 'pi-badge pi-badge-cloud';
      engineBadge.innerHTML = `${iconSvg('i-spark', 'pi-icon-ok')} <span>Gemini AI</span>`;
      if (upgradeBtn) upgradeBtn.style.display = 'none';
    } else {
      engineBadge.className = 'pi-badge pi-badge-instant';
      engineBadge.innerHTML = `${iconSvg('i-bolt', 'pi-icon-accent')} <span>Siêu tốc</span>`;
      if (upgradeBtn) {
        upgradeBtn.style.display = 'inline-flex';
        upgradeBtn.disabled = false;
        upgradeBtn.innerHTML = `${iconSvg('i-spark')} <span>Nâng cấp AI</span>`;
      }
    }
  }

  if (data.isCached && cacheBadge) {
    cacheBadge.innerHTML = `${iconSvg('i-bolt', 'pi-icon-ok')} <span>Cache</span>`;
    (cacheBadge as HTMLElement).style.display = 'inline-flex';
  } else if (cacheBadge) {
    (cacheBadge as HTMLElement).style.display = 'none';
  }

  const origTokens = estimateTokens(originalPrompt);
  const minTokens = estimateTokens(data.minimal || '');
  const detTokens = estimateTokens(data.detailed || '');

  const origScore = data.originalScore?.overallScore ?? 50;
  const impScore = data.detailedScore?.overallScore ?? 85;
  const deltaScore = impScore - origScore;

  body.innerHTML = `
    <!-- Score Dashboard -->
    <div class="pi-score-dashboard">
      <div class="pi-score-header">
        <div class="pi-score-title">${iconSvg('i-chart', 'pi-icon-accent')} Điểm chất lượng Prompt</div>
        <div class="pi-score-badge-group">
          <span class="pi-score-badge ${getScoreClass(origScore)}">Gốc: ${origScore}/100</span>
          <span>${iconSvg('i-arrow')}</span>
          <span class="pi-score-badge ${getScoreClass(impScore)}">Mới: ${impScore}/100</span>
          ${deltaScore > 0 ? `<span class="pi-score-delta">+${deltaScore} điểm</span>` : ''}
        </div>
      </div>

      <!-- Metrics Breakdown -->
      <div class="pi-metrics-grid">
        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Rõ ràng</span>
            <span>${data.detailedScore?.clarity ?? 80}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.clarity ?? 80}%"></div>
          </div>
        </div>

        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Bối cảnh</span>
            <span>${data.detailedScore?.context ?? 85}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.context ?? 85}%"></div>
          </div>
        </div>

        <div class="pi-metric-item">
          <div class="pi-metric-label">
            <span>Súc tích</span>
            <span>${data.detailedScore?.conciseness ?? 90}%</span>
          </div>
          <div class="pi-metric-bar">
            <div class="pi-metric-fill" style="width: ${data.detailedScore?.conciseness ?? 90}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompt Gốc Collapsible -->
    <details class="pi-original-box">
      <summary>${iconSvg('i-file')} Prompt gốc (${origTokens} tokens)</summary>
      <div class="pi-original-text">${escapeHtml(originalPrompt)}</div>
    </details>

    <!-- 2 Cards So Sánh -->
    <div class="pi-cards-grid">
      <!-- Card 1: Tối giản -->
      <div class="pi-card pi-card-minimal">
        <div class="pi-card-header">
          <div class="pi-card-title">${iconSvg('i-bolt', 'pi-icon-accent')} Phiên bản Tối giản</div>
          <div class="pi-card-stats">~${minTokens} tokens (${calcDiff(origTokens, minTokens)})</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.minimal)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.minimal)}">
            ${iconSvg('i-copy')} <span>Sao chép</span>
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.minimal)}">
            ${iconSvg('i-play')} <span>Dùng bản này</span>
          </button>
        </div>
      </div>

      <!-- Card 2: Chi tiết -->
      <div class="pi-card pi-card-detailed">
        <div class="pi-card-header">
          <div class="pi-card-title">${iconSvg('i-target', 'pi-icon-warn')} Phiên bản Chi tiết</div>
          <div class="pi-card-stats">~${detTokens} tokens</div>
        </div>
        <div class="pi-card-text">${escapeHtml(data.detailed)}</div>
        <div class="pi-card-actions">
          <button class="pi-btn pi-btn-copy" data-text="${encodeURIComponent(data.detailed)}">
            ${iconSvg('i-copy')} <span>Sao chép</span>
          </button>
          <button class="pi-btn pi-btn-apply" data-apply="${encodeURIComponent(data.detailed)}">
            ${iconSvg('i-play')} <span>Dùng bản này</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Assumptions Box -->
    ${
      data.assumptions && data.assumptions.length > 0
        ? `
      <div class="pi-assumptions-box">
        <div class="pi-assumptions-title">${iconSvg('i-bulb', 'pi-icon-warn')} Các giả định làm rõ từ AI:</div>
        <ul class="pi-assumptions-list">
          ${data.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }
  `;

  // Gắn sự kiện Sao chép
  body.querySelectorAll<HTMLButtonElement>('.pi-btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textToCopy = decodeURIComponent(btn.dataset.text || '');
      await navigator.clipboard.writeText(textToCopy);
      const prevHtml = btn.innerHTML;
      btn.innerHTML = `${iconSvg('i-check', 'pi-icon-ok')} <span>Đã chép!</span>`;
      btn.style.color = '#10b981';
      setTimeout(() => {
        btn.innerHTML = prevHtml;
        btn.style.color = '';
      }, 1500);
    });
  });

  // Gắn sự kiện Dùng bản này (Apply)
  body.querySelectorAll<HTMLButtonElement>('.pi-btn-apply').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPrompt = decodeURIComponent(btn.dataset.apply || '');
      onApply(newPrompt);
      safelyCloseModal();
    });
  });
}

function renderModalError(
  modal: HTMLElement,
  promptText: string,
  err: unknown,
  onApply: (newPrompt: string) => void
): void {
  const body = modal.querySelector('#piModalBody');
  const taskBadge = modal.querySelector('#piTaskBadge');
  if (!body) return;

  const errorMsg = err instanceof Error ? err.message : String(err);
  const isRateLimit = Boolean(
    (err as { isRateLimit?: boolean })?.isRateLimit ||
      errorMsg.includes('429') ||
      errorMsg.includes('RATE_LIMIT') ||
      errorMsg.includes('Quota') ||
      errorMsg.includes('giới hạn')
  );

  const retrySeconds = (err as { retryAfterSeconds?: number })?.retryAfterSeconds || 15;

  if (isRateLimit) {
    if (taskBadge) {
      taskBadge.innerHTML = `${iconSvg('i-clock', 'pi-icon-warn')} Giới hạn API (429)`;
    }
    body.innerHTML = `
      <div class="pi-ratelimit-box">
        <h4>${iconSvg('i-clock', 'pi-icon-warn')} Tạm thời chạm giới hạn Gemini API</h4>
        <p>Hạn mức yêu cầu miễn phí (Free Tier) đang tạm thời quá tải hoặc đang trong chu kỳ hồi phục (RPM/RPD).</p>
        <div class="pi-ratelimit-tip">
          ${iconSvg('i-bulb', 'pi-icon-warn')} <strong>Gợi ý:</strong> Vui lòng đợi khoảng <strong>${escapeHtml(String(retrySeconds))} giây</strong> rồi bấm nút <em>"Thử lại ngay"</em> hoặc thử lại sau.
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">${iconSvg('i-retry')} Thử lại ngay</button>` : ''}
      </div>
    `;
  } else {
    if (taskBadge) {
      taskBadge.innerHTML = `${iconSvg('i-x-circle', 'pi-icon-danger')} Lỗi`;
    }
    body.innerHTML = `
      <div class="pi-error-box">
        <h4>${iconSvg('i-x-circle', 'pi-icon-danger')} Không thể cải thiện prompt</h4>
        <p>${escapeHtml(errorMsg)}</p>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button class="pi-btn pi-btn-copy pi-btn-error-close">Đóng</button>
        ${promptText ? `<button class="pi-btn pi-btn-insert pi-btn-error-retry" id="piBtnErrorRetry">${iconSvg('i-retry')} Thử lại ngay</button>` : ''}
      </div>
    `;
  }

  body.querySelector('.pi-btn-error-close')?.addEventListener('click', safelyCloseModal);
  if (promptText) {
    body.querySelector('#piBtnErrorRetry')?.addEventListener('click', () => {
      openImproveModal(promptText, onApply, currentActivePersona);
    });
  }
}
