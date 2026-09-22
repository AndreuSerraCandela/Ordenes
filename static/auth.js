/**
 * Acceso con usuario GTask.
 */
(function () {
    'use strict';

    const estado = { autenticado: false, usuarioActual: null, esSupervisor: false };
    const readyCallbacks = [];

    function $(id) { return document.getElementById(id); }

    function onReady(fn) {
        if (typeof fn !== 'function') return;
        if (estado.autenticado) {
            fn(estado.usuarioActual);
            return;
        }
        readyCallbacks.push(fn);
    }

    function notifyReady() {
        while (readyCallbacks.length) {
            try { readyCallbacks.shift()(estado.usuarioActual); } catch (e) { console.error(e); }
        }
    }

    function mostrarSupervisor(valor) {
        estado.esSupervisor = !!valor;
        const link = $('nav-supervisar');
        if (link) link.hidden = !estado.esSupervisor;
    }

    function actualizarUI() {
        const loginIcon = $('login-icon');
        const userIcon = $('user-icon');
        const userName = $('user-name');
        if (!loginIcon || !userIcon) return;
        if (estado.autenticado && estado.usuarioActual) {
            loginIcon.style.display = 'none';
            userIcon.style.display = 'flex';
            if (userName) {
                userName.textContent = estado.usuarioActual.name || estado.usuarioActual.username || 'Usuario';
            }
        } else {
            loginIcon.style.display = 'flex';
            userIcon.style.display = 'none';
            if (userName) userName.textContent = '';
        }
    }

    function mostrarLogin() {
        const modal = $('login-modal');
        if (modal) modal.style.display = 'block';
    }

    function cerrarModal() {
        const modal = $('login-modal');
        const errorDiv = $('login-error');
        const form = $('login-form');
        if (modal) modal.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (form) form.reset();
    }

    async function realizarLogin(e) {
        if (e) e.preventDefault();
        const errorDiv = $('login-error');
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: ($('username') && $('username').value) || '',
                    password: ($('password') && $('password').value) || '',
                }),
            });
            const data = await response.json();
            if (!data.success) {
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Error en el login';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            estado.autenticado = true;
            estado.usuarioActual = data.user_data;
            actualizarUI();
            cerrarModal();
            if (data.next) {
                window.location.assign(data.next);
                return;
            }
            notifyReady();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = 'Error de conexión';
                errorDiv.style.display = 'block';
            }
        }
    }

    async function cerrarSesion() {
        if (!estado.autenticado) {
            mostrarLogin();
            return;
        }
        if (!confirm('¿Cerrar sesión?')) return;
        await fetch('/api/logout', { method: 'POST' });
        window.location.assign('/');
    }

    async function verificar() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();
            estado.autenticado = !!(data.success && data.authenticated);
            estado.usuarioActual = data.user_data || null;
            mostrarSupervisor(data.es_supervisor);
            actualizarUI();
            if (estado.autenticado) notifyReady();
            else if (window.ORDENES_REQUIRE_LOGIN) mostrarLogin();
        } catch (e) {
            actualizarUI();
            if (window.ORDENES_REQUIRE_LOGIN) mostrarLogin();
        }
    }

    function init() {
        const form = $('login-form');
        const closeBtn = $('login-modal-close');
        const modal = $('login-modal');
        if ($('login-icon')) $('login-icon').addEventListener('click', mostrarLogin);
        if ($('user-icon')) $('user-icon').addEventListener('click', cerrarSesion);
        if (form) form.addEventListener('submit', realizarLogin);
        if (closeBtn) closeBtn.addEventListener('click', cerrarModal);
        if (modal) {
            window.addEventListener('click', function (e) {
                if (e.target === modal && estado.autenticado) cerrarModal();
            });
        }
        verificar();
    }

    window.OrdenesAuth = {
        onReady: onReady,
        mostrarSupervisor: mostrarSupervisor,
        get autenticado() { return estado.autenticado; },
    };

    document.addEventListener('DOMContentLoaded', init);
})();
