# 📚 Biblioteca Universitaria ST - Sistema de Gestión Inteligente

![Estado del Proyecto](https://img.shields.io/badge/Estado-Terminado-success)
![Tecnología](https://img.shields.io/badge/Tecnología-React%20%7C%20Vite%20%7C%20Firebase-blue)
![PWA](https://img.shields.io/badge/Soporte-PWA_Nativa-purple)

Una plataforma web progresiva (PWA) diseñada para modernizar y gamificar la experiencia de gestión y reserva de libros dentro de una biblioteca institucional. Desarrollada con un diseño de interfaz de vanguardia (Glassmorphism) y potenciada por integraciones de Inteligencia Artificial y bases de datos en tiempo real.

---

## ✨ Funcionalidades Principales

### 🧑‍🎓 Módulo Estudiante
- **Catálogo Inteligente:** Búsqueda en tiempo real por título, categoría, disponibilidad y filtros combinados.
- **Reserva a 1 Clic:** Apartado de libros con validación de stock inmediata.
- **Sistema de Gamificación (XP):** Los estudiantes ganan experiencia por devolver libros a tiempo y suben de nivel (Principiante, Explorador, Ratón de Biblioteca, Erudito) para obtener décimas en sus evaluaciones.
- **Mecánica Antifraude y Penalizaciones:** Sistema automático de multas por atrasos que bloquea temporalmente al usuario.
- **Generación de QR de Retiro:** Al reservar un libro, se genera un código QR único que sirve como "llave" de retiro presencial.
- **Reseñas y Favoritos:** Posibilidad de calificar libros, guardar en favoritos y dejar retroalimentación a la comunidad.

### 🧙‍♂️ Módulo Bibliotecario (Administrador)
- **Dashboard Estadístico:** Panel de control con gráficos interactivos (Recharts) que muestran métricas vitales (stock crítico, distribuciones, préstamos activos).
- **Escáner Físico de QR y Código de Barras:** Uso de la cámara web/celular para aprobar retiros escaneando el celular del estudiante, o registrar libros usando el ISBN físico.
- **Auto-Completado de Metadatos:** Conexión con *Google Books* y *OpenLibrary API* para extraer portadas reales, autores y categorías al instante.
- **Generación de Sinopsis con IA:** Botón mágico que extrae automáticamente resúmenes literarios directamente desde Wikipedia si la base de datos oficial no posee descripción.
- **Reportes Gerenciales:** Botón de descarga para generar hojas de cálculo de Excel (`.xlsx`) limpias y ordenadas de todo el inventario con un clic.
- **Trazabilidad Absoluta:** Historial en tiempo real de quién registró un libro, quién lo retiró, y todos los movimientos críticos del sistema.

### 🛡️ Seguridad y Accesibilidad Institucional
- **Accesibilidad Universal (WCAG):** Modo de Alto Contraste inteligente integrado nativamente en el código para usuarios con dificultades visuales.
- **Filtro de Dominio Estricto:** El registro está bloqueado a nivel de sistema para aceptar únicamente correos institucionales oficiales (`@alumnos.santotomas.cl`).
- **Autenticación Inteligente:** Detección y asignación automática del nombre real del estudiante a partir del formato de su correo.
- **Privacidad Volátil:** Persistencia de sesión en memoria (la cuenta se cierra automáticamente por seguridad si el alumno olvida cerrar su navegador público).

---

## 🛠️ Tecnologías y Stack Utilizado

El proyecto fue construido bajo la arquitectura Jamstack, priorizando la velocidad, el diseño responsivo y la sincronización en vivo.

**Frontend:**
- **[React 18](https://reactjs.org/)**: Motor principal de la interfaz de usuario.
- **[Vite](https://vitejs.dev/)**: Empaquetador de módulos ultrarrápido.
- **[React Router DOM](https://reactrouter.com/)**: Enrutamiento protegido entre vistas.
- **Vanilla CSS (Glassmorphism)**: Diseño personalizado de estilo "cristalino", implementando variables globales y tema oscuro interactivo sin dependencias pesadas como Bootstrap.
- **PWA (Progressive Web App)**: Configuración vía `vite-plugin-pwa` para permitir instalación nativa en dispositivos iOS, Android y Windows.

**Backend y Base de Datos (BaaS):**
- **[Firebase Authentication](https://firebase.google.com/)**: Gestión de usuarios, sesiones y roles de seguridad (Admin vs User).
- **[Firebase Firestore](https://firebase.google.com/docs/firestore)**: Base de datos NoSQL en tiempo real para actualizar stocks y notificar a los usuarios en milisegundos.

**Librerías Clave Adicionales:**
- `html5-qrcode` & `qrcode.react`: Generación y lectura de códigos mediante hardware.
- `date-fns`: Humanización de fechas relativas ("Hace 2 días", "Vence en 5 días").
- `recharts`: Renderizado de gráficos de datos.
- `xlsx`: Exportación de bases de datos a formato de hoja de cálculo.
- `react-hot-toast`: Alertas dinámicas y amigables.

---

## 🚀 Instalación y Despliegue Local

Para ejecutar este proyecto en tu propia computadora o presentarlo para evaluación, sigue estos sencillos pasos:

### Prerrequisitos
- Tener [Node.js](https://nodejs.org/) instalado (versión 18+ recomendada).
- Contar con un proyecto en Firebase y poseer las variables de entorno (`apiKey`, `projectId`, etc.).

### Paso a paso

1. **Clonar/Abrir el repositorio:**
   ```bash
   cd Pagina-1
   ```

2. **Instalar Dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar el Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```

4. **Acceder:** 
   Abre tu navegador en `http://localhost:5173`. Para testear el rol de Bibliotecario se requiere iniciar sesión con una cuenta autorizada o marcada con el rol `admin` en la base de datos de Firebase.

---

## 📱 Modo PWA (Instalación Nativa)
Si deseas presentar la aplicación como un software de celular:
1. Asegúrate de estar ejecutando el proyecto (o haberlo desplegado a producción).
2. Entra a la página desde Google Chrome.
3. Busca el ícono de instalación en la barra de direcciones o presiona el botón "Añadir a la pantalla principal" en tu smartphone. La web se instalará como una app normal, con su propio ícono y sin necesidad de abrir el navegador web.

> Proyecto desarrollado como propuesta de mejora tecnológica y digitalización integral para bibliotecas institucionales.
