// ─── 네비게이션 스크롤 효과 ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ─── 모바일 메뉴 토글 ───
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  if (mobileMenu.classList.contains('open')) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
    mobileMenu.classList.remove('open');
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// ─── 모바일 Projects 서브메뉴 토글 ───
const mobileProjectsRow = document.getElementById('mobileProjectsRow');
const mobileProjectsSubmenu = document.getElementById('mobileProjectsSubmenu');

if (mobileProjectsRow && mobileProjectsSubmenu) {
  mobileProjectsRow.addEventListener('click', () => {
    const isOpen = mobileProjectsSubmenu.classList.toggle('open');
    mobileProjectsRow.classList.toggle('open', isOpen);
    mobileProjectsRow.querySelector('.mobile-projects-arrow').textContent = isOpen ? '−' : '+';
  });
}

// 키보드 접근성
hamburger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    hamburger.click();
  }
});

// ─── 스크롤 애니메이션 (Intersection Observer) ───
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -60px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// ─── 섹션별 묶음 스태거 애니메이션 ───
const animSelector =
  '.section-title, .section-desc, .concept-grid, .research-card, ' +
  '.insight-card, .designer-note, .ut-metric-card, ' +
  '.takeaway-card, .img-placeholder, .phase-divider, img, video';
const EXCLUDE = '.hero, .navbar, .hifi-slide, .lightbox';

const seen = new Set();

// .container 단위로 묶어 내부 요소에 순서 기반 딜레이 적용
document.querySelectorAll('.container').forEach(group => {
  const targets = [...group.querySelectorAll(animSelector)].filter(el => {
    if (seen.has(el) || el.closest(EXCLUDE)) return false;
    seen.add(el);
    return true;
  });
  // 같은 컨테이너 안 이미지·비디오는 모두 첫 번째 미디어의 딜레이로 통일
  const firstMediaIdx = targets.findIndex(el => el.tagName === 'IMG' || el.tagName === 'VIDEO');
  const mediaDelay = firstMediaIdx >= 0 ? Math.min(firstMediaIdx * 0.08, 0.32) : 0;

  targets.forEach((el, idx) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    const isMedia = el.tagName === 'IMG' || el.tagName === 'VIDEO';
    const delay = isMedia ? mediaDelay : Math.min(idx * 0.08, 0.32);
    el.style.transition = `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`;
    observer.observe(el);
  });
});

// 컨테이너 밖 standalone 요소 처리
document.querySelectorAll(animSelector).forEach(el => {
  if (seen.has(el) || el.closest(EXCLUDE)) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity 0.6s ease 0s, transform 0.6s ease 0s';
  observer.observe(el);
});

// ─── hifi 스크롤 드리븐 (크로스페이드 + 트래커 Y 이동) ───
const hifiWrap         = document.getElementById('hifi-scroll-wrap');
const hifiSlides       = document.querySelectorAll('.hifi-slide');
const hifiTracker      = document.getElementById('hifi-tracker');
const hifiTrackerNodes = hifiTracker ? [...hifiTracker.querySelectorAll('.hifi-tracker__node')] : [];
const hifiTrackerDots  = hifiTracker ? [...hifiTracker.querySelectorAll('.hifi-tracker__dot')]  : [];

let hifiTarget = 0, hifiCurrent = 0;
let hifiTrackerYTarget = 0, hifiTrackerYCurrent = 0;
let hifiRafId = null;
let isTouch = false;
window.addEventListener('touchstart', () => { isTouch = true; }, { once: true, passive: true });

function lerp(a, b, t) { return a + (b - a) * t; }

// 트래커 각 dot의 Y 위치(트래커 기준) 사전 계산
let dotYsInTracker = [];
function recalcDotPositions() {
  if (!hifiTracker || !hifiTrackerDots.length) return;
  const saved = hifiTracker.style.transform;
  hifiTracker.style.transform = 'none';
  const tr = hifiTracker.getBoundingClientRect();
  dotYsInTracker = hifiTrackerDots.map(d => {
    const r = d.getBoundingClientRect();
    return r.top - tr.top + r.height / 2;
  });
  hifiTracker.style.transform = saved || '';
  // 초기 위치 즉시 적용
  const activeIdx = Math.round(hifiTarget * Math.max(0, hifiSlides.length - 1));
  hifiTrackerYTarget  = getTrackerYTarget(activeIdx);
  hifiTrackerYCurrent = hifiTrackerYTarget;
  if (hifiTracker) hifiTracker.style.transform = `translateY(${hifiTrackerYTarget}px)`;
}
window.addEventListener('load',   recalcDotPositions);
window.addEventListener('resize', () => { recalcDotPositions(); onHifiScroll(); });

