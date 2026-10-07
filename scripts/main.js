(() => {
// --- menu.js
// SP メニュー（Figma 645:601）。オーバーレイを fade-in／fade-out（docs/animations.md）。
const PC_QUERY = '(min-width: 1024px)';

function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('sp-menu');
  if (!toggle || !menu) return;

  const label = toggle.querySelector('.menu-toggle__label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closeTimer;

  // メニュー展開中は背後の本文・フッターを操作対象から外す（キーボード／支援技術）
  const background = document.querySelectorAll('main, .site-footer, .skip-link, .to-top');

  const setState = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    if (label) label.textContent = open ? label.dataset.labelClose : label.dataset.labelOpen;
    document.body.classList.toggle('is-menu-open', open);
    background.forEach((el) => { el.inert = open; });
  };

  const open = () => {
    clearTimeout(closeTimer);
    menu.hidden = false;
    // hidden 解除後に次フレームで opacity を上げる
    requestAnimationFrame(() => menu.classList.add('is-open'));
    setState(true);
    // メニュー全体にフォーカス（iPhone で先頭リンクにフォーカス枠が出ないように）。Tab で先頭リンクへ進める
    menu.focus({ preventScroll: true });
  };

  const close = ({ focusToggle = false } = {}) => {
    menu.classList.remove('is-open');
    setState(false);
    const delay = reduceMotion.matches ? 0 : 200;
    closeTimer = setTimeout(() => { menu.hidden = true; }, delay);
    if (focusToggle) toggle.focus();
  };

  toggle.setAttribute('aria-label', 'メニューを開く');
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') close();
    else open();
  });

  // メニュー内のリンクで閉じる（ページ内遷移はブラウザの scroll-padding で位置調整）
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close({ focusToggle: true });
    }
  });

  // PC 幅に戻ったら強制的に閉じる
  window.matchMedia(PC_QUERY).addEventListener('change', (event) => {
    if (event.matches) {
      menu.classList.remove('is-open');
      menu.hidden = true;
      setState(false);
    }
  });
}

// --- accordion.js
// FAQ アコーディオン：button[aria-expanded] と region を連動。高さをトランジションさせる。
function initAccordion() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-accordion] .accordion__button').forEach((button) => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));

      if (reduceMotion.matches) {
        panel.hidden = expanded;
        return;
      }

      if (expanded) {
        panel.style.height = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        panel.addEventListener('transitionend', () => {
          panel.hidden = true;
          panel.style.height = '';
        }, { once: true });
      } else {
        panel.hidden = false;
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = `${panel.scrollHeight}px`; });
        panel.addEventListener('transitionend', () => { panel.style.height = ''; }, { once: true });
      }
    });
  });
}

// --- video.js
// ヒーロー動画：サムネイルのクリックでモーダル（<dialog>）を開き、YouTube を読み込む。
// - Esc・背景クリック・×ボタンで閉じる。閉じると iframe を外して再生を止める。
// - 開いている間はフォーカスがモーダル内に閉じ込められ（showModal）、閉じるとサムネイルへ戻る。
// - 初期表示はサムネイルのみ（LCP 対策）。
function initVideo() {
  const modal = document.getElementById('video-modal');
  if (!modal) return;
  const frame = modal.querySelector('.video-modal__frame');
  const closeButton = modal.querySelector('.video-modal__close');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let trigger = null;

  const open = (id, opener) => {
    trigger = opener;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = 'アンバサダー紹介動画（YouTube）';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(iframe);
    document.body.classList.add('is-modal-open');
    modal.showModal();
    closeButton.focus();
  };

  const close = () => {
    if (!modal.open) return;
    const finish = () => {
      modal.classList.remove('is-closing');
      modal.close();
    };
    if (reduceMotion.matches) finish();
    else {
      modal.classList.add('is-closing');
      setTimeout(finish, 200);
    }
  };

  // close イベント（Esc を含むすべての閉じ方）で後片付け
  modal.addEventListener('close', () => {
    frame.replaceChildren();
    document.body.classList.remove('is-modal-open');
    trigger?.focus();
  });

  // Esc は既定の即時クローズではなくフェードアウトさせる
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  closeButton.addEventListener('click', close);

  // パネル外（背景）のクリックで閉じる
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  document.querySelectorAll('[data-video-id]').forEach((wrapper) => {
    const button = wrapper.querySelector('button');
    button?.addEventListener('click', () => open(wrapper.dataset.videoId, button));
  });
}

