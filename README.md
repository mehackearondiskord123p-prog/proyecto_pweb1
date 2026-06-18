# Analizador y Graficador de Funciones Matemáticas

Este proyecto consiste en una aplicación web interactiva y responsiva que permite a los usuarios ingresar funciones matemáticas de una variable para su posterior visualización gráfica y análisis analítico elemental. La herramienta calcula de forma automática la presencia de asíntotas verticales y detecta los extremos locales (máximos y mínimos) dentro del rango de visualización seleccionado correspondiente al eje X. 

## Tecnologías Utilizadas

* **HTML5 y CSS3:** Estructuración semántica y estilos personalizados para el lienzo de dibujo.
* **Tailwind CSS:** Framework de diseño basado en clases de utilidad para el maquetado responsivo.
* **Math.js:** Motor algebraico encargado del parseo, compilación y evaluación segura de las expresiones matemáticas introducidas en formato de cadena de texto.
* **Chart.js:** Librería de renderizado basada en HTML5 Canvas utilizada bajo el esquema de diagramas de dispersión (Scatter) para el trazado de curvas reales.

## Estructura del Proyecto

El proyecto está compuesto por tres archivos principales organizados de forma desacoplada:

```text
├── index.html   # Estructura de la interfaz y carga de dependencias vía CDN.
├── styles.css   # Reglas de estilos complementarias y animaciones de la interfaz.
└── script.js    # Lógica de cálculo numérico, manipulación del DOM y configuración de Chart.js.