function getTrackerYTarget(activeIdx) {
  if (!dotYsInTracker.length) return 0;
  const y = dotYsInTracker[Math.min(activeIdx, dotYsInTracker.length - 1)];
  return window.innerHeight / 2 - y;
}

// 슬라이드 인덱스 → 트래커 상태 업데이트
function updateTrackerState(activeIdx) {
  if (!hifiTracker) return;
  hifiTrackerNodes.forEach((node, i) => {
    node.classList.remove('is-active', 'is-done');
    if      (i === 0) { activeIdx === 0 ? node.classList.add('is-active') : node.classList.add('is-done'); }
    else if (i === 1) { if (activeIdx === 1) node.classList.add('is-active'); else if (activeIdx === 3) node.classList.add('is-done'); }
    else if (i === 2) { if (activeIdx === 2) node.classList.add('is-active'); else if (activeIdx === 3) node.classList.add('is-done'); }
    else if (i === 3) { if (activeIdx === 3) node.classList.add('is-active'); }
  });
  const vl   = hifiTracker.querySelector('.hifi-tracker__vl');
  const fork = hifiTracker.querySelector('.hifi-tracker__fork');
  if (vl)   vl.classList.toggle('is-done',   activeIdx >= 1);
  if (fork) fork.classList.toggle('is-done', activeIdx === 3);
}

function applyHifi(progress) {
  const segments = hifiSlides.length - 1;
  // 슬라이드 크로스페이드
  hifiSlides.forEach((slide, i) => {
    const dist = Math.abs(progress * segments - i);
    slide.style.opacity = String(Math.max(0, 1 - dist));
    slide.style.zIndex  = dist < 0.5 ? '2' : '1';
  });
  // 트래커 Y 이동
  if (hifiTracker) hifiTracker.style.transform = `translateY(${hifiTrackerYCurrent}px)`;
  updateTrackerState(Math.round(progress * segments));
}

function hifiTick() {
  const factor = isTouch ? 0.28 : 0.09;
  hifiCurrent         = lerp(hifiCurrent,         hifiTarget,         factor);
  hifiTrackerYCurrent = lerp(hifiTrackerYCurrent,  hifiTrackerYTarget, 0.07);
  applyHifi(hifiCurrent);
  const slideDone   = Math.abs(hifiCurrent - hifiTarget) < 0.0002;
  const trackerDone = Math.abs(hifiTrackerYCurrent - hifiTrackerYTarget) < 0.2;
  if (!slideDone || !trackerDone) {
    hifiRafId = requestAnimationFrame(hifiTick);
  } else {
    hifiCurrent = hifiTarget;
    hifiTrackerYCurrent = hifiTrackerYTarget;
    applyHifi(hifiTarget);
    hifiRafId = null;
  }
}

function onHifiScroll() {
  if (!hifiWrap) return;
  const rect     = hifiWrap.getBoundingClientRect();
  const scrolled = -rect.top;
  const total    = rect.height - window.innerHeight;
  hifiTarget     = Math.max(0, Math.min(1, scrolled / total));
  hifiTrackerYTarget = getTrackerYTarget(Math.round(hifiTarget * (hifiSlides.length - 1)));
  if (!hifiRafId) hifiRafId = requestAnimationFrame(hifiTick);
}

window.addEventListener('scroll', onHifiScroll, { passive: true });
onHifiScroll();

// ─── 스무스 스크롤 (내부 링크) ───
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ─── 히어로 패럴랙스 (가벼운 효과) ───
const hero = document.getElementById('hero');
if (hero) {
  const heroText = hero.querySelector('.hero__text');
  const heroMockup = hero.querySelector('.hero__mockup');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      const opacity = 1 - scrollY / (window.innerHeight * 0.7);
      heroText.style.transform = `translateY(${scrollY * 0.12}px)`;
      heroText.style.opacity = opacity;
      heroMockup.style.opacity = opacity;
    }
  }, { passive: true });
}

// ─── 영상 배속 ───
const crazy8Video = document.getElementById('crazy8-video');
if (crazy8Video) crazy8Video.playbackRate = 16;

// ─── 라이트박스 ───
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('.lightbox__img');

function openLightbox(e) {
  lightboxImg.src = e.currentTarget.src;
  lightboxImg.alt = e.currentTarget.alt || '';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target !== lightboxImg) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

document.querySelectorAll('img').forEach(img => {
  if (img.classList.contains('hero__mockup-img')) return;
  if (img.closest('.rationale__avatar')) return;
  if (img.closest('.card')) return;
  img.addEventListener('click', openLightbox);
});
