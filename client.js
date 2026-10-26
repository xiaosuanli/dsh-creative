window.__ModuleLoader__.load({
  id: '@xiaosuanli/dsh-plugin',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    // Official brand artwork, resized for the bundled UI.
    const brandLogo = "data:image/png;base64,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";
    const styles = `
      .xsl-dir { --xsl-text: var(--dsw-alias-label-primary, #eee); --xsl-muted: var(--dsw-alias-label-tertiary, #929292); --xsl-line: var(--dsw-alias-border-l2, #383838); --xsl-surface: var(--dsw-alias-interactive-bg-hover, #242424); --xsl-accent: var(--dsw-alias-brand-primary, #597ef7); color: var(--xsl-text); font-family: var(--dsw-font-family, inherit); font-size: 13px; line-height: 1.55; box-sizing: border-box; }
      .xsl-dir *, .xsl-dir *::before, .xsl-dir *::after { box-sizing: border-box; }
      .xsl-dir h2, .xsl-dir h3, .xsl-dir p { margin: 0; }
      .xsl-dir button, .xsl-dir input, .xsl-dir select { font: inherit; }
      .xsl-dir button, .xsl-dir a, .xsl-dir input, .xsl-dir select, .xsl-dir summary { -webkit-app-region: no-drag; }
      .xsl-dir button { cursor: pointer; }
      .xsl-dir button:disabled { cursor: default; opacity: .42; }
      .xsl-dir button:focus-visible, .xsl-dir a:focus-visible, .xsl-dir summary:focus-visible, .xsl-dir input:focus-visible, .xsl-dir select:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--xsl-accent)); outline-offset: 3px; }
      .xsl-dir svg { display: block; flex: none; }
      .xsl-panel { width: 100%; height: 100%; min-width: 0; min-height: 0; overflow-y: auto; scrollbar-width: thin; padding: 20px 18px 18px; }
      .xsl-floating { position: absolute; right: 22px; bottom: 22px; z-index: 1; pointer-events: auto; }
      .xsl-launcher { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 16px 0 12px; margin-left: auto; border: 1px solid #91b1c42e; border-radius: 24px; background: color-mix(in srgb, var(--dsw-alias-bg-base, #202020) 94%, #b8d6ef); color: var(--xsl-text); box-shadow: 0 3px 14px #3b66851a; transition: border-color .15s, box-shadow .15s; }
      .xsl-launcher > svg { color: #d99b62; }
      .xsl-launcher:hover { border-color: #7ba4c47a; box-shadow: 0 5px 18px #3b668524; }
      .xsl-launcher[aria-expanded=true] { border-color: #8ab5d455; }
      .xsl-dir .xsl-launcher:focus-visible { outline: 2px solid #95b9d566; outline-offset: 3px; }
      .xsl-popover { position: absolute; right: 0; bottom: 56px; width: min(390px, calc(100vw - 32px)); max-height: calc(100dvh - 110px); overflow-y: auto; overscroll-behavior: contain; border: 1px solid var(--xsl-line); border-radius: 16px; background: var(--dsw-alias-bg-base, #202020); box-shadow: 0 12px 48px #0004; }
      .xsl-popover[hidden] { display: none; }
      .xsl-popover .xsl-panel { height: auto; overflow: visible; }
      @media (max-width: 480px) { .xsl-floating { right: 16px; bottom: 16px; } }
      .xsl-brand { display: flex; align-items: center; gap: 10px; }
      .xsl-brandmark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: #d99b62; background: color-mix(in srgb, #d99b62 12%, transparent); flex: none; }
      .xsl-brand h3 { font-size: 15px; font-weight: 600; letter-spacing: -.2px; }
      .xsl-brand p { margin-top: 2px; color: var(--xsl-muted); font-size: 11px; }
      .xsl-toolbar { display: flex; gap: 3px; margin-left: auto; align-self: flex-start; }
      .xsl-icon-button { border: 0; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 6px; color: var(--xsl-muted); background: transparent; transition: background .15s, color .15s; }
      .xsl-icon-button:hover:not(:disabled) { color: var(--xsl-text); background: var(--xsl-surface); }
      .xsl-steps { display: flex; align-items: center; gap: 7px; padding: 20px 0 22px; color: var(--xsl-muted); font-size: 11px; }
      .xsl-step { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
      .xsl-step > span { width: 18px; height: 18px; border: 1px solid var(--xsl-line); border-radius: 50%; display: grid; place-items: center; font-size: 10px; }
      .xsl-step[data-active=true] { color: var(--xsl-text); }
      .xsl-step[data-active=true] > span { background: var(--xsl-surface); border-color: var(--xsl-muted); }
      .xsl-step[data-done=true] > span { background: color-mix(in srgb, var(--xsl-accent) 12%, transparent); color: var(--xsl-accent); border-color: transparent; }
      .xsl-step-line { height: 1px; min-width: 8px; flex: 1; background: var(--xsl-line); }
      .xsl-fields { display: grid; gap: 16px; }
      .xsl-field { display: grid; gap: 7px; min-width: 0; }
      .xsl-label { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; font-weight: 500; }
      .xsl-count { color: var(--xsl-muted); font-weight: 400; font-size: 11px; }
      .xsl-choice { display: grid; gap: 5px; min-width: 0; }
      .xsl-choice-trigger, .xsl-code { width: 100%; min-width: 0; color: var(--xsl-text); background: var(--dsw-alias-bg-base, transparent); border: 1px solid var(--xsl-line); border-radius: 10px; height: 42px; transition: border-color .15s, background .15s; }
      .xsl-choice-trigger { display: flex; align-items: center; gap: 10px; padding: 0 12px; text-align: left; }
      .xsl-choice-trigger:hover:not(:disabled), .xsl-code:hover:not(:disabled) { border-color: var(--xsl-muted); }
      .xsl-choice-trigger[aria-expanded=true] { border-color: #729bb5; box-shadow: 0 0 0 2px #729bb514; }
      .xsl-choice-trigger:disabled { opacity: .4; cursor: not-allowed; }
      .xsl-choice-trigger svg { color: var(--xsl-muted); }
      .xsl-choice-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .xsl-choice-title[data-placeholder=true] { color: var(--xsl-muted); }
      .xsl-choice-trigger .xsl-chevron { transition: transform .15s; }
      .xsl-choice-trigger[aria-expanded=true] .xsl-chevron { transform: rotate(180deg); }
      .xsl-choice-menu { display: grid; gap: 3px; max-height: min(220px, 35dvh); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 5px; border: 1px solid var(--xsl-line); border-radius: 11px; background: var(--dsw-alias-bg-base, #202020); box-shadow: 0 4px 16px #284b6412; }
      .xsl-choice-option { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 36px; border: 0; border-radius: 7px; padding: 8px 10px; background: transparent; color: var(--xsl-text); text-align: left; line-height: 1.5; }
      .xsl-choice-option > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .xsl-choice-option:hover, .xsl-choice-option[data-active=true] { background: var(--xsl-surface); }
      .xsl-choice-option[aria-selected=true] { background: color-mix(in srgb, #6b9fbe 14%, var(--dsw-alias-bg-base, #202020)); }
      .xsl-choice-option[aria-selected=true] svg { color: #6b9fbe; }
      .xsl-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 42px; padding: 10px 14px; background: var(--xsl-accent); color: var(--dsw-alias-label-primary-foreground, #fff); border: 0; border-radius: 9px; font-weight: 500; transition: filter .15s, transform .15s; }
      .xsl-primary:hover:not(:disabled) { filter: brightness(1.1); }
      .xsl-primary:active:not(:disabled) { transform: translateY(1px); }
      .xsl-hint { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; color: var(--xsl-muted); line-height: 1.7; margin-top: 11px !important; }
      .xsl-hint svg { margin-top: 2px; }
      .xsl-account { min-width: 0; }
      .xsl-panel > .xsl-account { border-top: 1px solid var(--xsl-line); margin-top: 22px; padding-top: 18px; }
      .xsl-onboarding { margin-top: 16px; padding: 12px; border: 1px solid var(--xsl-line); border-radius: 10px; font-size: 12px; }
      .xsl-onboarding summary { cursor: pointer; font-weight: 500; }
      .xsl-onboarding ol { margin: 10px 0 0; padding-left: 19px; color: var(--xsl-muted); }
      .xsl-onboarding li + li { margin-top: 8px; }
      .xsl-onboarding q { display: block; margin-top: 4px; color: var(--xsl-text); user-select: text; }
      .xsl-account-page { padding: 24px; max-width: 560px; }
      .xsl-account-heading { font-size: 18px; font-weight: 600; margin-bottom: 6px !important; }
      .xsl-description { font-size: 12px; color: var(--xsl-muted); line-height: 1.8; }
      .xsl-account-summary { list-style: none; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; }
      .xsl-account-summary::-webkit-details-marker { display: none; }
      .xsl-account-summary > .xsl-chevron { margin-left: 4px; color: var(--xsl-muted); transition: transform .15s; }
      .xsl-account-details[open] > summary > .xsl-chevron { transform: rotate(180deg); }
      .xsl-status { display: inline-flex; align-items: center; gap: 5px; color: var(--xsl-muted); font-size: 10px; margin-left: auto; }
      .xsl-status::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #65b88c; }
      .xsl-account-body { display: grid; gap: 14px; padding-top: 16px; }
      .xsl-account-identity { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .xsl-account-name { font-size: 12px; font-weight: 500; }
      .xsl-plan { border: 1px solid var(--xsl-line); border-radius: 5px; padding: 1px 6px; font-size: 10px; color: var(--xsl-muted); }
      .xsl-credits { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--xsl-line); border-radius: 10px; overflow: hidden; }
      .xsl-credit { min-width: 0; display: grid; gap: 3px; padding: 12px; }
      .xsl-credit + .xsl-credit { border-left: 1px solid var(--xsl-line); }
      .xsl-credit span { color: var(--xsl-muted); font-size: 11px; }
      .xsl-credit strong { font-size: 21px; line-height: 1.5; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }
      .xsl-quota { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px; color: var(--xsl-muted); font-size: 11px; }
      .xsl-account-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 14px; }
      .xsl-text-button { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; background: transparent; border: 0; padding: 3px 0; color: var(--xsl-muted); }
      .xsl-text-button:hover:not(:disabled) { color: var(--xsl-text); }
      .xsl-text-button.xsl-disconnect:hover:not(:disabled) { color: #d65c5c; }
      .xsl-connect-card { display: grid; gap: 14px; padding: 18px; border: 1px solid var(--xsl-line); border-radius: 12px; }
      .xsl-connect-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
      .xsl-login { display: grid; gap: 13px; padding: 15px; border: 1px solid var(--xsl-line); border-radius: 10px; margin-top: 14px; }
      .xsl-login a { display: inline-flex; align-items: center; gap: 7px; color: var(--xsl-accent); text-decoration: none; font-size: 12px; }
      .xsl-login a:hover { text-decoration: underline; }
      .xsl-login-actions { display: flex; flex-wrap: wrap; gap: 8px 14px; }
      .xsl-login-url { width: 100%; min-width: 0; height: 36px; padding: 8px; font-size: 11px; user-select: text; }
      .xsl-code { height: 38px; padding: 8px 11px; }
      .xsl-message { display: flex; align-items: flex-start; gap: 7px; padding: 10px 12px; margin: 12px 0; border-radius: 8px; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; background: color-mix(in srgb, #d65c5c 8%, transparent); color: #d65c5c; }
      .xsl-message[data-kind=notice] { color: var(--xsl-muted); background: var(--xsl-surface); }
      .xsl-loading { display: flex; align-items: center; gap: 7px; color: var(--xsl-muted); font-size: 11px; padding-top: 9px; }
      .xsl-spin { animation: xsl-spin 1s linear infinite; }
      @keyframes xsl-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .xsl-dir *, .xsl-dir *::before, .xsl-dir *::after { animation: none !important; transition: none !important; } }
    `;
    const paths = {
      folder: ['M3 7V5a2 2 0 012-2h5l2 3h7a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'],
      film: ['M4 3h16v18H4zM4 7h16M4 17h16M8 3v4M16 3v4M8 17v4M16 17v4'],
      chat: ['M21 11.5a8.5 8.5 0 01-8.5 8.5H4l-1 1v-9.5A8.5 8.5 0 1121 11.5zM8 10h8M8 14h5'],
      refresh: ['M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0111.6-1L20 9M4 15l2.3 3a7 7 0 0011.6-1'],
      close: ['M6 6l12 12M18 6L6 18'],
      chevron: ['M6 9l6 6 6-6'], check: ['M5 12l4 4L19 6'],
      info: ['M12 8h.01M12 11v5', 'M22 12a10 10 0 11-20 0 10 10 0 0120 0'],
      user: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M16 7a4 4 0 11-8 0 4 4 0 018 0'],
      link: ['M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-2 2M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l2-2'],
      arrow: ['M5 12h14M14 7l5 5-5 5'],
    };
    function Icon({ name, size = 16, className = '' }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className },
      ...(paths[name] || paths.info).map((d, key) => h('path', { d, key })));
    }
    const format = value => typeof value === 'number' ? value.toLocaleString() : '暂不可用';
    const accountName = value => /^1\d{10}$/.test(value || '') ? value.slice(0, 3) + '****' + value.slice(-4) : value || '小算狸账号';
    const message = (text, kind) => text && h('div', { className: 'xsl-message', role: kind === 'notice' ? 'status' : 'alert', 'data-kind': kind }, h(Icon, { name: 'info' }), text);
    const primary = (label, props, icon = 'arrow') => h('button', { className: 'xsl-primary', ...props }, h(Icon, { name: icon }), label);
    const openAuthorizationPage = (url, popup) => {
      try {
        const destination = new URL(url);
        if (!['https:', 'http:'].includes(destination.protocol) || destination.username || destination.password) throw new Error('Invalid authorization URL');
        if (popup && !popup.closed) popup.location.replace(destination.href);
        else {
          const opened = window.open(destination.href, '_blank', 'noopener,noreferrer');
          // Electron handles the HTTPS URL in its main process, denies the new
          // in-app window and returns null even when the external open succeeds.
          if (!opened && window.location?.protocol !== 'dsh-app:') return '浏览器可能阻止了新窗口，请点击打开或复制授权链接。';
        }
        return '已请求打开授权页面；若浏览器未打开，请复制授权链接到系统浏览器。';
      } catch {
        try { popup?.close(); } catch { /* the host may already have closed it */ }
        return '未能打开浏览器，请复制授权链接到系统浏览器继续。';
      }
    };
    function AccountSection({ rpc, compact = false, onConnectionChange }) {
      const [state, setState] = React.useState(null);
      const [account, setAccount] = React.useState(null);
      const [login, setLogin] = React.useState(null);
      const [code, setCode] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [browserNotice, setBrowserNotice] = React.useState('');
      const refresh = async () => {
        setAccount(null);
        const status = await rpc('refresh');
        setState(status); onConnectionChange?.(status.connected);
        if (status.connected) setAccount(await rpc('account'));
      };
      React.useEffect(() => {
        let mounted = true;
        rpc('status').then(async status => {
          if (!mounted) return;
          setState(status); onConnectionChange?.(status.connected);
          if (status.connected) { const value = await rpc('account'); if (mounted) setAccount(value); }
        }).catch(err => { if (mounted) setError(err.message); });
        return () => { mounted = false; };
      }, [rpc, onConnectionChange]);
      const run = fn => async () => {
        setBusy(true); setError('');
        try { await fn(); } catch (err) { setError(err.message); }
        finally { setBusy(false); }
      };
      const begin = run(async () => {
        setLogin(null); setCode(''); setBrowserNotice('');
        let popup = null;
        // Web needs the user gesture before the RPC; Desktop rejects blank
        // windows, so send its final HTTPS URL directly after the RPC instead.
        if (window.location?.protocol !== 'dsh-app:') {
          try { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null; } catch { /* retain the copy-link route */ }
        }
        let attempt;
        try { attempt = await rpc('begin-login'); }
        catch (error) { try { popup?.close(); } catch {} throw error; }
        setLogin(attempt);
        setBrowserNotice(openAuthorizationPage(attempt.url, popup));
      });
      const copyLogin = async () => {
        try {
          await navigator.clipboard.writeText(login.url);
          setBrowserNotice('授权链接已复制，请粘贴到系统浏览器完成授权。');
        } catch {
          setBrowserNotice('未能访问剪贴板，请选中下方授权链接手动复制到系统浏览器。');
        }
      };
      const finish = run(async () => {
        const entered = code; setCode('');
        await rpc('complete-login', { code: entered, state: login.state });
        setLogin(null); await refresh();
      });
      const disconnect = run(async () => {
        await rpc('disconnect'); setAccount(null); setLogin(null); setState({ connected: false }); setCode(''); onConnectionChange?.(false);
      });
      const loginForm = login && h('div', { className: 'xsl-login' },
        h('div', { className: 'xsl-login-actions' },
          h('button', { type: 'button', className: 'xsl-text-button', disabled: busy,
            onClick: () => setBrowserNotice(openAuthorizationPage(login.url)) }, h(Icon, { name: 'link', size: 14 }), '打开小算狸登录与授权页面'),
          h('button', { type: 'button', className: 'xsl-text-button', disabled: busy, onClick: copyLogin }, '复制授权链接')),
        message(browserNotice, 'notice'),
        h('input', { className: 'xsl-login-url', 'aria-label': '授权链接', value: login.url, readOnly: true,
          onFocus: event => event.target.select() }),
        h('p', { className: 'xsl-description' }, '在网页确认授权后，将一次性授权码粘贴到下方，完成连接。'),
        h('label', { className: 'xsl-field' }, h('span', { className: 'xsl-label' }, '一次性授权码'), h('input', {
          className: 'xsl-code', type: 'password', value: code, autoComplete: 'off', maxLength: 128,
          placeholder: '粘贴一次性授权码', onChange: event => setCode(event.target.value), disabled: busy })),
        primary('完成连接', { disabled: busy || !code.trim(), onClick: finish }, 'link'));
      const body = h('div', { className: 'xsl-account-body' },
        h('div', { className: 'xsl-account-identity' }, h('span', { className: 'xsl-account-name' }, accountName(account?.username)),
          h('span', { className: 'xsl-plan' }, account ? account.membership?.planName || '无有效会员' : '读取权益中')),
        h('div', { className: 'xsl-credits' },
          h('div', { className: 'xsl-credit' }, h('span', null, '通用积分'), h('strong', null, format(account?.credits?.availableCredits))),
          h('div', { className: 'xsl-credit' }, h('span', null, '视频积分'), h('strong', null, format(account?.credits?.video?.remainingCredits)))),
        account && h('div', { className: 'xsl-quota' },
          h('span', null, '视频已用 ' + format(account.credits?.video?.usedCredits) + ' / ' + format(account.credits?.video?.limitCredits)),
          account.membership && h('span', null, (account.membership.videoMaxResolution || '未包含视频权益') + ' · 并发 ' + format(account.membership.videoConcurrency))),
        h('div', { className: 'xsl-account-actions' },
          h('button', { className: 'xsl-text-button', disabled: busy, onClick: run(refresh) }, h(Icon, { name: 'refresh', size: 12 }), '刷新额度'),
          h('button', { className: 'xsl-text-button', disabled: busy, onClick: begin }, '重新授权'),
          h('button', { className: 'xsl-text-button xsl-disconnect', disabled: busy, onClick: disconnect }, '断开连接')),
        h('p', { className: 'xsl-description' }, '生成使用小算狸站内权益与积分。'),
        state?.expiresAt && h('p', { className: 'xsl-description' }, '授权有效期至 ' + new Date(state.expiresAt).toLocaleDateString()),
        loginForm);
      return h('section', { className: 'xsl-dir xsl-account' + (compact ? '' : ' xsl-account-page'), 'aria-label': '小算狸账户' },
        !compact && h('div', { style: { marginBottom: 20 } }, h('h2', { className: 'xsl-account-heading' }, '小算狸导演台'),
          h('p', { className: 'xsl-description' }, '连接账号，在对话中创作剧情、编辑分镜、生成图片和视频。')),
        message(error),
        state?.connected ? h('details', { className: 'xsl-account-details', open: compact ? undefined : true },
          h('summary', { className: 'xsl-account-summary' }, h(Icon, { name: 'user', size: 15 }), '账户与权益',
            h('span', { className: 'xsl-status' }, '已连接'), h(Icon, { name: 'chevron', className: 'xsl-chevron', size: 13 })), body)
          : state && h('div', { className: 'xsl-connect-card' },
            h('div', { className: 'xsl-connect-title' }, h(Icon, { name: 'link', size: 18 }), '连接你的创作空间'),
            h('p', { className: 'xsl-description' }, '连接小算狸账号，开始创作剧情、编辑分镜，让故事走向银幕。'),
            primary('登录并连接小算狸', { disabled: busy, onClick: begin }, 'link'), loginForm),
        (busy || !state) && h('p', { className: 'xsl-loading', role: 'status' }, h(Icon, { name: 'refresh', className: 'xsl-spin', size: 12 }), busy ? '正在处理…' : '正在读取连接状态…'));
    }
    function SelectField({ label, count, icon, value, disabled, onChange, options, placeholder }) {
      const [open, setOpen] = React.useState(false);
      const [active, setActive] = React.useState(0);
      const root = React.useRef(null), trigger = React.useRef(null);
      const id = React.useId();
      const items = [{ id: '', title: placeholder }, ...options];
      const selected = Math.max(0, items.findIndex(item => item.id === value));
      const expanded = open && !disabled;
      const show = () => { if (!disabled) { setActive(selected); setOpen(true); } };
      const choose = index => {
        if (disabled || !items[index]) return;
        setOpen(false); trigger.current?.focus();
        if (items[index].id !== value) onChange({ target: { value: items[index].id } });
      };
      React.useEffect(() => {
        if (!expanded) return;
        const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
      }, [expanded]);
      React.useEffect(() => {
        if (disabled) setOpen(false);
      }, [disabled, value]);
      React.useEffect(() => {
        if (expanded) root.current?.querySelector('[data-active=true]')?.scrollIntoView({ block: 'nearest' });
      }, [expanded, active]);
      const keyDown = event => {
        if (disabled) return;
        if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Enter' || event.key === ' ') { if (expanded) choose(active); else show(); return; }
        setOpen(true);
        setActive(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
          expanded ? Math.min(items.length - 1, Math.max(0, active + (event.key === 'ArrowDown' ? 1 : -1))) : selected);
      };
      return h('div', { className: 'xsl-field', ref: root,
        onBlur: event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); } },
        h('span', { id: id + '-label', className: 'xsl-label' }, label, h('span', { className: 'xsl-count' }, count)),
        h('div', { className: 'xsl-choice' },
          h('button', { ref: trigger, type: 'button', role: 'combobox', className: 'xsl-choice-trigger', disabled,
            'aria-labelledby': id + '-label', 'aria-haspopup': 'listbox', 'aria-expanded': expanded,
            'aria-controls': expanded ? id + '-list' : undefined, 'aria-activedescendant': expanded ? id + '-option-' + active : undefined,
            onClick: () => expanded ? setOpen(false) : show(), onKeyDown: keyDown },
            h(Icon, { name: icon, size: 15 }),
            h('span', { className: 'xsl-choice-title', title: items[selected].title || items[selected].id, 'data-placeholder': !value }, items[selected].title || items[selected].id),
            h(Icon, { name: 'chevron', className: 'xsl-chevron', size: 13 })),
          expanded && h('div', { id: id + '-list', role: 'listbox', 'aria-labelledby': id + '-label', className: 'xsl-choice-menu' },
            ...items.map((item, index) => h('button', { key: item.id, id: id + '-option-' + index, type: 'button', role: 'option',
              className: 'xsl-choice-option', tabIndex: -1, 'aria-selected': item.id === value, 'data-active': index === active,
              onMouseDown: event => event.preventDefault(), onMouseEnter: () => setActive(index), onClick: () => choose(index) },
              h('span', null, item.title || item.id), item.id === value && h(Icon, { name: 'check', size: 14 }))))));
    }
    function ProjectPanel({ rpc, createChat, closePanel }) {
      const [projects, setProjects] = React.useState([]);
      const [projectsLoaded, setProjectsLoaded] = React.useState(false);
      const [chapters, setChapters] = React.useState([]);
      const [projectId, setProjectId] = React.useState('');
      const [chapterId, setChapterId] = React.useState('');
      const [connected, setConnected] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const selection = React.useRef(0);
      const mounted = React.useRef(true);
      React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++selection.current; }; }, []);
      const run = fn => async () => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
      const refresh = async () => { const result = await rpc('projects'); if (mounted.current) { setProjects(result.projects || []); setProjectsLoaded(true); } };
      const connectionChanged = React.useCallback(value => {
        setConnected(value);
        if (value) refresh().catch(e => { if (mounted.current) setError(e.message); });
        else { ++selection.current; setProjects([]); setProjectsLoaded(false); setChapters([]); setProjectId(''); setChapterId(''); setError(''); setNotice(''); setBusy(false); }
      }, [rpc]);
      const chooseProject = async event => {
        const id = event.target.value, epoch = ++selection.current;
        setProjectId(id); setChapterId(''); setChapters([]); setError(''); setNotice('');
        if (!id) return;
        setBusy(true);
        try { const result = await rpc('chapters', { projectId: id }); if (epoch === selection.current) setChapters(result.chapters || []); }
        catch (e) { if (epoch === selection.current) setError(e.message); }
        finally { if (epoch === selection.current) setBusy(false); }
      };
      const step = (n, title, active, done) => h('div', { className: 'xsl-step', 'data-active': active, 'data-done': done },
        h('span', null, done ? h(Icon, { name: 'check', size: 11 }) : n), title);
      const field = (label, count, icon, props, options, placeholder) => h(SelectField, { label, count, icon, ...props, options, placeholder });
      return h('section', { className: 'xsl-dir xsl-panel', 'aria-label': '小算狸工程与章节' },
        h('div', { className: 'xsl-brand' }, h('div', { className: 'xsl-brandmark' }, h('img', { src: brandLogo, width: 30, height: 33, alt: '' })),
          h('div', null, h('h3', null, '小算狸导演台'), h('p', null, '让你的故事，走向银幕')),
          h('div', { className: 'xsl-toolbar' },
            h('button', { className: 'xsl-icon-button', title: '刷新工程', 'aria-label': '刷新工程', disabled: busy || !connected, onClick: run(refresh) }, h(Icon, { name: 'refresh', size: 15 })),
            h('button', { className: 'xsl-icon-button', title: '收起工程面板', 'aria-label': '收起工程面板', onClick: closePanel }, h(Icon, { name: 'close', size: 15 })))),
        connected !== false && h(React.Fragment, null,
          h('div', { className: 'xsl-steps', 'aria-label': '打开工程 → 选择章节 → 新建聊天' },
            step(1, '选工程', !projectId, !!projectId), h('span', { className: 'xsl-step-line' }),
            step(2, '选章节', !!projectId && !chapterId, !!chapterId), h('span', { className: 'xsl-step-line' }), step(3, '开始创作', !!chapterId, false)),
          message(error),
          h('div', { className: 'xsl-fields' },
            field('打开工程', projects.length ? projects.length + ' 个工程' : '', 'folder', { value: projectId, disabled: busy || !connected, onChange: chooseProject }, projects, '选择一个工程'),
            field('选择章节', chapters.length ? chapters.length + ' 个章节' : '', 'film', { value: chapterId, disabled: busy || !projectId, onChange: e => setChapterId(e.target.value) }, chapters, busy ? '正在读取章节…' : projectId ? '选择要创作的章节' : '请先选择工程'),
            primary('为此章节新建聊天', { disabled: busy || !projectId || !chapterId,
              onClick: run(async () => { const result = await createChat(projectId, chapterId); setNotice(result.notice || '已打开新的章节对话。'); }) }, 'chat')),
          h('p', { className: 'xsl-hint' }, h(Icon, { name: 'info', size: 12 }), '每个聊天专注一章。随时回到原来的对话，接着创作。'),
          message(notice, 'notice'),
          connected && h('details', { className: 'xsl-onboarding', open: projectsLoaded && !busy && (!projects.length || !!projectId && !chapters.length) ? true : undefined },
            h('summary', null, '没有工程或章节？从这里开始'),
            h('ol', null,
              h('li', null, '在 DSH 左侧点击「新会话」，直接发送：', h('q', null, '使用小算狸导演 Skill，帮我创建一个叫《我的第一部短片》的工程。')),
              h('li', null, '新工程会附带空白第一章。让助手打开它，再发送你的故事与创作要求。'),
              h('li', null, '已有工程需要新章时，在新会话中说明工程名和新章节名，让助手创建并打开。'),
              h('li', null, '也可以回到此面板，点击刷新后选择工程、章节，再新建章节聊天。创建权限不足时，按助手提示重新授权或去导演台网页创建。')))),
        h(AccountSection, { rpc, compact: true, onConnectionChange: connectionChanged }));
    }
    function FloatingDirector({ rpc, createChat }) {
      const [open, setOpen] = React.useState(false);
      const [visited, setVisited] = React.useState(false);
      const root = React.useRef(null), launcher = React.useRef(null), panel = React.useRef(null);
      const panelId = React.useId();
      const closePanel = () => { setOpen(false); launcher.current?.focus(); };
      React.useEffect(() => {
        if (!open) return;
        panel.current?.focus();
        const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
        const escape = event => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closePanel(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
      }, [open]);
      return h('div', { className: 'xsl-dir xsl-floating', ref: root },
        visited && h('div', { className: 'xsl-popover', id: panelId, ref: panel, role: 'dialog',
          'aria-label': '小算狸工程面板', hidden: !open, tabIndex: -1 },
        h(ProjectPanel, { rpc, closePanel, createChat: async (...args) => { const result = await createChat(...args); setOpen(false); return result; } })),
        h('button', { className: 'xsl-launcher', ref: launcher, 'aria-label': '小算狸工程',
          'aria-expanded': open, 'aria-controls': visited ? panelId : undefined, 'aria-haspopup': 'dialog',
          onClick: () => { setVisited(true); setOpen(value => !value); } }, h('img', { src: brandLogo, width: 27, height: 30, alt: '' }), '小算狸'));
    }
    return { inject: ['slots', 'connection', 'sidebarRight', 'sessions', 'workspaces', 'uiWorkspace'], apply(ctx) {
      ctx.effect(() => {
        const element = document.createElement('style'); element.textContent = styles; document.head.appendChild(element);
        return () => element.remove();
      });
      const rpc = async (endpoint, payload = {}) => {
        const result = await ctx.connection.rpc.call('/api', 'xiaosuanli/' + endpoint, payload);
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      };
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: '@xiaosuanli/dsh-plugin/launcher',
        inject: () => ({ rpc,
          createChat: async (projectId, chapterId) => {
            const currentSession = ctx.sidebarRight.mounted.getSnapshot();
            const workspace = ctx.workspaces.list.getSnapshot().items.find(item => item.sessionIds.includes(currentSession));
            const cwd = currentSession && ctx.sessions.list.getSnapshot().byId[currentSession]?.cwd;
            const conversationId = await ctx.sessions.create(workspace ? { workspaceId: workspace.workspaceId } : cwd ? { cwd } : undefined);
            const result = await rpc('open-chapter', { conversationId, projectId, chapterId });
            ctx.uiWorkspace.openSession(conversationId);
            return result;
          },
        }) }, FloatingDirector));
      ctx.slots.inject('settings.section' , () => ctx.slots.register({ name: 'settings.section', id: 'xiaosuanli',
        order: 10, label: () => '小算狸', inject: () => ({ rpc }) }, AccountSection));
    } };
  },
});
