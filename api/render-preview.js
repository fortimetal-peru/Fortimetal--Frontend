// Vercel Serverless Function: /api/render-preview
// Recibe la foto del cliente + las opciones elegidas (tipo de techo, color, cobertura),
// arma el prompt oculto y llama a Gemini 2.5 Flash Image ("Nano Banana") para editar
// la foto real y devolver una pre-visualización.
//
// La API key SIEMPRE vive en variables de entorno del servidor (Vercel > Settings >
// Environment Variables), nunca se manda al frontend.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb", // deja margen sobre la foto ya comprimida en el cliente
    },
  },
};

// Catálogo de coberturas soportadas. Ajusta esto según lo que ya maneja
// MaterialTakeoffCalculator.jsx para que las opciones coincidan 1 a 1.
const COVERAGE_LABELS = {
  calamina_galvanizada: "calamina galvanizada ondulada",
  calamina_trapezoidal_tr4: "calamina trapezoidal TR4",
  policarbonato: "plancha de policarbonato traslúcido",
  teja_andina: "teja andina de fibrocemento",
};

function buildPrompt({ roofType, coverage, color }) {
  const coverageLabel = COVERAGE_LABELS[coverage] || coverage;

  // El prompt es el "secreto" del feature: instruye a editar SOLO el techo,
  // preservando encuadre, iluminación y todo lo demás de la foto original.
  return [
    `Edita esta fotografía real de una construcción para mostrar cómo se vería`,
    `con un techo de tipo "${roofType}", usando ${coverageLabel} de color ${color}.`,
    `Modifica ÚNICAMENTE la cobertura del techo. Mantén exactamente igual el resto`,
    `de la imagen: paredes, fondo, iluminación, ángulo de cámara y proporciones.`,
    `El resultado debe verse como una fotografía realista, no como una ilustración.`,
  ].join(" ");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { imageBase64, mimeType, roofType, coverage, color } = req.body || {};

  if (!imageBase64 || !roofType || !coverage || !color) {
    return res.status(400).json({
      error: "Faltan datos: imageBase64, roofType, coverage y color son obligatorios",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor" });
  }

  const prompt = buildPrompt({ roofType, coverage, color });

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Error de Gemini:", errorBody);
      return res.status(502).json({ error: "El servicio de IA no respondió correctamente" });
    }

    const data = await geminiResponse.json();

    // Busca la primera parte de la respuesta que traiga una imagen generada.
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inline_data || p.inlineData);
    const inline = imagePart?.inline_data || imagePart?.inlineData;

    if (!inline?.data) {
      return res.status(502).json({ error: "La IA no devolvió una imagen" });
    }

    return res.status(200).json({
      imageBase64: inline.data,
      mimeType: inline.mime_type || inline.mimeType || "image/png",
    });
  } catch (err) {
    console.error("Error llamando a Gemini:", err);
    return res.status(500).json({ error: "No se pudo generar la pre-visualización" });
  }
}
