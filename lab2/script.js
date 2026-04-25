

const API_URL = 'http://localhost:4000';

let currentUser = null;

// ── API helper ────────────────────────────────────────────────────────────────

async function apiRequest(method, path, body = null) {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(API_URL + path, options);

    // Handle empty responses (e.g. 204)
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();

    if (!window.location.hash) window.location.hash = '#/';

    // Restore session – validate the stored token with the API
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            const account = await apiRequest('GET', '/accounts/current');
            setAuthState(true, account);
        } catch {
            localStorage.removeItem('auth_token');
        }
    }

    await handleRouting();
    window.addEventListener('hashchange', () => handleRouting());
});

// ── Routing ───────────────────────────────────────────────────────────────────

async function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2);   // strip '#/'

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const protectedRoutes = ['profile', 'employees', 'departments', 'accounts', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];

    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        return;
    }
    if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== 'Admin')) {
        showToast('Access denied – Admin only.', 'danger');
        navigateTo('#/');
        return;
    }

    let pageId = 'home-page';

    switch (route) {
        case '':
        case '/':
            pageId = 'home-page';
            break;
        case 'register':
            pageId = 'register-page';
            break;
        case 'verify-email':
            pageId = 'verify-email-page';
            const pending = localStorage.getItem('unverified_email');
            if (pending) document.getElementById('verify-email-display').textContent = pending;
            break;
        case 'login':
            pageId = 'login-page';
            if (localStorage.getItem('email_verified') === 'true') {
                document.getElementById('login-success-alert').classList.remove('d-none');
                localStorage.removeItem('email_verified');
            }
            break;
        case 'profile':
            pageId = 'profile-page';
            break;
        case 'employees':
            pageId = 'employees-page';
            break;
        case 'departments':
            pageId = 'departments-page';
            break;
        case 'accounts':
            pageId = 'accounts-page';
            break;
        case 'requests':
            pageId = 'requests-page';
            break;
        default:
            pageId = 'home-page';
    }

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // Load page data
    try {
        if (route === 'profile') renderProfile();
        if (route === 'employees') await renderEmployeesList();
        if (route === 'departments') await renderDepartmentsList();
        if (route === 'accounts') await renderAccountsList();
        if (route === 'requests') await renderRequestsList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function navigateTo(hash) {
    window.location.hash = hash;
}

// ── Auth state ────────────────────────────────────────────────────────────────

function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;

    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        body.classList.toggle('is-admin', user.role === 'Admin');
        document.getElementById('username-display').textContent =
            user.firstName + ' ' + user.lastName;
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

// ── Event listeners ───────────────────────────────────────────────────────────

function initializeEventListeners() {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('simulate-verify-btn').addEventListener('click', handleVerifyEmail);

    document.getElementById('add-employee-btn').addEventListener('click', () => showEmployeeForm());
    document.getElementById('cancel-employee-btn').addEventListener('click', hideEmployeeForm);
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);

    document.getElementById('add-department-btn').addEventListener('click', showDepartmentPrompt);

    document.getElementById('add-account-btn').addEventListener('click', () => showAccountForm());
    document.getElementById('cancel-account-btn').addEventListener('click', hideAccountForm);
    document.getElementById('account-form').addEventListener('submit', handleAccountSubmit);

    document.getElementById('new-request-btn').addEventListener('click', showRequestModal);
    document.getElementById('add-item-btn').addEventListener('click', addRequestItem);
    document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);
}

