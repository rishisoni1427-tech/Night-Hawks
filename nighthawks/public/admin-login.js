// admin-login.js — handles the admin sign-in form

const form = document.getElementById('adminLoginForm');
const errorBox = document.getElementById('adminError');

// already logged in? skip straight to dashboard
if (sessionStorage.getItem('nh_admin_token')) {
  window.location.href = 'admin-dashboard.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      sessionStorage.setItem('nh_admin_token', data.token);
      sessionStorage.setItem('nh_admin_name', data.username);
      window.location.href = 'admin-dashboard.html';
    } else {
      errorBox.textContent = data.message || 'Invalid username or password.';
      errorBox.style.display = 'block';
    }
  } catch (err) {
    errorBox.textContent = 'Could not reach the server. Try again.';
    errorBox.style.display = 'block';
  }
});
