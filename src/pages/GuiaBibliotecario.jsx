import React from 'react';
import { Camera, Search, Sparkles, Save, QrCode, FileSpreadsheet, Smartphone, ShieldCheck, BellRing, Eye } from 'lucide-react';
import './GuiaBibliotecario.css';

const GuiaBibliotecario = () => {
  return (
    <div className="guia-container">
      <header className="guia-header">
        <h2>Guía del Bibliotecario 🧭</h2>
        <p>Aprende a dominar las herramientas mágicas del catálogo</p>
      </header>

      <main className="guia-main">
        <div className="guide-card">
          <div className="guide-icon-container bg-emerald">
            <Camera className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Paso 1: Escanear el Código (Opcional)</h3>
            <p>
              Utiliza el botón <strong>📷 Escanear ISBN</strong> para activar tu cámara web o la de tu celular.
              Apunta al código de barras del libro físico. El sistema detectará automáticamente el ISBN y completará el <strong>Título y el Autor</strong> de forma instantánea.
            </p>
            <div className="guide-tip">
              💡 <em>Tip:</em> Si el libro no tiene código de barras, simplemente escribe el Título manualmente en el formulario.
            </div>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container bg-slate">
            <Search className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Paso 2: Buscar Metadatos Visuales</h3>
            <p>
              Una vez que tienes el título del libro escrito, presiona el botón oscuro <strong>✨ Buscar Datos</strong>.
              Se abrirá el Buscador Mágico que conectará con bases de datos mundiales (Google Books y OpenLibrary).
            </p>
            <ul className="guide-list">
              <li>Visualiza múltiples portadas de distintas ediciones de todo el mundo.</li>
              <li>Pasa el mouse sobre la portada que más se parezca al libro real.</li>
              <li>Haz clic en <strong>✨ Importar Datos</strong> para rellenar la foto, el género y la sinopsis de inmediato.</li>
            </ul>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container bg-purple">
            <Sparkles className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Paso 3: Auto-Completar Sinopsis con IA</h3>
            <p>
              ¿La base de datos de libros no tenía un resumen o estaba en otro idioma? ¡No te preocupes! 
              Haz clic en la pastilla morada <strong>🪄 Auto-Generar con IA</strong> encima del campo de sinopsis.
            </p>
            <p>
              El sistema viajará internamente a Wikipedia, buscará el artículo oficial del libro y extraerá una redacción perfecta, limpia y profesional para pegarla en el recuadro.
            </p>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container bg-green">
            <Save className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Paso 4: Publicar y Ver</h3>
            <p>
              Revisa que todos los campos estén correctos y ajusta el inventario ("Stock") si tienes más de una copia.
              Finalmente, presiona el gran botón verde <strong>Añadir Libro</strong>.
            </p>
            <p>
              Si todo sale bien, verás una animación de celebración (Check) y serás enviado a la página principal para que admires cómo luce tu nuevo ejemplar publicado.
            </p>
          </div>
        </div>

        <h3 style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.5rem' }}>Nuevas Funcionalidades 🚀</h3>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <QrCode className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Gestión de Préstamos: Escáner QR</h3>
            <p>
              Ya no necesitas registrar manualmente los préstamos. En tu barra de navegación tienes el botón <strong>Escáner</strong>. 
            </p>
            <ul className="guide-list">
              <li>Pide al estudiante que abra su perfil y te muestre su <strong>QR de Retiro</strong>.</li>
              <li>Apunta con la cámara. Al leerlo, el préstamo se validará instantáneamente y saltará a su sección de "Libros Activos".</li>
            </ul>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <ShieldCheck className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Validación de Recompensas y Décimas</h3>
            <p>
              El sistema de Gamificación otorga décimas (+2, +4, +6) a los alumnos según su nivel de XP. Para evitar fraudes, tú eres el filtro validador:
            </p>
            <div className="guide-tip">
              ⚠️ <strong>Mecánica Antifraude:</strong><br/>
              1. El estudiante debe haber mantenido el libro <strong>al menos 2 días</strong> desde que se lo llevó.<br/>
              2. Al momento de que vengan a devolverlo para reclamar su XP/Décimas, <strong>debes hacerles preguntas breves sobre el libro</strong> (un interrogatorio flash).<br/>
              3. Si responden bien, tú mismo les indicas que pueden apretar su botón de "Devolver" en la App para sumar sus puntos. ¡Si no lo leyeron, diles que no les servirá la trampa!
            </div>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <FileSpreadsheet className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Reportes de Inventario en Excel</h3>
            <p>
              En la página principal (Inicio), al final de la pantalla debajo de las estadísticas, encontrarás un gran botón verde para <strong>Descargar Reporte Completo</strong>. 
              Este botón genera un Excel con columnas ordenadas, colores institucionales y totales de todo tu catálogo en un instante.
            </p>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
            <Smartphone className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Aplicación Instalable (PWA)</h3>
            <p>
              Esta plataforma es una <strong>PWA Nativa</strong>. Eso significa que no solo es una página web, ¡es una aplicación real! Dile a tus estudiantes que la abran en Google Chrome en sus celulares y presionen <strong>"Añadir a la pantalla de inicio" / "Instalar App"</strong>. La Biblioteca quedará instalada como una app normal, con su propio ícono y sin necesidad de abrir el navegador web.
            </p>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
            <BellRing className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Notificaciones de Stock (Lista de Espera)</h3>
            <p>
              Ahora los estudiantes pueden hacer clic en "Avisarme cuando esté disponible" si un libro está agotado.
            </p>
            <ul className="guide-list">
              <li>Verás estas solicitudes en el nuevo <strong>Centro de Alertas (Campanita)</strong> en tu menú principal.</li>
              <li>Cuando añadas stock (ya sea manualmente editando el libro o cuando alguien lo devuelva), el sistema les enviará mágicamente una notificación a todos los estudiantes en lista de espera avisando que ya pueden reservarlo.</li>
            </ul>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-icon-container" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            <Eye className="guide-icon" />
          </div>
          <div className="guide-content">
            <h3>Nuevos Modos de Accesibilidad</h3>
            <p>
              El sistema ahora cuenta con funciones especiales para personas con visión reducida o necesidades diferentes.
            </p>
            <ul className="guide-list">
              <li><strong>Modo Alto Contraste:</strong> En el menú inferior, el botón de Modo Oscuro ahora también tiene una opción de "Alto Contraste" con colores amarillo/negro diseñados médicamente para maximizar la legibilidad.</li>
              <li><strong>Vista de Lista:</strong> En la sección Buscar, hay dos iconos nuevos en la parte superior derecha para alternar entre "Cuadrícula" (normal) y "Lista" (para leer más fácil en pantallas pequeñas).</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
};

export default GuiaBibliotecario;
