const form = document.getElementById('lead-form');

if (form) {
  const button = document.getElementById('submit');
  const status = document.getElementById('status');

  function show(message, kind) {
    status.textContent = message;
    status.className = kind;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show('', '');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    data.consent = form.elements.consent.checked;

    button.disabled = true;
    button.textContent = 'Sending...';

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        form.reset();
        show('Thanks! We will be in touch within one business day.', 'success');
      } else {
        show(result.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      show('Network error. Please check your connection and try again.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send';
    }
  });
}
