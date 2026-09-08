/**
 * INFINITYTECH — SCRIPTS PRINCIPAIS
 * Gerenciamento de Header, FAQ Accordion, Menu Mobile, Animações e WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header Scroll Effect
  const header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // 2. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      // Garantir estado inicial acessível
      if (!questionBtn.hasAttribute('aria-expanded')) {
        questionBtn.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
      }

      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Fechar todos os outros accordions
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherBtn = otherItem.querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Alternar o atual
        if (!isOpen) {
          item.classList.add('active');
          questionBtn.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('active');
          questionBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });

  // 3. Mobile Navigation Drawer
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });

    // Fechar ao clicar em links
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
      });
    });
  }

  // 4. Reveal Animations on Scroll (Intersection Observer)
  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.15
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback caso navegador não suporte IntersectionObserver
    revealElements.forEach(el => el.classList.add('visible'));
  }

  // 5. Smooth Scroll para Âncoras com Offset do Header
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const headerOffset = 90;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // 6. Theme Toggle (Modo Claro & Modo Escuro)
  initThemeToggle();
});

/**
 * Gerenciador de Tema Claro / Escuro
 * Suporta persistência no localStorage e detecção automática de página
 */
function initThemeToggle() {
  const THEME_STORAGE_KEY = 'infinitytech-theme';
  const isLojistasPage = document.body.classList.contains('lojistas-body') || 
                         window.location.pathname.includes('lojistas') || 
                         window.location.href.includes('lojistas');
  const defaultTheme = isLojistasPage ? 'dark' : 'light';

  // Lê preferência do localStorage, respeita o tema já aplicado pelo script
  // anti-FOUC inline de cada página e só cai no padrão por nome de rota
  // como último recurso (necessário para páginas fora do padrão lojistas*).
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const inlineTheme = document.documentElement.getAttribute('data-theme');
  const currentTheme = savedTheme || inlineTheme || defaultTheme;

  // Garante aplicação no html
  document.documentElement.setAttribute('data-theme', currentTheme);

  const toggleButtons = document.querySelectorAll('.theme-toggle');

  function updateToggleButtons(theme) {
    toggleButtons.forEach(btn => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
      btn.setAttribute('title', isDark ? 'Ativar tema claro' : 'Ativar tema escuro');
    });
  }

  updateToggleButtons(currentTheme);

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const activeTheme = document.documentElement.getAttribute('data-theme') || defaultTheme;
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      updateToggleButtons(newTheme);
    });
  });
}
