import React from 'react';
import { Camera, Search, Sparkles, Save } from 'lucide-react';
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
      </main>
    </div>
  );
};

export default GuiaBibliotecario;