// --- reveal.js
// スクロールリビール（docs/animations.md：translateY 16px → 0 / opacity 0 → 1 / 500ms / stagger 60ms）。
// JS が動いたときだけ .js-reveal を付与するので、JS 無効時も内容は常に表示される。
const TARGETS = [
  '.section-head',
  '.feature-card',
  '.benefit-card',
  '.rec-card',
  '.usecase-compare__card',
  '.price__box',
  '.accordion',
  '.flow-sp__step',
  '.info-card',
];

// Problem の吹き出し：クライアント指示で、左から 1 つずつ時間差で下からフェードアップ
const BUBBLE_STAGGER = 450; // ms（1 つずつ出るのが分かる間隔）

function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const reveal = (els) => els.forEach((el) => el.classList.add('is-revealed'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target.__revealTargets ?? [entry.target]);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll(TARGETS.join(',')).forEach((el) => {
    // 同じ親の中での順番で stagger（60ms）
    const siblings = Array.from(el.parentElement?.children ?? []);
    const index = Math.max(0, siblings.indexOf(el));
    el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 60}ms`);
    el.classList.add('js-reveal');
    observer.observe(el);
  });

  // 吹き出し群：リストが画面に入ったら、左から順に出す。
  // PC は .problem-item が display:contents（箱を持たない）なので、吹き出し画像と文字を同じ遅延で動かす。
  document.querySelectorAll('.problem__list').forEach((list) => {
    const isPc = window.matchMedia('(min-width: 1024px)').matches;
    const targets = [];
    Array.from(list.children).forEach((item, index) => {
      const parts = isPc ? Array.from(item.children) : [item];
      parts.forEach((el) => {
        el.style.setProperty('--reveal-delay', `${index * BUBBLE_STAGGER}ms`);
        el.style.setProperty('--reveal-duration', '800ms');
        el.classList.add('js-reveal');
        targets.push(el);
      });
    });
    list.__revealTargets = targets;
    observer.observe(list);
  });
}

// --- marquee.js
// 写真帯のループ式カルーセル。
// - 写真を 1 セット複製して横に並べ、トラックを -50% まで流し続けることで継ぎ目なくループさせる。
// - 複製分は支援技術・キーボードから隠す（aria-hidden / alt=""）。
// - 速度は幅に依存させず一定（約 35px/秒）。ホバーで一時停止、ボタンで停止 / 再生。
// - prefers-reduced-motion: reduce のときは動かさない（静止した横並びのまま）。
const SPEED = 35; // px / 秒

function initMarquee() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('[data-marquee]').forEach((strip) => {
    const track = strip.querySelector('.photo-strip__track');
    const toggle = strip.querySelector('.photo-strip__toggle');
    if (!track) return;

    Array.from(track.children).forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      track.append(clone);
    });

    const setDuration = () => {
      const distance = track.scrollWidth / 2;
      strip.style.setProperty('--marquee-duration', `${Math.round(distance / SPEED)}s`);
    };
    setDuration();
    window.addEventListener('resize', setDuration);
    strip.classList.add('is-playing');

    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        const paused = strip.classList.toggle('is-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.setAttribute('aria-label', paused ? '写真のスライドを再生' : '写真のスライドを一時停止');
      });
    }
  });
}

// --- motion.js
// 演出（styles/components/motion.css）のトリガー。
// 対象が画面に入ったら .is-in を付ける。概念図は出現が終わったら .is-live でループ演出を開始。
// prefers-reduced-motion: reduce のときは何もしない（.js-motion を付けないので静止表示のまま）。
const LIVE_DELAY = 1600; // ms：概念図の出現が終わるまで

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js-motion');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.classList.contains('solution-diagram')) {
        setTimeout(() => el.classList.add('is-live'), LIVE_DELAY);
      }
      observer.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  document.querySelectorAll('[data-shiho], .solution-diagram, .vc-pc, .vc-sp, .flow-pc').forEach((el) => observer.observe(el));
}

// --- to-top.js
// トップへ戻る：600px 以上スクロールしたら表示。クリックで先頭へ戻る（キーボード操作時はフォーカスもロゴへ）。
const THRESHOLD = 600;

function initToTop() {
  const button = document.querySelector('.to-top');
  if (!button) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  const update = () => {
    button.classList.toggle('is-visible', window.scrollY > THRESHOLD);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  button.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    // キーボードで押したときだけフォーカスを先頭へ（タップ時に iPhone でフォーカス枠が出ないように）
    if (event.detail === 0) document.querySelector('.site-header__logo')?.focus({ preventScroll: true });
    else button.blur();
  });
}

// ASCare LP — エントリ。機能ごとの ES モジュールを初期化する。








initMenu();
initAccordion();
initVideo();
initReveal();
initMarquee();
initMotion();
initToTop();
})();