// ── Register ──────────────────────────────────────────────────────────────────

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    try {
        const body = {
            firstName: document.getElementById('reg-firstname').value.trim(),
            lastName: document.getElementById('reg-lastname').value.trim(),
            email: document.getElementById('reg-email').value.trim().toLowerCase(),
            password: document.getElementById('reg-password').value,
            confirmPassword: document.getElementById('reg-password').value,
        };

        const result = await apiRequest('POST', '/accounts/register', body);

        localStorage.setItem('unverified_email', body.email);
        if (result.verificationToken) {
            localStorage.setItem('verification_token', result.verificationToken);
        }

        showToast(result.message || 'Account created!', 'success');
        navigateTo('#/verify-email');
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ── Verify email ──────────────────────────────────────────────────────────────

async function handleVerifyEmail() {
    const token = localStorage.getItem('verification_token');
    if (!token) {
        // Might be the first (admin) account which is auto-verified
        showToast('No pending verification – try logging in directly.', 'info');
        navigateTo('#/login');
        return;
    }

    try {
        const result = await apiRequest('POST', '/accounts/verify-email', { token });
        localStorage.removeItem('verification_token');
        localStorage.removeItem('unverified_email');
        localStorage.setItem('email_verified', 'true');
        showToast(result.message || 'Email verified!', 'success');
        navigateTo('#/login');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    try {
        const body = {
            email: document.getElementById('login-email').value.trim().toLowerCase(),
            password: document.getElementById('login-password').value,
        };

        const result = await apiRequest('POST', '/accounts/authenticate', body);

        localStorage.setItem('auth_token', result.token);
        setAuthState(true, result.account);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
}

// ── Profile ───────────────────────────────────────────────────────────────────

function renderProfile() {
    if (!currentUser) return;
    document.getElementById('profile-content').innerHTML = `
        <div class="mb-3"><h4>${currentUser.firstName} ${currentUser.lastName}</h4></div>
        <div class="mb-2"><strong>Email:</strong> ${currentUser.email}</div>
        <div class="mb-3"><strong>Role:</strong> ${currentUser.role}</div>
        <button class="btn btn-outline-primary"
            onclick="alert('Edit profile not implemented in this prototype')">
            Edit Profile
        </button>`;
}

// ── Employees ─────────────────────────────────────────────────────────────────

async function renderEmployeesList() {
    const container = document.getElementById('employees-list');
    container.innerHTML = '<p class="text-muted">Loading…</p>';

    const employees = await apiRequest('GET', '/employees');

    if (!employees.length) {
        container.innerHTML = '<div class="alert alert-info">No employees yet.</div>';
        return;
    }

    container.innerHTML = `
        <table class="table table-striped">
            <thead><tr>
                <th>ID</th><th>Email</th><th>Position</th><th>Dept ID</th><th>Hire Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${employees.map(emp => `
                    <tr>
                        <td>${emp.employeeId}</td>
                        <td>${emp.userEmail}</td>
                        <td>${emp.position}</td>
                        <td>${emp.departmentId}</td>
                        <td>${emp.hireDate}</td>
                        <td class="table-actions">
                            <button class="btn btn-sm btn-outline-primary"
                                onclick="editEmployee(${emp.id})">Edit</button>
                            <button class="btn btn-outline-danger"
                                onclick="deleteEmployee(${emp.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

async function showEmployeeForm(employeeId = null) {
    const container = document.getElementById('employee-form-container');
    const form = document.getElementById('employee-form');

    // Populate department dropdown from API
    try {
        const departments = await apiRequest('GET', '/departments');
        document.getElementById('emp-department').innerHTML =
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } catch {
        document.getElementById('emp-department').innerHTML =
            '<option value="">Failed to load departments</option>';
    }

    if (employeeId) {
        try {
            const emp = await apiRequest('GET', `/employees/${employeeId}`);
            document.getElementById('emp-id').value = emp.employeeId;
            document.getElementById('emp-email').value = emp.userEmail;
            document.getElementById('emp-position').value = emp.position;
            document.getElementById('emp-department').value = emp.departmentId;
            document.getElementById('emp-hiredate').value = emp.hireDate;
            form.dataset.editId = employeeId;
        } catch (err) {
            showToast(err.message, 'danger');
            return;
        }
    } else {
        form.reset();
        delete form.dataset.editId;
    }

    container.classList.remove('d-none');
}

function hideEmployeeForm() {
    document.getElementById('employee-form-container').classList.add('d-none');
    document.getElementById('employee-form').reset();
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    const form = document.getElementById('employee-form');
    const editId = form.dataset.editId;

    const body = {
        employeeId: document.getElementById('emp-id').value.trim(),
        userEmail: document.getElementById('emp-email').value.trim().toLowerCase(),
        position: document.getElementById('emp-position').value.trim(),
        departmentId: Number(document.getElementById('emp-department').value),
        hireDate: document.getElementById('emp-hiredate').value,
    };

    try {
        if (editId) {
            await apiRequest('PUT', `/employees/${editId}`, body);
            showToast('Employee updated', 'success');
        } else {
            await apiRequest('POST', '/employees', body);
            showToast('Employee added', 'success');
        }
        hideEmployeeForm();
        await renderEmployeesList();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function editEmployee(id) {
    await showEmployeeForm(id);
}

async function deleteEmployee(id) {
    if (!confirm('Delete this employee?')) return;
    try {
        await apiRequest('DELETE', `/employees/${id}`);
        showToast('Employee deleted', 'info');
        await renderEmployeesList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ── Departments ───────────────────────────────────────────────────────────────

async function renderDepartmentsList() {
    const container = document.getElementById('departments-list');
    container.innerHTML = '<p class="text-muted">Loading…</p>';

    const departments = await apiRequest('GET', '/departments');

    if (!departments.length) {
        container.innerHTML = '<div class="alert alert-info">No departments.</div>';
        return;
    }

    container.innerHTML = `
        <table class="table table-striped">
            <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
                ${departments.map(d => `
                    <tr>
                        <td>${d.name}</td>
                        <td>${d.description}</td>
                        <td class="table-actions">
                            <button class="btn btn-sm btn-outline-primary"
                                onclick="editDepartment(${d.id}, '${escHtml(d.name)}', '${escHtml(d.description)}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger"
                                onclick="deleteDepartment(${d.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

async function showDepartmentPrompt() {
    const name = prompt('Department name:');
    if (!name?.trim()) return;
    const description = prompt('Description (optional):') ?? '';
    try {
        await apiRequest('POST', '/departments', { name: name.trim(), description });
        showToast('Department created', 'success');
        await renderDepartmentsList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function editDepartment(id, currentName, currentDesc) {
    const name = prompt('Department name:', currentName);
    if (!name?.trim()) return;
    const description = prompt('Description:', currentDesc) ?? currentDesc;
    try {
        await apiRequest('PUT', `/departments/${id}`, { name: name.trim(), description });
        showToast('Department updated', 'success');
        await renderDepartmentsList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteDepartment(id) {
    if (!confirm('Delete this department? This will fail if employees are still assigned.')) return;
    try {
        await apiRequest('DELETE', `/departments/${id}`);
        showToast('Department deleted', 'info');
        await renderDepartmentsList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────────

async function renderAccountsList() {
    const container = document.getElementById('accounts-list');
    container.innerHTML = '<p class="text-muted">Loading…</p>';

    const accounts = await apiRequest('GET', '/accounts');

    if (!accounts.length) {
        container.innerHTML = '<div class="alert alert-info">No accounts.</div>';
        return;
    }

    container.innerHTML = `
        <table class="table table-striped">
            <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${accounts.map(acc => `
                    <tr>
                        <td>${acc.firstName} ${acc.lastName}</td>
                        <td>${acc.email}</td>
                        <td>${acc.role}</td>
                        <td>${acc.verified ? '✅' : '—'}</td>
                        <td class="table-actions">
                            <button class="btn btn-sm btn-outline-primary"
                                onclick="editAccount(${acc.id})">Edit</button>
                            <button class="btn btn-outline-warning"
                                onclick="resetPassword(${acc.id})">Reset Password</button>
                            <button class="btn btn-outline-danger"
                                onclick="deleteAccount(${acc.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

async function showAccountForm(accountId = null) {
    const container = document.getElementById('account-form-container');
    const form = document.getElementById('account-form');

    if (accountId) {
        try {
            const acc = await apiRequest('GET', `/accounts/${accountId}`);
            document.getElementById('acc-firstname').value = acc.firstName;
            document.getElementById('acc-lastname').value = acc.lastName;
            document.getElementById('acc-email').value = acc.email;
            document.getElementById('acc-password').value = '';
            document.getElementById('acc-role').value = acc.role;
            document.getElementById('acc-verified').checked = acc.verified;
            form.dataset.editId = accountId;
        } catch (err) {
            showToast(err.message, 'danger');
            return;
        }
    } else {
        form.reset();
        delete form.dataset.editId;
    }

    container.classList.remove('d-none');
}

function hideAccountForm() {
    document.getElementById('account-form-container').classList.add('d-none');
    document.getElementById('account-form').reset();
}

async function handleAccountSubmit(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    const form = document.getElementById('account-form');
    const editId = form.dataset.editId;
    const password = document.getElementById('acc-password').value;

    const body = {
        firstName: document.getElementById('acc-firstname').value.trim(),
        lastName: document.getElementById('acc-lastname').value.trim(),
        email: document.getElementById('acc-email').value.trim().toLowerCase(),
        role: document.getElementById('acc-role').value,
        verified: document.getElementById('acc-verified').checked,
    };

    if (password) {
        body.password = password;
        body.confirmPassword = password;
    }

    try {
        if (editId) {
            await apiRequest('PUT', `/accounts/${editId}`, body);
            showToast('Account updated', 'success');
        } else {
            if (!password) {
                showToast('Password is required for new accounts', 'danger');
                return;
            }
            await apiRequest('POST', '/accounts', body);
            showToast('Account created', 'success');
        }
        hideAccountForm();
        await renderAccountsList();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function editAccount(id) {
    await showAccountForm(id);
}

async function resetPassword(id) {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (newPassword === null) return;
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    try {
        await apiRequest('PUT', `/accounts/${id}`, {
            password: newPassword,
            confirmPassword: newPassword,
        });
        showToast('Password reset successfully', 'success');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteAccount(id) {
    if (currentUser && currentUser.id === id) {
        showToast('Cannot delete your own account', 'danger');
        return;
    }
    if (!confirm('Delete this account? This cannot be undone.')) return;

    try {
        await apiRequest('DELETE', `/accounts/${id}`);
        showToast('Account deleted', 'info');
        await renderAccountsList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ── Requests ──────────────────────────────────────────────────────────────────

async function renderRequestsList() {
    const container = document.getElementById('requests-list');
    container.innerHTML = '<p class="text-muted">Loading…</p>';

    const requests = await apiRequest('GET', '/requests');

    if (!requests.length) {
        container.innerHTML = `
            <div class="alert alert-info">
                You have no requests yet.<br>
                <button class="btn btn-success mt-2" onclick="showRequestModal()">
                    Create One
                </button>
            </div>`;
        return;
    }

    container.innerHTML = `
        <table class="table table-striped">
            <thead><tr><th>Date</th><th>Type</th><th>Items</th><th>Status</th></tr></thead>
            <tbody>
                ${requests.map(req => {
        const statusClass =
            req.status === 'Approved' ? 'success' :
                req.status === 'Rejected' ? 'danger' : 'warning';
        const itemsList = req.items.map(i => `${i.name} (${i.qty})`).join(', ');
        return `
                        <tr>
                            <td>${req.date}</td>
                            <td>${req.type}</td>
                            <td>${itemsList}</td>
                            <td><span class="badge bg-${statusClass}">${req.status}</span></td>
                        </tr>`;
    }).join('')}
            </tbody>
        </table>`;
}

function showRequestModal() {
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    document.getElementById('request-form').reset();
    document.getElementById('request-items').innerHTML = `
        <div class="input-group mb-2">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
            <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
            <button type="button" class="btn btn-danger remove-item" disabled>×</button>
        </div>`;
    modal.show();
}

function addRequestItem() {
    const container = document.getElementById('request-items');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
        <button type="button" class="btn btn-danger remove-item">×</button>`;
    div.querySelector('.remove-item').addEventListener('click', () => div.remove());
    container.appendChild(div);
}

async function handleRequestSubmit(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;

    const type = document.getElementById('req-type').value;
    const items = [];
    document.querySelectorAll('#request-items .input-group').forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value);
        if (name && qty > 0) items.push({ name, qty });
    });

    if (!items.length) {
        showToast('Please add at least one item', 'danger');
        if (btn) btn.disabled = false;
        return;
    }

    try {
        await apiRequest('POST', '/requests', { type, items });
        showToast('Request submitted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
        await renderRequestsList();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Escape a string for safe use inside an HTML attribute */
function escHtml(str) {
    return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
    }, 4000);
}