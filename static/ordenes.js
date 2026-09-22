(function () {
    'use strict';

    const vista = window.ORDENES_VISTA || 'mias';

    function $(id) { return document.getElementById(id); }

    function escapeHtml(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function render(ordenes) {
        const lista = $('ordenes-lista');
        $('ordenes-contador').textContent = ordenes.length + ' orden(es) abierta(s)';
        if (!ordenes.length) {
            lista.innerHTML = '<p class="vacio">No hay órdenes abiertas.</p>';
            return;
        }
        const filas = ordenes.map(function (orden) {
            const no = orden.no || orden.No || '';
            const href = '/OT-' + encodeURIComponent(no) + '?vista=' + encodeURIComponent(vista);
            return '<a class="orden-card" href="' + href + '">' +
                '<strong>' + escapeHtml(orden.idQr || ('OT-' + no)) + '</strong>' +
                '<span>' + escapeHtml(orden.descripcion || orden.Descripcion || 'Sin descripción') + '</span>' +
                '<span class="muted">' + escapeHtml(orden.recurso || orden.Recurso || '') + '</span>' +
                '</a>';
        }).join('');
        lista.innerHTML = filas;
    }

    async function cargar() {
        const error = $('ordenes-error');
        error.hidden = true;
        $('ordenes-lista').innerHTML = '<p class="muted">Cargando…</p>';
        try {
            const res = await fetch('/api/ordenes?vista=' + encodeURIComponent(vista));
            const data = await res.json();
            if (res.status === 401) return;
            if (!data.success && data.error) throw new Error(data.error);
            if (window.OrdenesAuth) window.OrdenesAuth.mostrarSupervisor(data.esSupervisor);
            render(data.ordenes || []);
        } catch (e) {
            error.textContent = e.message || String(e);
            error.hidden = false;
            $('ordenes-lista').innerHTML = '';
            $('ordenes-contador').textContent = '';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window.OrdenesAuth) window.OrdenesAuth.onReady(cargar);
    });
})();
