document.addEventListener('DOMContentLoaded', () => {
  // --- Navbar Scroll Effect ---
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // --- Mobile Menu Toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
  }

  // --- Reveal on Scroll (Every Time) ---
  const revealElements = document.querySelectorAll('.reveal');
  
  // Randomize animation styles slightly for a more dynamic feel
  const styles = ['reveal-up', 'reveal-down', 'reveal-left', 'reveal-right', 'reveal-scale'];
  revealElements.forEach(el => {
    // If it only has 'reveal' and not one of the specific styles, give it a random one
    let hasStyle = false;
    styles.forEach(s => { if (el.classList.contains(s)) hasStyle = true; });
    if (!hasStyle) {
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      el.classList.add(randomStyle);
    }
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      } else {
        // Remove class when out of view so it animates again when scrolling back
        entry.target.classList.remove('revealed');
      }
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });

  revealElements.forEach(el => revealObserver.observe(el));

  // --- Animated Counters ---
  const counters = document.querySelectorAll('.counter-val');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = +entry.target.getAttribute('data-target');
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            entry.target.textContent = target + (entry.target.dataset.suffix || '');
            clearInterval(timer);
          } else {
            entry.target.textContent = Math.floor(current) + (entry.target.dataset.suffix || '');
          }
        }, stepTime);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  // --- Tabs Logic ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  if (tabBtns.length > 0) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // If the button has an onclick attribute (like in catalog.html), skip this default tab logic
        if (btn.hasAttribute('onclick')) return;
        
        const targetId = btn.getAttribute('data-target');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
    
    // Check URL Hash for initial tab
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const targetBtn = document.querySelector(`.tab-btn[data-target="${hash}"]`);
      if (targetBtn && !targetBtn.hasAttribute('onclick')) {
        targetBtn.click();
      }
    }
  }
  
  // --- Initialize Swiper if present ---
  if (typeof Swiper !== 'undefined') {
    const swiper = new Swiper('.testimonials-swiper', {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 }
      }
    });
  }
});
