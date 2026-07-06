/* =========================================================
   COSMO & WANDA — script.js
   Contiene: menú móvil, carrusel de galería, validación del
   formulario de citas y año dinámico en el footer.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initCarousel();
  initAppointmentForm();
  document.getElementById('year').textContent = new Date().getFullYear();
});

/* ---------------------------------------------------------
   1. MENÚ MÓVIL
--------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Cierra el menú al hacer clic en un enlace (útil en mobile)
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------------------------------------------------------
   2. CARRUSEL DE GALERÍA
   Para agregar más fotos: agrega otro <figure class="carousel-slide">
   en el HTML y este script lo detecta automáticamente.
--------------------------------------------------------- */
function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const slides = Array.from(track.children);
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  let currentIndex = 0;
  let autoplayTimer = null;

  // Crea un punto (dot) por cada slide
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
  const dots = Array.from(dotsContainer.children);

function updateCarousel() {
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: currentIndex * slideWidth, behavior: 'smooth' });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  function goToSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    updateCarousel();
    resetAutoplay();
  }

  function nextSlide() { goToSlide(currentIndex + 1); }
  function prevSlide() { goToSlide(currentIndex - 1); }

  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, 5000);
  }
  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);

  const carousel = document.getElementById('carousel');
  carousel.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  carousel.addEventListener('mouseleave', startAutoplay);

  let touchStartX = 0;
  let touchStartY = 0;
  let isHorizontalSwipe = false;

  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isHorizontalSwipe = false;
  });

  track.addEventListener('touchmove', e => {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    // Si el movimiento es más horizontal que vertical, es un swipe del carrusel:
    // evitamos que el dedo arrastre el scroll nativo y choque con nuestro scrollTo.
    if (deltaX > deltaY) {
      isHorizontalSwipe = true;
      e.preventDefault();
    }
  }, { passive: false });

  track.addEventListener('touchend', e => {
    if (!isHorizontalSwipe) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) diff > 0 ? nextSlide() : prevSlide();
  });

  // Al rotar el celular o cambiar el tamaño de la ventana, recalcula
  // la posición para que quede exactamente alineada con el slide actual.
  window.addEventListener('resize', updateCarousel);
  window.addEventListener('orientationchange', () => setTimeout(updateCarousel, 200));

  updateCarousel();
  startAutoplay();
}

/* ---------------------------------------------------------
   3. FORMULARIO DE CITA — validación
--------------------------------------------------------- */
function initAppointmentForm() {
  const form = document.getElementById('appointmentForm');
  const successMsg = document.getElementById('formSuccess');

  const phoneRegex = /^[+]?[\d\s()-]{8,15}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fields = {
    ownerName: { el: document.getElementById('ownerName'), required: true },
    petName:   { el: document.getElementById('petName'),   required: true },
    service:   { el: document.getElementById('service'),   required: true },
    phone:     { el: document.getElementById('phone'),     required: true, pattern: phoneRegex },
    email:     { el: document.getElementById('email'),     required: true, pattern: emailRegex },
    date:      { el: document.getElementById('date'),      required: true },
    time:      { el: document.getElementById('time'),      required: true },
  };

  function showError(name, message) {
    const field = fields[name].el;
    const errorEl = document.getElementById(name + 'Error');
    field.closest('.form-field').classList.add('field-invalid');
    errorEl.textContent = message;
  }

  function clearError(name) {
    const field = fields[name].el;
    const errorEl = document.getElementById(name + 'Error');
    field.closest('.form-field').classList.remove('field-invalid');
    errorEl.textContent = '';
  }

  function validateField(name) {
    const { el, required, pattern } = fields[name];
    const value = el.value.trim();

    if (required && !value) {
      showError(name, 'Este campo es obligatorio.');
      return false;
    }

    if (name === 'date' && value) {
      const selectedDate = new Date(value + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        showError(name, 'Elige una fecha desde hoy en adelante.');
        return false;
      }
    }

    if (pattern && value && !pattern.test(value)) {
      showError(name, name === 'email'
        ? 'Ingresa un correo válido (ej: nombre@correo.com).'
        : 'Ingresa un teléfono válido (mínimo 8 dígitos).');
      return false;
    }

    clearError(name);
    return true;
  }

  // Validación en vivo al salir de cada campo
  Object.keys(fields).forEach(name => {
    fields[name].el.addEventListener('blur', () => validateField(name));
  });

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    let isFormValid = true;
    Object.keys(fields).forEach(name => {
      if (!validateField(name)) isFormValid = false;
    });

    if (!isFormValid) {
      successMsg.textContent = '';
      return;
    }

    const payload = {
      ownerName: fields.ownerName.el.value.trim(),
      petName: fields.petName.el.value.trim(),
      breed: document.getElementById('breed').value.trim(),
      service: fields.service.el.value,
      phone: fields.phone.el.value.trim(),
      email: fields.email.el.value.trim(),
      date: fields.date.el.value,
      time: fields.time.el.value,
      comments: document.getElementById('comments').value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    successMsg.style.color = '';
    successMsg.textContent = '';

    try {
      const response = await fetch('/.netlify/functions/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Ej: hora ya ocupada (409), o campos inválidos (400)
        successMsg.style.color = '#F45B8D';
        successMsg.textContent = result.error || 'No se pudo agendar la cita. Intenta de nuevo.';
        return;
      }

      successMsg.style.color = '';
      successMsg.textContent = '¡Cita solicitada con éxito! Revisa tu correo para la confirmación 🐾';
      form.reset();
    } catch (networkError) {
      console.error('Error de red:', networkError);
      successMsg.style.color = '#F45B8D';
      successMsg.textContent = 'Hubo un problema de conexión. Intenta nuevamente.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Solicitar cita';
    }
  });
}