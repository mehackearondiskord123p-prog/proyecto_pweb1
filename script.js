// Variable global para guardar la instancia del gráfico y poder destruirla/actualizarla
let chartInstance = null;

// Escuchar el evento de clic del botón y la carga inicial de la página
document.getElementById('btnGraficar').addEventListener('click', procesarFuncion);
window.onload = procesarFuncion;

// Escuchar el evento de clic para descargar la imagen
document.getElementById('btnDescargar').addEventListener('click', descargarGrafica);

function procesarFuncion() {
    const funcionTexto = document.getElementById('funcion').value;
    const xMin = parseFloat(document.getElementById('xMin').value);
    const xMax = parseFloat(document.getElementById('xMax').value);

    const numPuntos = 400; // Alta densidad de muestreo para precisión matemática
    const paso = (xMax - xMin) / numPuntos;

    let dataPoints = [];
    let asintotasVerticales = [];
    let maximos = [];
    let minimos = [];

    try {
        // Compilar la expresión algebraica utilizando Math.js
        const node = math.parse(funcionTexto);
        const code = node.compile();

        // Paso 1: Muestreo de datos en bruto y validación de dominios
        let puntosCrudos = [];
        for (let i = 0; i <= numPuntos; i++) {
            let x = xMin + i * paso;
            // Corregir imprecisiones de coma flotante del JS
            x = Math.round(x * 10000) / 10000; 
            
            try {
                let y = code.evaluate({ x: x });
                
                // Asegurar que el resultado evaluado sea un número real computable
                if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
                    puntosCrudos.push({ x, y });
                } else {
                    puntosCrudos.push({ x, y: null });
                }
            } catch (e) {
                puntosCrudos.push({ x, y: null });
            }
        }

        // Paso 2: Filtrado de curvas y detección de Asíntotas Verticales
        for (let i = 0; i < puntosCrudos.length; i++) {
            let actual = puntosCrudos[i];
            let previo = puntosCrudos[i - 1];

            if (actual.y !== null) {
                // Si el salto en Y es gigantesco respecto al rango de visualización y cambia de signo: hay asíntota
                if (previo && previo.y !== null && Math.abs(actual.y - previo.y) > (xMax - xMin) * 10) {
                    if (Math.sign(actual.y) !== Math.sign(previo.y)) {
                        let xAsin = Math.round(((actual.x + previo.x) / 2) * 100) / 100;
                        if (!asintotasVerticales.includes(xAsin)) asintotasVerticales.push(xAsin);
                        
                        // Añadir un NaN rompe limpiamente la línea de la gráfica en Chart.js en lugar de cruzar verticalmente
                        dataPoints.push({ x: actual.x, y: NaN }); 
                    }
                }
                dataPoints.push(actual);
            } else if (previo && previo.y !== null) {
                if (!asintotasVerticales.includes(actual.x)) asintotasVerticales.push(actual.x);
            }
        }

        // Paso 3: Análisis de extremos locales (cambios de pendiente/monotonía)
        for (let i = 1; i < dataPoints.length - 1; i++) {
            let pAnt = dataPoints[i - 1];
            let pAct = dataPoints[i];
            let pSig = dataPoints[i + 1];

            if (pAnt.y !== undefined && pAct.y !== undefined && pSig.y !== undefined && 
                !isNaN(pAnt.y) && !isNaN(pAct.y) && !isNaN(pSig.y)) {
                
                // Criterio de primera derivada discreta para Máximo Local
                if (pAct.y > pAnt.y && pAct.y > pSig.y) {
                    maximos.push({ x: pAct.x, y: Math.round(pAct.y * 100) / 100 });
                }
                // Criterio de primera derivada discreta para Mínimo Local
                if (pAct.y < pAnt.y && pAct.y < pSig.y) {
                    minimos.push({ x: pAct.x, y: Math.round(pAct.y * 100) / 100 });
                }
            }
        }

        // Paso 4: Renderizar paneles de texto informativos
        renderizarPanelesInfo(asintotasVerticales, maximos, minimos);

        // Paso 5: Dibujar el gráfico interactivo en el lienzo canvas
        renderizarGrafico(dataPoints, asintotasVerticales, maximos, minimos, xMin, xMax);

    } catch (error) {
        alert("Error sintáctico. Verifica la entrada de la función (ej. usa '*' para multiplicar si es necesario, ej: 4*x).");
        console.error(error);
    }
}

