(() => {
  'use strict';
  const data = window.PORTFOLIO || {};
  const body = document.body;
  body.classList.add('js-enabled');
  const base = data.base || '/';
  const notify = (message) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message; toast.classList.add('visible');
    clearTimeout(toast._timer); toast._timer = setTimeout(() => toast.classList.remove('visible'), 2900);
  };
  const theme = () => document.documentElement.dataset.theme;
  const updateThemeIcons = () => document.querySelectorAll('.theme-symbol').forEach(el => el.textContent = theme() === 'dark' ? '☼' : '☾');
  updateThemeIcons();
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('portfolio_theme', next); } catch (e) {}
    updateThemeIcons();
  }));
  const menu = document.getElementById('main-menu'), menuButton = document.querySelector('.menu-toggle');
  if (menu && menuButton) {
    menuButton.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open)); menuButton.textContent = open ? '×' : '☰';
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.textContent = '☰';
    }));
  }
  if (body.dataset.animations !== 'off' && window.IntersectionObserver && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('shown'); observer.unobserve(entry.target); }
    }), { threshold: .07 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('shown'));
  // The 2D mascot runs independently from the project/engagement features.
  // The galaxy canvas is decorative; the cursor glow remains disabled.
  const projects = [...document.querySelectorAll('.project-card')];
  const buttons = [...document.querySelectorAll('.filter-chip')];
  let currentStatus = 'all';
  function filterProjects() {
    const search = (document.getElementById('project-search')?.value || '').trim().toLowerCase();
    const category = document.getElementById('category-filter')?.value || 'all';
    let matches = 0;
    projects.forEach(card => {
      const show = (currentStatus === 'all' || card.dataset.status === currentStatus)
        && (category === 'all' || card.dataset.category === category)
        && (card.dataset.search || '').includes(search);
      card.hidden = !show; if (show) matches++;
    });
    const empty = document.getElementById('empty-projects'); if (empty) empty.hidden = matches > 0;
  }
  buttons.forEach(btn => btn.addEventListener('click', () => {
    currentStatus = btn.dataset.filter;
    buttons.forEach(other => { other.classList.toggle('active', other === btn); other.setAttribute('aria-pressed', String(other === btn)); });
    filterProjects();
  }));
  document.getElementById('project-search')?.addEventListener('input', filterProjects);
  document.getElementById('category-filter')?.addEventListener('change', filterProjects);
  async function post(endpoint, payload) {
    const form = new URLSearchParams(payload);
    const response = await fetch(base + endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-CSRF-Token': data.csrf || '' },
      body: form.toString()
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Request failed. Please try again.');
    return result;
  }
  document.querySelectorAll('[data-like]').forEach(button => button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const res = await post('api/interaction.php', {action:'like', project_id:button.dataset.like});
      document.querySelectorAll(`[data-like="${button.dataset.like}"]`).forEach(btn => {
        btn.classList.toggle('liked', !!res.liked);
        btn.setAttribute('aria-pressed', String(!!res.liked));
        btn.querySelector('.heart-symbol').textContent = res.liked ? '♥' : '♡';
        const count = btn.querySelector('[data-like-count]'); if (count) count.textContent = String(res.likes);
        btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
      });
      notify(res.message);
    } catch (e) { notify(e.message); } finally { button.disabled = false; }
  }));
  document.querySelectorAll('[data-rating]').forEach(control => {
    const stars = [...control.querySelectorAll('.star-btn')];
    const selected = stars.filter(el => el.classList.contains('selected')).length;
    control.dataset.selected = String(selected);
    const draw = (n, preview = false) => stars.forEach((star, i) => {
      star.classList.toggle('selected', !preview && i < n);
      star.classList.toggle('preview', preview && i < n);
      star.setAttribute('aria-pressed', String(!preview && i + 1 === n));
    });
    stars.forEach(star => {
      star.addEventListener('mouseenter', () => draw(Number(star.dataset.stars),true));
      star.addEventListener('focus', () => draw(Number(star.dataset.stars),true));
      star.addEventListener('click', async () => {
        const chosen=Number(star.dataset.stars);
        stars.forEach(s=>s.disabled=true);
        try {
          const res=await post('api/interaction.php',{action:'rate',project_id:control.dataset.rating,stars:chosen});
          control.dataset.selected=String(chosen); draw(chosen);
          document.querySelectorAll(`[data-average-for="${control.dataset.rating}"]`).forEach(item => {
            item.textContent = item.closest('.detail-engagement') ? `★ ${res.average.toFixed(1)} / 5` : `★ ${res.average.toFixed(1)}`;
          });
          document.querySelectorAll(`[data-rating-count-for="${control.dataset.rating}"]`).forEach(item => {
            item.textContent = item.closest('.detail-engagement') ? `${res.ratings} ratings` : `(${res.ratings})`;
          });
          notify(res.message);
        } catch (e) { notify(e.message); draw(Number(control.dataset.selected)); }
        finally { stars.forEach(s=>s.disabled=false); }
      });
    });
    control.addEventListener('mouseleave',()=>draw(Number(control.dataset.selected)));
    control.addEventListener('focusout',evt => { if(!control.contains(evt.relatedTarget)) draw(Number(control.dataset.selected)); });
  });
  const consentKey='portfolio_consent';
  const getConsent=()=>{ try { return document.cookie.split('; ').find(row=>row.startsWith(consentKey+'='))?.split('=')[1]; } catch (e) { return undefined; } };
  const banner=document.getElementById('cookie-banner');
  function showBanner(){ if(banner && data.analytics) banner.hidden=false; }
  async function trackPage(){
    if (!data.analytics || getConsent()!=='granted' || !['home','project'].includes(body.dataset.page)) return;
    try { await post('api/track.php',{page:body.dataset.page,project_id:body.dataset.projectId||''}); }
    catch(e) { /* Analytics failure must not interfere with browsing. */ }
  }
  if (!getConsent() && data.analytics) showBanner();
  else if (getConsent()==='granted') trackPage();
  banner?.querySelectorAll('[data-consent]').forEach(btn => btn.addEventListener('click',() => {
    const answer=btn.dataset.consent;
    document.cookie=`${consentKey}=${answer}; Max-Age=${365*86400}; Path=${base}; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    banner.hidden=true;
    if(answer==='granted') { notify('Analytics enabled. Thank you!'); trackPage(); }
    else notify('Optional analytics declined.');
  }));
  document.getElementById('privacy-reset')?.addEventListener('click',()=> {
    document.cookie=`${consentKey}=; Max-Age=0; Path=${base}; SameSite=Lax`;
    showBanner();
    if (!data.analytics) notify('Optional analytics are disabled by the site owner.');
  });
})();
