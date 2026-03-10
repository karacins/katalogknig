const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const authStatus = document.getElementById('auth-status');
const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || 'index.html';

function showMessage(element, text, isError = false) {
  if (!element) {
    return;
  }

  element.hidden = false;
  element.textContent = text;
  element.classList.toggle('auth-message-error', isError);
}

function renderAuthStatus() {
  const currentUser = window.getCurrentUser?.();
  if (!authStatus) {
    return;
  }

  if (!currentUser) {
    authStatus.innerHTML = '<p>Зараз ви не увійшли в акаунт.</p>';
    return;
  }

  authStatus.innerHTML = `<p><strong>Поточний акаунт:</strong> ${currentUser.name} (${currentUser.email})</p><p><strong>Роль:</strong> ${currentUser.role === 'admin' ? 'Адміністратор' : 'Користувач'}</p>`;
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const result = await window.loginUser?.(email, password);

  if (!result?.ok) {
    showMessage(loginMessage, result?.message ?? 'Не вдалося увійти.', true);
    return;
  }

  window.location.href = redirectTarget;
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const result = await window.registerUser?.({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? '')
  });

  if (!result?.ok) {
    showMessage(registerMessage, result?.message ?? 'Не вдалося створити акаунт.', true);
    return;
  }

  window.location.href = redirectTarget;
});

renderAuthStatus();
