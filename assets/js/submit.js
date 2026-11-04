(() => {
  const form = document.querySelector('#submission-form');
  const category = document.querySelector('#category');
  const fields = document.querySelector('#dynamic-fields');
  const preview = document.querySelector('#preview');
  const previewText = document.querySelector('#preview-text');
  const button = document.querySelector('#preview-button');
  const submitButton = document.querySelector('#submit-button');
  const submitStatus = document.querySelector('#submission-status');
  const submitNotice = document.querySelector('#submission-notice');
  const submissionConfig = window.UEM_SUBMISSION_CONFIG || {};
  const draftStatus = document.querySelector('#draft-status');
  const draftKey = 'uem-draft-v1';
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  };
  fetch('data/schema.json').then(response => {
    if (!response.ok) throw new Error('Could not load schema');
    return response.json();
  }).then(schema => {
    for (const item of schema.categories) {
      const option = make('option', item.label);
      option.value = item.id;
      category.append(option);
    }
    category.required = true;
    const controls = new Map();
    let bodyPreview = null;
    let bodyPreviewButton = null;
    for (const field of schema.fields) {
      const wrapper = make('div');
      wrapper.className = 'field';
      const label = make('label', field.label + (field.required ? ' *' : '（选填）'));
      label.htmlFor = field.name;
      const control = make(field.type === 'textarea' ? 'textarea' : 'input');
      control.id = field.name;
      control.name = field.name;
      control.required = Boolean(field.required);
      if (field.type !== 'textarea') control.type = field.type;
      if (field.maxLength) control.maxLength = field.maxLength;
      if (field.placeholder) control.placeholder = field.placeholder;
      if (field.inputMode) control.inputMode = field.inputMode;
      if (field.pattern) control.pattern = field.pattern;
      if (field.type === 'textarea') control.rows = 2;
      wrapper.append(label);
      if (field.suffix) {
        const inputRow = make('div');
        inputRow.className = 'input-suffix';
        inputRow.append(control, make('span', field.suffix));
        wrapper.append(inputRow);
      } else {
        wrapper.append(control);
      }
      if (field.hint) {
        const hint = make('small', field.hint);
        hint.className = 'field-hint';
        hint.id = field.name + '-hint';
        control.setAttribute('aria-describedby', hint.id);
        wrapper.append(hint);
      }
      if (field.name === 'body') {
        const toolbar = make('div');
        toolbar.className = 'markdown-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', '正文排版快捷操作');
        const actions = [
          ['正文', 'plain'], ['H1', 'h1'], ['H2', 'h2'], ['H3', 'h3'],
          ['加粗', 'bold'], ['斜体', 'italic'], ['无序列表', 'ul'],
          ['有序列表', 'ol'], ['引用', 'quote']
        ];
        const apply = kind => {
          const start = control.selectionStart;
          const end = control.selectionEnd;
          const selected = control.value.slice(start, end);
          const lineStart = control.value.lastIndexOf('\n', start - 1) + 1;
          let from = start, to = end, replacement = '', selectStart = 0, selectEnd = 0;
          if (kind === 'plain') {
            from = lineStart;
            const before = control.value.slice(from, start);
            const prefix = /^(?:#{1,3} |[-*] |\d+\. |> )/.exec(before)?.[0] || '';
            if (!prefix) { control.focus(); return; }
            replacement = before.slice(prefix.length) + selected;
            selectStart = before.length - prefix.length;
            selectEnd = selectStart + selected.length;
          } else if (kind === 'bold' || kind === 'italic') {
            const sample = selected || (kind === 'bold' ? '加粗文字' : '斜体文字');
            replacement = kind === 'bold' ? '**' + sample + '**' : '*' + sample + '*';
            selectStart = kind === 'bold' ? 2 : 1;
            selectEnd = selectStart + sample.length;
          } else {
            from = lineStart;
            const prefix = { h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', quote: '> ' }[kind];
            const before = control.value.slice(from, start);
            const lineText = before + (selected || '在这里输入内容');
            replacement = prefix + lineText;
            selectStart = prefix.length + before.length;
            selectEnd = selectStart + (selected || '在这里输入内容').length;
          }
          control.setRangeText(replacement, from, to, 'end');
          control.focus();
          control.setSelectionRange(from + selectStart, from + selectEnd);
          control.dispatchEvent(new Event('input', { bubbles: true }));
        };
        for (const [label, kind] of actions) {
          const action = make('button', label);
          action.type = 'button';
          action.className = 'markdown-action';
          action.setAttribute('aria-label', label);
          action.addEventListener('click', () => {
            if (bodyPreview && !bodyPreview.hidden) bodyPreviewButton.click();
            apply(kind);
          });
          toolbar.append(action);
        }
        bodyPreview = make('div');
        bodyPreview.className = 'markdown-preview article-body';
        bodyPreview.hidden = true;
        bodyPreview.setAttribute('aria-label', '正文排版预览');
        bodyPreviewButton = make('button', '预览排版');
        bodyPreviewButton.type = 'button';
        bodyPreviewButton.className = 'markdown-action markdown-preview-toggle';
        bodyPreviewButton.setAttribute('aria-pressed', 'false');
        bodyPreviewButton.addEventListener('click', () => {
          const showing = bodyPreview.hidden;
          if (showing) renderMarkdown(control.value, bodyPreview);
          bodyPreview.hidden = !showing;
          control.closest('.textarea-holder').hidden = showing;
          bodyPreviewButton.textContent = showing ? '返回编辑' : '预览排版';
          bodyPreviewButton.setAttribute('aria-pressed', String(showing));
          if (!showing) control.focus();
        });
        toolbar.append(bodyPreviewButton);
        wrapper.insertBefore(toolbar, control);
        control.after(bodyPreview);
        const demoActions = make('div');
        demoActions.className = 'demo-actions';
        const loadDemo = make('button', '载入示例');
        loadDemo.type = 'button';
        loadDemo.className = 'markdown-action';
        const clearBody = make('button', '清空正文');
        clearBody.type = 'button';
        clearBody.className = 'markdown-action';
        loadDemo.addEventListener('click', async () => {
          if (control.value.trim() && !confirm('载入示例会替换当前正文，确认继续吗？')) return;
          try {
            const response = await fetch('data/demo-submission.md');
            if (!response.ok) throw new Error('Demo unavailable');
            control.value = await response.text();
            control.dispatchEvent(new Event('input', { bubbles: true }));
            if (bodyPreview.hidden) bodyPreviewButton.click();
            else renderMarkdown(control.value, bodyPreview);
          } catch { draftStatus.textContent = '示例加载失败，请稍后重试。'; }
        });
        clearBody.addEventListener('click', () => {
          if (control.value.trim() && !confirm('确定清空正文吗？')) return;
          control.value = '';
          control.dispatchEvent(new Event('input', { bubbles: true }));
          if (!bodyPreview.hidden) bodyPreviewButton.click();
          control.focus();
        });
        demoActions.append(loadDemo, clearBody);
        wrapper.insertBefore(demoActions, toolbar);
        const guidance = make('small', '可直接粘贴 Markdown；也可以载入示例学习写作，再一键清空。');
        guidance.className = 'field-hint';
        wrapper.append(guidance);
      }
      fields.append(wrapper);
      controls.set(field.name, control);
    }
    // Touch browsers do not expose the native textarea resize grip.
    // Size each field to its wrapped placeholder, leaving room for the drag handle.
    // Never allow the handle to cover the placeholder when dragged upward.
    for (const control of controls.values()) {
      if (control.tagName !== 'TEXTAREA') continue;
      const grip = make('button', '↘');
      grip.type = 'button';
      grip.className = 'textarea-grip';
      grip.setAttribute('aria-label', '拖动调整输入框高度');
      const holder = make('div');
      holder.className = 'textarea-holder';
      control.replaceWith(holder);
      holder.append(control, grip);
      let minimum = 0;
      let manuallyResized = false;
      const measure = () => {
        const probe = control.cloneNode();
        probe.value = '';
        probe.rows = 1;
        probe.style.height = 'auto';
        probe.style.minHeight = '0';
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.pointerEvents = 'none';
        probe.style.resize = 'none';
        holder.append(probe);
        // scrollHeight accounts for wrapped placeholder text and textarea padding.
        minimum = Math.ceil(probe.scrollHeight + 14);
        probe.remove();
        control.style.minHeight = minimum + 'px';
        if (!manuallyResized) control.style.height = minimum + 'px';
        else if (control.getBoundingClientRect().height < minimum) control.style.height = minimum + 'px';
      };
      measure();
      window.addEventListener('resize', measure);
      let startY = 0, startHeight = 0;
      grip.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        startY = event.clientY;
        startHeight = control.getBoundingClientRect().height;
        grip.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      grip.addEventListener('pointermove', event => {
        if (!grip.hasPointerCapture(event.pointerId)) return;
        manuallyResized = true;
        control.style.height = Math.max(minimum, startHeight + event.clientY - startY) + 'px';
      });
      for (const name of ['pointerup', 'pointercancel']) grip.addEventListener(name, event => {
        if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
      });
    }
    const year = controls.get('year');
    year.addEventListener('input', () => {
      const clean = year.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (year.value !== clean) year.value = clean;
    });
    const updateCategory = () => {
      for (const name of ['destination', 'program']) {
        const definition = schema.fields.find(field => field.name === name);
        controls.get(name).placeholder = definition.placeholders[category.value] || '';
      }
    };
    category.addEventListener('change', updateCategory);
    updateCategory();

    const hidePreview = () => { preview.hidden = true; };
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (draft) {
        for (const [name, value] of Object.entries(draft)) {
          const control = name === 'category' ? category : controls.get(name);
          if (control && name !== 'contact' && typeof value === 'string') control.value = value;
        }
        draftStatus.textContent = '已恢复当前标签页的草稿（不含联系方式），尚未提交。';
      }
    } catch {}
    updateCategory();
    const save = () => {
      hidePreview();
      if (bodyPreview && !bodyPreview.hidden) renderMarkdown(controls.get('body').value, bodyPreview);
      try {
        const values = Object.fromEntries(new FormData(form));
        delete values.contact;
        sessionStorage.setItem(draftKey, JSON.stringify(values));
      } catch { draftStatus.textContent = '无法暂存草稿，请自行备份。'; }
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    form.addEventListener('reset', () => {
      hidePreview();
      if (bodyPreview && !bodyPreview.hidden) bodyPreviewButton.click();
      try { sessionStorage.removeItem(draftKey); } catch {}
      draftStatus.textContent = '草稿已清空，尚未提交。';
      requestAnimationFrame(() => {
        updateCategory();
      });
    });
    const renderMarkdown = (source, target) => {
      if (!window.marked || !window.DOMPurify) {
        target.textContent = '预览组件暂不可用，请检查网络后刷新。';
        return;
      }
      // Never trust the Markdown input or allow embedded HTML to execute.
      const safeSource = source.replace(/<(?=[a-z!/])/gi, '&lt;');
      target.innerHTML = DOMPurify.sanitize(marked.parse(safeSource, { gfm: true, breaks: false }), {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'iframe', 'form'],
        FORBID_ATTR: ['style']
      });
      target.querySelectorAll('a').forEach(link => {
        link.rel = 'noopener noreferrer';
      });
    };
    button.addEventListener('click', () => {
      for (const field of schema.fields) {
        const control = controls.get(field.name);
        control.setCustomValidity(field.required && !control.value.trim() ? '请填写' + field.label : '');
      }
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const selected = schema.categories.find(item => item.id === data.get('category'));
      if (!selected) return;
      const author = String(data.get('author') || '').trim();
      const destination = String(data.get('destination') || '').trim();
      const program = String(data.get('program') || '').trim();
      const title = author + ' — ' + destination + (program ? ' · ' + program : '');
      previewText.replaceChildren(make('h1', title));
      const byline = make('p', [selected.label, String(data.get('year')) + ' 届'].join(' · '));
      byline.className = 'article-byline';
      previewText.append(byline);
      const body = make('div');
      body.className = 'article-body';
      renderMarkdown(String(data.get('body') || ''), body);
      previewText.append(body);
      const contact = String(data.get('contact') || '').trim();
      if (contact) {
        const aside = make('aside');
        aside.className = 'article-contact';
        aside.append(make('strong', '联系作者'), make('p', contact));
        previewText.append(aside);
      }
      preview.hidden = false;
      preview.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    for (const control of controls.values()) control.addEventListener('input', () => control.setCustomValidity(''));

    // Submission transport is separate from Markdown preview. No browser-side secret.
    const endpoint = submissionConfig.apiEndpoint;
    const siteKey = submissionConfig.turnstileSiteKey;
    let widgetId = null;
    let busy = false;
    const configured = (() => {
      try {
        const url = new URL(endpoint);
        return url.protocol === 'https:' && url.pathname.endsWith('/submit') &&
          typeof siteKey === 'string' && siteKey.length > 10;
      } catch { return false; }
    })();
    const setStatus = (message, state = 'info') => {
      submitStatus.textContent = message;
      submitStatus.dataset.state = state;
    };
    if (configured) {
      submitNotice.querySelector('strong').textContent = '投稿将创建公开 GitHub Issue';
      setStatus('请先完成人机验证，再检查并提交内容。');
      const turnstileScript = document.createElement('script');
      turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      turnstileScript.async = true;
      turnstileScript.onload = () => {
        if (!window.turnstile) { setStatus('人机验证组件未能加载，请刷新后重试。', 'error'); return; }
        widgetId = turnstile.render('#turnstile-container', {
          sitekey: siteKey,
          action: 'uem_submit',
          callback: () => { submitButton.disabled = false; setStatus('验证完成，可以提交。'); },
          'expired-callback': () => {
            submitButton.disabled = true; setStatus('验证已过期，请重新验证。', 'error');
          },
          'error-callback': () => {
            submitButton.disabled = true; setStatus('人机验证失败，请重试。', 'error');
          }
        });
      };
      turnstileScript.onerror = () => setStatus('暂时无法加载人机验证，请检查网络。', 'error');
      document.head.append(turnstileScript);
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!configured || busy || widgetId === null || submitButton.disabled) return;
      for (const field of schema.fields) {
        const control = controls.get(field.name);
        control.setCustomValidity(field.required && !control.value.trim() ? '请填写' + field.label : '');
      }
      if (!form.reportValidity()) return;
      if (controls.get('body').value.trim().length < 20) {
        controls.get('body').setCustomValidity('请至少填写 20 个字符的真实经历。');
        form.reportValidity(); return;
      }
      const token = turnstile.getResponse(widgetId);
      if (!token) { setStatus('请重新完成人机验证。', 'error'); return; }
      // Any public contact data is displayed and stored in the GitHub Issue.
      if (!confirm('投稿内容（包含可选联系方式）将立即公开在 GitHub Issue 中。确认提交吗？')) return;
      const values = Object.fromEntries(new FormData(form));
      const payload = {version: 1, category: values.category, ...Object.fromEntries(schema.fields.map(field =>
        [field.name, String(values[field.name] || '').trim()])), turnstileToken: token};
      busy = true; submitButton.disabled = true;
      setStatus('正在提交至 GitHub，请勿重复操作。');
      try {
        const response = await fetch(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw Error(result.message || '投稿失败');
        if (!/^https:\/\/github\.com\/UEM-Feiyue\/UEM-Feiyue\.github\.io\/issues\/\d+$/.test(result.issueUrl || ''))
          throw Error('返回的 Issue 地址不合法');
        try { sessionStorage.removeItem(draftKey); } catch {}
        setStatus('已提交到 GitHub，等待维护者审核。', 'success');
        const link = make('a', '查看公开投稿 Issue');
        link.href = result.issueUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        submitStatus.append(' ', link);
      } catch (error) {
        setStatus((error.message || '提交失败') + '。请先检查 GitHub Issues 是否已经创建，避免重复投稿。', 'error');
      } finally {
        busy = false;
        if (window.turnstile && widgetId !== null) turnstile.reset(widgetId);
      }
    });
  }).catch(() => {
    fields.textContent = '表单加载失败，请刷新重试。';
    button.disabled = true;
  });
})();
