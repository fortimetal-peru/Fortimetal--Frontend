import { useEffect, useState } from "react";

// Splash de bienvenida: se muestra una sola vez al abrir la app (no depende
// de esperar ninguna respuesta del servidor, es puramente de marca) y luego
// se desvanece hacia el contenido real. Dura ~1.5s en total.
const VISIBLE_MS = 1200;
const FADE_MS = 350;

export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const doneTimer = setTimeout(() => onDone?.(), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={"fm-splash" + (fading ? " fm-splash--fading" : "")}>
      <img src="/logo.webp" alt="FORTIMETAL" className="fm-splash-logo" />
      <div className="fm-splash-title">FORTIMETAL</div>
      <div className="fm-splash-bar">
        <div className="fm-splash-bar-fill" />
      </div>
    </div>
  );
}
