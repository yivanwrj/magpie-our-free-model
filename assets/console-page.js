import { mountModels } from './magpie-models.js';

class OfmManagement extends HTMLElement {
  async connectedCallback() {
    this.controller?.abort();
    const controller = this.controller = new AbortController();
    try {
      const response = await fetch('/assets/magpie-console.html', { signal: controller.signal });
      if (!response.ok) throw new Error('管理页面资源加载失败');
      const template = await response.text();
      if (controller.signal.aborted || !this.isConnected) return;
      // Only a bundled, same-origin template is parsed; API content and logs
      // are always inserted as text by mountModels.
      this.innerHTML = template;
      const maintenance = this.getAttribute('page') === 'maintenance';
      this.querySelectorAll('[data-console-page]').forEach(node => {
        node.hidden = node.dataset.consolePage !== (maintenance ? 'maintenance' : 'providers');
      });
      this.querySelector('h1').textContent = maintenance ? '更新与健康监测' : '渠道与模型';
      this.querySelector('[data-description]').textContent = maintenance
        ? '统一管理上游更新与模型探测，与服务设置共用开关和刷新间隔。'
        : '配置匿名与官方 API 渠道，查看与模型清单一致的健康状态。';
      this.querySelector('[data-other-page]').onclick = () => {
        const label = maintenance ? '渠道与模型' : '更新与健康监测';
        [...document.querySelectorAll('.console-nav-item')].find(button => button.textContent.trim() === label)?.click();
      };
      this.querySelector('[data-other-page]').textContent = maintenance ? '渠道与模型' : '更新与健康监测';
      mountModels(this, { signal: controller.signal });
    } catch (error) {
      if (!controller.signal.aborted) this.textContent = error.message;
    }
  }
  disconnectedCallback() { this.controller?.abort(); }
}
if (!customElements.get('ofm-management')) customElements.define('ofm-management', OfmManagement);
