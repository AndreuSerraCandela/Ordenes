(function () {
    'use strict';

    const no = window.ORDEN_NO || '';
    let vista = window.ORDEN_VISTA || 'mias';

    function $(id) { return document.getElementById(id); }

    function escapeHtml(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fila(etiqueta, valor) {
        if (!valor) return '';
        return '<div><dt>' + escapeHtml(etiqueta) + '</dt><dd>' + escapeHtml(valor) + '</dd></div>';
    }

    function pintar(data) {
        const orden = data.orden || data;
        $('detalle').hidden = false;
        $('detalle-titulo').textContent = orden.idQr || ('OT-' + (orden.no || no));
        $('detalle-estado').textContent = orden.estado || orden.Estado || '';
        $('detalle-datos').innerHTML =
            fila('Descripción', orden.descripcion || orden.Descripcion) +
            fila('Recurso', orden.recurso || orden.Recurso) +
            fila('Dirección', orden.direccion || orden.Direccion) +
            fila('Tipo', orden.tipo || orden.Tipo);
        const lineas = data.lineas || [];
        const cuerpo = $('detalle-lineas');
        if (!lineas.length) {
            cuerpo.innerHTML = '<tr><td colspan="3">Sin líneas</td></tr>';
        } else {
            cuerpo.innerHTML = lineas.map(function (lin) {
                return '<tr><td>' + escapeHtml(lin.codigo || lin.Codigo || '') + '</td>' +
                    '<td>' + escapeHtml(lin.descripcion || lin.Descripcion || '') + '</td>' +
                    '<td>' + escapeHtml(lin.cantidad != null ? lin.cantidad : (lin.Cantidad || '')) + '</td></tr>';
            }).join('');
        }
        const puede = data.puedeValorar === true || (vista === 'supervisar' && data.puedeValorar !== false && (orden.estado || 'Abierto') === 'Abierto');
        $('btn-valorar').hidden = !puede;
        if (vista === 'supervisar') $('enlace-volver').setAttribute('href', '/supervisar');
    }

    async function cargar() {
        const error = $('detalle-error');
        error.hidden = true;
        try {
            const res = await fetch('/api/ordenes/' + encodeURIComponent(no) + '?vista=' + encodeURIComponent(vista));
            const data = await res.json();
            if (res.status === 401) return;
            if (!res.ok || data.success === false) throw new Error(data.error || data.mensaje || 'No se ha podido abrir la orden');
            if (window.OrdenesAuth && data.esSupervisor) window.OrdenesAuth.mostrarSupervisor(true);
            pintar(data);
        } catch (e) {
            error.textContent = e.message || String(e);
            error.hidden = false;
        }
    }

    async function valorar() {
        if (!confirm('¿Dar el ok a esta orden? Dejará de aparecer para el operario.')) return;
        const boton = $('btn-valorar');
        boton.disabled = true;
        try {
            const res = await fetch('/api/ordenes/' + encodeURIComponent(no) + '/valorar', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || 'No se pudo valorar');
            window.location.assign('/supervisar');
        } catch (e) {
            const error = $('detalle-error');
            error.textContent = e.message || String(e);
            error.hidden = false;
            boton.disabled = false;
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        $('btn-valorar').addEventListener('click', valorar);
        if (window.OrdenesAuth) window.OrdenesAuth.onReady(cargar);
    });
})();
