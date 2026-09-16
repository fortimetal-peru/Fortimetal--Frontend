import { useEffect, useRef, useState } from "react";

// Carrusel de banners, pensado para ir justo debajo de la cabecera.
// Recibe hasta 6 imágenes (o las que sea) vía la prop `images`; si no
// se le pasa nada, usa 6 espacios reservados en /public/banner-1.webp
// a banner-6.webp. Mientras esos archivos no existan, cada slide
// muestra un fondo con el número, para que se note dónde va cada
// imagen sin que el carrusel se vea roto.
const DEFAULT_IMAGES = Array.from({ length: 6 }, (_, i) => ({
  src: `/banner-${i + 1}.webp`,
  alt: `Banner ${i + 1}`,
}));

const AUTO_ADVANCE_MS = 4500;

export default function PromoCarousel({ images = DEFAULT_IMAGES }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState({});
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);
  const timerRef = useRef(null);

  const count = images.length;

  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timerRef.current);
  }, [count]);

  const restartTimer = () => {
    clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
  };

  const goTo = (i) => {
    setIndex(((i % count) + count) % count);
    restartTimer();
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 40) {
      goTo(index + (touchDeltaX.current < 0 ? 1 : -1));
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  if (!count) return null;

  return (
    <div
      className="fm-carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="fm-carousel-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((img, i) => (
          <div className="fm-carousel-slide" key={img.src || i}>
            <div className="fm-carousel-slide-fallback">{img.alt || `Banner ${i + 1}`}</div>
            {!broken[i] && (
              <img
                src={img.src}
                alt={img.alt || ""}
                className="fm-carousel-img"
                onError={() => setBroken((b) => ({ ...b, [i]: true }))}
              />
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="fm-carousel-dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir al banner ${i + 1}`}
              className={"fm-carousel-dot" + (i === index ? " fm-carousel-dot--active" : "")}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
