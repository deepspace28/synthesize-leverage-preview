const toggle = document.querySelector('.menu-toggle');
const audienceTabs = [...document.querySelectorAll('[role="tab"]')];
function selectAudience(tab) {
  for (const item of audienceTabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
}
audienceTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectAudience(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % audienceTabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + audienceTabs.length - 1) % audienceTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = audienceTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectAudience(audienceTabs[next]);
    audienceTabs[next].focus();
  });
});
const nav = document.querySelector('#navigation');
function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); toggle.focus(); } });
const form = document.querySelector('form');
const status = document.querySelector('.form-status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Sending your note…';
  try {
    const response = await fetch(form.action, {method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('Submission failed');
    status.textContent = 'Your note has been sent. Less will reply within two business days if it looks like a fit.';
    form.reset();
  } catch {
    status.textContent = 'Your note could not be sent. Please try again or email Less.Goudarzi@synleverage.com directly.';
  } finally { button.disabled = false; }
});