function renderizarPanelesInfo(asintotas, maximos, minimos) {
    const asinDiv = document.getElementById('asintotasResult');
    const extDiv = document.getElementById('extremosResult');

    // Construcción dinámica de HTML para Asíntotas
    if (asintotas.length === 0) {
        asinDiv.innerHTML = `<p class="text-gray-400 italic">No se detectaron asíntotas verticales evidentes en este intervalo.</p>`;
    } else {
        asinDiv.innerHTML = asintotas.map(x => `
            <p class="font-mono bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100 flex justify-between">
                <span>Línea de discontinuidad:</span> <b>x = ${x}</b>
            </p>`).join('');
    }

    // Construcción dinámica de HTML para Extremos
    if (maximos.length === 0 && minimos.length === 0) {
        extDiv.innerHTML = `<p class="text-gray-400 italic">No se hallaron máximos ni mínimos locales en este intervalo.</p>`;
    } else {
        let html = '';
        maximos.forEach(m => {
            html += `
            <p class="font-mono bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100">
                 <span class="font-semibold">Máximo Local:</span> (${m.x}, ${m.y})
            </p>`;
        });
        minimos.forEach(m => {
            html += `
            <p class="font-mono bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                 <span class="font-semibold">Mínimo Local:</span> (${m.x}, ${m.y})
            </p>`;
        });
        extDiv.innerHTML = html;
    }
}

function renderizarGrafico(dataPoints, asintotas, maximos, minimos, xMin, xMax) {
    const ctx = document.getElementById('graficoCanvas').getContext('2d');

    // Si ya existe un gráfico previo, destruirlo para evitar superposiciones visuales al redibujar
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Configuración estructural de colecciones de datos (Datasets)
    let datasets = [{
        label: 'f(x)',
        data: dataPoints,
        borderColor: '#4f46e5',
        borderWidth: 3,
        pointRadius: 0, // Ocultar puntos individuales de la curva continua
        fill: false,
        showLine: true
    }];

    // Agregar las rectas verticales punteadas correspondientes a las asíntotas
    asintotas.forEach(xAsin => {
        datasets.push({
            label: `AV: x=${xAsin}`,
            data: [{ x: xAsin, y: -1000 }, { x: xAsin, y: 1000 }],
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderDash: [6, 6], // Formato punteado de la recta
            pointRadius: 0,
            showLine: true
        });
    });

    // Añadir marcas estéticas para los Máximos
    if (maximos.length > 0) {
        datasets.push({
            label: 'Máximos',
            data: maximos,
            backgroundColor: '#ef4444',
            pointRadius: 6,
            pointHoverRadius: 8
        });
    }

    // Añadir marcas estéticas para los Mínimos
    if (minimos.length > 0) {
        datasets.push({
            label: 'Mínimos',
            data: minimos,
            backgroundColor: '#3b82f6',
            pointRadius: 6,
            pointHoverRadius: 8
        });
    }

    // Instanciar Chart.js bajo un esquema Scatter (Dispersión) linealizado
    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: xMin,
                    max: xMax,
                    // Borde exterior del eje X resaltado en negro
                    border: {
                        color: '#000000',
                        width: 3
                    },
                    grid: { 
                        color: function(context) {
                            // Si la línea de la cuadrícula cruza por el cero, la pinta de negro
                            if (context.tick.value === 0) {
                                return '#000000';
                            }
                            return '#e5e7eb'; // Gris claro para el resto
                        },
                        lineWidth: function(context) {
                            return context.tick.value === 0 ? 2 : 1; // Eje central más grueso
                        }
                    }
                },
                y: {
                    type: 'linear',
                    min: -15,
                    max: 15,
                    // Borde exterior del eje Y resaltado en negro
                    border: {
                        color: '#000000',
                        width: 3
                    },
                    grid: { 
                        color: function(context) {
                            // Si la línea de la cuadrícula cruza por el cero, la pinta de negro
                            if (context.tick.value === 0) {
                                return '#000000';
                            }
                            return '#e5e7eb';
                        },
                        lineWidth: function(context) {
                            return context.tick.value === 0 ? 2 : 1;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        filter: function(item) {
                            // Ocultar las etiquetas de cada asíntota de la leyenda principal
                            return !item.text.includes('AV:');
                        }
                    }
                }
            }
        }
    });
}
