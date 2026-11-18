(function () {
    'use strict';

    const no = window.ORDEN_NO || '';
    let vista = window.ORDEN_VISTA || 'mias';
    let firmaCanvas = null;
    let firmaCtx = null;
    let firmaDibujando = false;
    let puedeEditar = false;

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

    function initFirmaCanvas() {
        firmaCanvas = $('firma-canvas');
        if (!firmaCanvas) return;
        firmaCtx = firmaCanvas.getContext('2d');
        firmaCtx.strokeStyle = '#003366';
        firmaCtx.lineWidth = 2;
        firmaCtx.lineCap = 'round';
        firmaCtx.lineJoin = 'round';

        function pos(e) {
            const rect = firmaCanvas.getBoundingClientRect();
            const scaleX = firmaCanvas.width / rect.width;
            const scaleY = firmaCanvas.height / rect.height;
            const src = e.touches ? e.touches[0] : e;
            return {
                x: (src.clientX - rect.left) * scaleX,
                y: (src.clientY - rect.top) * scaleY,
            };
        }

        function start(e) {
            firmaDibujando = true;
            const p = pos(e);
            firmaCtx.beginPath();
            firmaCtx.moveTo(p.x, p.y);
            e.preventDefault();
        }

        function move(e) {
            if (!firmaDibujando) return;
            const p = pos(e);
            firmaCtx.lineTo(p.x, p.y);
            firmaCtx.stroke();
            e.preventDefault();
        }

        function end() {
            firmaDibujando = false;
        }

        firmaCanvas.addEventListener('mousedown', start);
        firmaCanvas.addEventListener('mousemove', move);
        firmaCanvas.addEventListener('mouseup', end);
        firmaCanvas.addEventListener('mouseleave', end);
        firmaCanvas.addEventListener('touchstart', start, { passive: false });
        firmaCanvas.addEventListener('touchmove', move, { passive: false });
        firmaCanvas.addEventListener('touchend', end);

        $('btn-firma-limpiar').addEventListener('click', function () {
            firmaCtx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height);
        });
    }

    function canvasTieneTrazo() {
        if (!firmaCtx || !firmaCanvas) return false;
        const data = firmaCtx.getImageData(0, 0, firmaCanvas.width, firmaCanvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return true;
        }
        return false;
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
            fila('Tipo', orden.tipo || orden.Tipo) +
            fila('Firma', orden.firmaFirmada ? (orden.fechaFirmaTecnico || 'Registrada') : '');

        const lineas = data.lineas || orden.lineas || [];
        const cuerpo = $('detalle-lineas');
        puedeEditar = data.puedeEditar === true && vista === 'mias';
        if (!lineas.length) {
            cuerpo.innerHTML = '<tr><td colspan="3">Sin líneas</td></tr>';
        } else {
            cuerpo.innerHTML = lineas.map(function (lin) {
                const desc = lin.descripcion || lin.Descripcion || lin.nombre || '';
                const cantidad = lin.cantidad != null ? lin.cantidad : (lin.Cantidad || 0);
                const numeroLinea = lin.linea != null ? lin.linea : '';
                const cantidadHtml = puedeEditar
                    ? '<input class="cantidad-input" type="number" min="0" step="any" inputmode="decimal"' +
                        ' data-linea="' + escapeHtml(numeroLinea) + '" value="' + escapeHtml(cantidad) + '"' +
                        ' aria-label="Cantidad de ' + escapeHtml(desc) + '">'
                    : escapeHtml(cantidad);
                return '<tr><td>' + escapeHtml(lin.codigo || lin.Codigo || '') + '</td>' +
                    '<td>' + escapeHtml(desc) + '</td>' +
                    '<td>' + cantidadHtml + '</td></tr>';
            }).join('');
        }
        $('acciones-edicion').hidden = !puedeEditar || !lineas.length;
        $('btn-finalizar').hidden = data.puedeFinalizar !== true || vista !== 'mias' || !lineas.length;

        const firmada = orden.firmaFirmada === true || data.firmaFirmada === true;
        const puedeFirmar = data.puedeFirmar === true && vista === 'mias' && !firmada;
        $('bloque-firma').hidden = !puedeFirmar;
        $('firma-ok').hidden = !firmada;
        $('btn-firmar').hidden = !puedeFirmar;

        const puede = data.puedeValorar === true ||
            (vista === 'supervisar' && data.puedeValorar !== false && (orden.estado || 'Abierto') === 'Abierto');
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

    async function firmar() {
        if (!canvasTieneTrazo()) {
            alert('Dibuja tu firma antes de confirmar.');
            return;
        }
        if (!confirm('¿Registrar la firma en esta orden de trabajo?')) return;
        const boton = $('btn-firmar');
        boton.disabled = true;
        const error = $('detalle-error');
        error.hidden = true;
        try {
            const firma = firmaCanvas.toDataURL('image/png');
            const res = await fetch('/api/ordenes/' + encodeURIComponent(no) + '/firmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firma: firma }),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || 'No se pudo firmar');
            await cargar();
        } catch (e) {
            error.textContent = e.message || String(e);
            error.hidden = false;
            boton.disabled = false;
        }
    }

    function leerLineas() {
        return Array.from(document.querySelectorAll('.cantidad-input')).map(function (input) {
            if (!input.dataset.linea) throw new Error('Falta el identificador de una línea.');
            const cantidad = Number(input.value);
            if (!Number.isFinite(cantidad) || cantidad < 0) {
                throw new Error('Revisa las cantidades: deben ser números iguales o mayores que cero.');
            }
            return { linea: Number(input.dataset.linea), cantidad: cantidad };
        });
    }

    async function actualizar(finalizar) {
        if (!puedeEditar) return;
        if (finalizar && !confirm('¿Finalizar esta orden? Ya no podrás modificar sus cantidades y pasará al supervisor.')) {
            return;
        }
        const error = $('detalle-error');
        const mensaje = $('detalle-mensaje');
        const btnGuardar = $('btn-guardar');
        const btnFinalizar = $('btn-finalizar');
        error.hidden = true;
        mensaje.hidden = true;
        btnGuardar.disabled = true;
        btnFinalizar.disabled = true;
        try {
            const res = await fetch('/api/ordenes/' + encodeURIComponent(no), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineas: leerLineas(), finalizar: finalizar }),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) {
                throw new Error(data.error || data.mensaje || 'No se pudo actualizar la orden');
            }
            if (finalizar) {
                window.location.assign('/');
                return;
            }
            mensaje.textContent = data.mensaje || 'Cambios guardados.';
            mensaje.hidden = false;
            await cargar();
        } catch (e) {
            error.textContent = e.message || String(e);
            error.hidden = false;
        } finally {
            btnGuardar.disabled = false;
            btnFinalizar.disabled = false;
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
        initFirmaCanvas();
        $('btn-guardar').addEventListener('click', function () { actualizar(false); });
        $('btn-finalizar').addEventListener('click', function () { actualizar(true); });
        $('btn-firmar').addEventListener('click', firmar);
        $('btn-valorar').addEventListener('click', valorar);
        if (window.OrdenesAuth) window.OrdenesAuth.onReady(cargar);
    });
})();
