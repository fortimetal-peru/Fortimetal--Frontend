// Bloque de marca: logo + lema, con fondo tipo "metal cepillado".
// Se usa en el Inicio público (App.jsx) y en el Dashboard del cliente
// logueado. Acepta overrides por si más adelante el perfil de la
// empresa trae su propio logo/lema desde el backend; si no llega
// nada, cae en los valores fijos del diseño de referencia.
export default function BrandHero({
  logoUrl = "/logo.webp",
  title = "LA FUERZA DEL METAL",
  subtitle = "EN TUS PROYECTOS",
}) {
  return (
    <div className="fm-hero">
      <img src={logoUrl} alt="FORTIMETAL" className="fm-hero-logo" />
      <h2 className="fm-hero-title">{title}</h2>
      <p className="fm-hero-subtitle">
        <span className="fm-hero-line" aria-hidden="true" />
        {subtitle}
        <span className="fm-hero-line" aria-hidden="true" />
      </p>
    </div>
  );
}
