/**
 * Calculadora de metrados y despiece por tipo de estructura.
 *
 * IMPORTANTE: son fórmulas de estimación rápida de campo basadas en supuestos
 * constructivos típicos (documentados junto a cada constante). NO reemplazan
 * un metrado detallado ni un cálculo estructural — sirven para llegar a obra
 * o a la reunión con el cliente con una lista de materiales aproximada en
 * segundos, en vez de calcularla a mano. Todas las funciones son puras
 * (sin acceso a DOM/localStorage) para poder probarlas de forma aislada.
 */

// ---------------------------------------------------------------------------
// Supuestos constructivos por defecto (ajustables por parámetro en cada función)
// ---------------------------------------------------------------------------
export const DEFAULTS = {
  TUBE_STANDARD_LENGTH_M: 6.0, // largo comercial estándar de un tubo/perfil en Perú
  TUBE_CUT_WASTE_FACTOR: 1.05, // 5% de merma por cortes y desperdicio
  USEFUL_SHEET_WIDTH_M: 0.80, // ancho útil de cobertura TR-4 tras el traslape lateral
  VERTICAL_OVERLAP_M: 0.20, // traslape vertical entre planchas cuando la agua es más larga que 1 plancha
  SHEET_LENGTH_OPTIONS_M: [1.83, 2.44, 3.05, 3.66, 4.88, 6.00], // largos comerciales típicos de plancha
  ROOF_PITCH_FACTOR: 1.05, // factor que alarga la "agua" por la pendiente del techo (~10% pendiente)
  SCREWS_PER_PURLIN_CROSSING: 3, // pernos autoperforantes por cruce plancha-correa (ancho de plancha)
  SCREW_WASTE_FACTOR: 1.10, // 10% extra de pernos (piezas dañadas, ajustes en obra)
  TUBE_PERIMETER_M: { "2x1": 0.15, "2x2": 0.20, "1.5x1.5": 0.15 }, // perímetro desarrollado por perfil, para pintar
  PAINT_COATS: 2, // manos de pintura anticorrosiva
  PAINT_YIELD_M2_PER_GALLON: 35, // rendimiento típico de anticorrosivo, m² por galón por mano
  PAINT_PRESENTATION_GAL: 0.25, // se compra en fracciones de 1/4 galón
  WELD_JOINTS_PER_TRUSS: 4, // uniones soldadas típicas por tijeral (2 en base, 2 en cumbrera/nudos principales)
  WELD_KG_PER_JOINT: 0.12, // kg de electrodo por unión soldada típica en perfil liviano
  TRUSS_MEMBER_FACTOR: 1.3, // los tijerales llevan diagonales/verticales además de las cuerdas; factor sobre el largo de agua
  FENCE_POST_SPACING_M: 2.5, // separación típica entre postes de cerco
  FENCE_MESH_KG_PER_M2: 3.5, // peso aproximado de malla/paño por m² (referencial)
  PARABOLIC_ARC_FACTOR: 1.18, // una cobertura curva (arco/parabólico) desarrolla más superficie que
  // un techo a dos aguas de pendiente baja — aproximación para flecha típica ~1/6 de la luz.
  RAILING_POST_SPACING_M: 1.2, // separación típica de postes en baranda de escalera/balcón
  RAILING_RAIL_LINES: 2, // pasamanos + travesaño intermedio (líneas horizontales de tubo)
  GRILLE_BAR_SPACING_M: 0.12, // separación entre barrotes verticales de una reja de seguridad típica
  GATE_BAR_SPACING_M: 0.15, // separación entre barrotes de un portón (algo más abierta que una reja)
  GATE_HINGES: 3, // bisagras típicas de un portón batiente de una hoja
  LIFT_GATE_RAIL_EXTRA_M: 1.0, // tramo horizontal de riel hacia el techo, además de la altura del vano
};

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// TECHOS (galpón, techo parabólico) — el caso más completo
// ---------------------------------------------------------------------------

/** Cantidad de tijerales (pórticos): uno cada `trussSpacingM`, cerrando ambos extremos. */
export function computeTrussCount(lengthM, trussSpacingM) {
  if (lengthM <= 0 || trussSpacingM <= 0) return 0;
  return Math.ceil(lengthM / trussSpacingM) + 1;
}

/**
 * Largo de "agua" (la pendiente del techo) según el tipo:
 * - una_agua: una sola pendiente cubre todo el ancho.
 * - dos_aguas: dos pendientes, cada una cubre la mitad del ancho (a dos aguas / gable).
 * Se aplica un factor de pendiente porque el techo inclinado es más largo que la
 * proyección horizontal (para pendientes bajas, ~5-15%, esta aproximación es suficiente).
 */
export function computeSlopeLength(widthM, roofType = "dos_aguas", pitchFactor = DEFAULTS.ROOF_PITCH_FACTOR) {
  // "una_agua" y "parabolico" cubren todo el ancho con una sola superficie continua;
  // "dos_aguas" reparte el ancho en dos aguas iguales que bajan desde la cumbrera.
  const baseWidth = roofType === "dos_aguas" ? widthM / 2 : widthM;
  return round2(baseWidth * pitchFactor);
}

export function numberOfSlopes(roofType = "dos_aguas") {
  return roofType === "dos_aguas" ? 2 : 1;
}

/** Factor de alargamiento por curvatura/pendiente según el tipo de techo. */
export function getPitchFactor(roofType = "dos_aguas") {
  return roofType === "parabolico" ? DEFAULTS.PARABOLIC_ARC_FACTOR : DEFAULTS.ROOF_PITCH_FACTOR;
}

/**
 * Despiece de cobertura (calaminas/TR-4): cuántas planchas, considerando traslape
 * lateral (ancho útil) y traslape vertical (cuando el agua es más larga que 1 plancha).
 */
export function computeSheetTakeoff({
  lengthM,
  widthM,
  roofType = "dos_aguas",
  sheetLengthM = 3.66,
  usefulWidthM = DEFAULTS.USEFUL_SHEET_WIDTH_M,
  verticalOverlapM = DEFAULTS.VERTICAL_OVERLAP_M,
  pitchFactor = DEFAULTS.ROOF_PITCH_FACTOR,
}) {
  const slopeLength = computeSlopeLength(widthM, roofType, pitchFactor);
  const slopes = numberOfSlopes(roofType);

  const effectiveCoveragePerCourse = sheetLengthM - verticalOverlapM;
  const coursesPerSlope = Math.max(1, Math.ceil(slopeLength / effectiveCoveragePerCourse));
  const positionsPerSlope = Math.max(1, Math.ceil(lengthM / usefulWidthM));

  const sheetsPerSlope = positionsPerSlope * coursesPerSlope;
  const totalSheets = sheetsPerSlope * slopes;

  return {
    slopeLength,
    slopes,
    coursesPerSlope,
    positionsPerSlope,
    sheetLengthM,
    totalSheets,
  };
}

/**
 * Despiece de tubo/perfil para la estructura: tijerales + correas, convertido a
 * "tiras" del largo comercial estándar (con merma de corte incluida).
 */
export function computeTubeTakeoff({
  lengthM,
  widthM,
  roofType = "dos_aguas",
  trussSpacingM,
  purlinSpacingM,
  pitchFactor = DEFAULTS.ROOF_PITCH_FACTOR,
  standardLengthM = DEFAULTS.TUBE_STANDARD_LENGTH_M,
  wasteFactor = DEFAULTS.TUBE_CUT_WASTE_FACTOR,
  trussMemberFactor = DEFAULTS.TRUSS_MEMBER_FACTOR,
}) {
  const slopeLength = computeSlopeLength(widthM, roofType, pitchFactor);
  const slopes = numberOfSlopes(roofType);
  const trussCount = computeTrussCount(lengthM, trussSpacingM);

  // Metros de tijeral: cada tijeral cubre todas las aguas del techo, con un factor
  // extra por las diagonales/verticales internas (no es solo la cuerda superior).
  const trussMetersEach = slopeLength * slopes * trussMemberFactor;
  const totalTrussMeters = round2(trussCount * trussMetersEach);

  // Metros de correas: líneas paralelas a la cumbrera, espaciadas cada purlinSpacingM
  // a lo largo del agua, cada una recorriendo todo el largo del galpón.
  const purlinLinesPerSlope = Math.ceil(slopeLength / purlinSpacingM) + 1;
  const totalPurlinMeters = round2(purlinLinesPerSlope * slopes * lengthM);

  const totalMeters = round2(totalTrussMeters + totalPurlinMeters);
  const totalMetersWithWaste = round2(totalMeters * wasteFactor);
  const strips = Math.ceil(totalMetersWithWaste / standardLengthM);

  return {
    trussCount,
    totalTrussMeters,
    purlinLinesPerSlope,
    totalPurlinMeters,
    totalMeters,
    totalMetersWithWaste,
    strips,
  };
}

/** Pernos autoperforantes: por cada plancha, uno por cada cruce con una correa, en varias filas. */
export function computeScrewTakeoff({
  totalSheets,
  sheetLengthM,
  purlinSpacingM,
  screwsPerCrossing = DEFAULTS.SCREWS_PER_PURLIN_CROSSING,
  wasteFactor = DEFAULTS.SCREW_WASTE_FACTOR,
}) {
  const crossingsPerSheet = Math.ceil(sheetLengthM / purlinSpacingM) + 1;
  const rawScrews = totalSheets * crossingsPerSheet * screwsPerCrossing;
  const totalScrews = Math.ceil(round2(rawScrews * wasteFactor));
  return { crossingsPerSheet, totalScrews };
}

/** Pintura anticorrosiva: según el área desarrollada de tubo (perímetro x largo) y el rendimiento del producto. */
export function computePaintTakeoff({
  totalTubeMeters,
  tubeProfile = "2x1",
  coats = DEFAULTS.PAINT_COATS,
  yieldM2PerGallon = DEFAULTS.PAINT_YIELD_M2_PER_GALLON,
  presentationGal = DEFAULTS.PAINT_PRESENTATION_GAL,
}) {
  const perimeterM = DEFAULTS.TUBE_PERIMETER_M[tubeProfile] ?? DEFAULTS.TUBE_PERIMETER_M["2x1"];
  const areaM2 = round2(totalTubeMeters * perimeterM * coats);
  const rawGallons = areaM2 / yieldM2PerGallon;
  const gallons = Math.ceil(rawGallons / presentationGal) * presentationGal;
  return { areaM2, gallons: round2(gallons) };
}

/** Electrodos de soldadura: por uniones típicas de cada tijeral (bases + nudos principales). */
export function computeWeldingTakeoff({
  trussCount,
  jointsPerTruss = DEFAULTS.WELD_JOINTS_PER_TRUSS,
  kgPerJoint = DEFAULTS.WELD_KG_PER_JOINT,
}) {
  const totalJoints = trussCount * jointsPerTruss;
  const electrodeKg = round2(totalJoints * kgPerJoint);
  return { totalJoints, electrodeKg };
}

/**
 * Arma el despiece completo de un galpón / techo (una o dos aguas) en una lista
 * de materiales lista para mostrar o para enviar directo al cotizador de campo
 * (mismo formato { description, unit, quantity } que usan las líneas de presupuesto).
 */
export function computeRoofTakeoff(inputs) {
  const { lengthM, widthM, roofType = "dos_aguas", trussSpacingM, purlinSpacingM, sheetLengthM = 3.66, tubeProfile = "2x1" } = inputs;

  if (!(lengthM > 0) || !(widthM > 0) || !(trussSpacingM > 0) || !(purlinSpacingM > 0)) {
    throw new Error("Largo, ancho, separación de tijerales y de correas deben ser mayores a 0.");
  }

  const sheets = computeSheetTakeoff({ lengthM, widthM, roofType, sheetLengthM, pitchFactor: getPitchFactor(roofType) });
  const tubes = computeTubeTakeoff({ lengthM, widthM, roofType, trussSpacingM, purlinSpacingM, pitchFactor: getPitchFactor(roofType) });
  const screws = computeScrewTakeoff({ totalSheets: sheets.totalSheets, sheetLengthM, purlinSpacingM });
  const paint = computePaintTakeoff({ totalTubeMeters: tubes.totalMetersWithWaste, tubeProfile });
  const welding = computeWeldingTakeoff({ trussCount: tubes.trussCount });

  const items = [
    {
      description: `Tiras de tubo ${tubeProfile}" (${DEFAULTS.TUBE_STANDARD_LENGTH_M}m c/u)`,
      unit: "und",
      quantity: tubes.strips,
    },
    {
      description: `Planchas de cobertura TR-4 (${sheetLengthM}m)`,
      unit: "und",
      quantity: sheets.totalSheets,
    },
    {
      description: "Pernos autoperforantes",
      unit: "und",
      quantity: screws.totalScrews,
    },
    {
      description: `Pintura anticorrosiva (perfil ${tubeProfile}")`,
      unit: "gal",
      quantity: paint.gallons,
    },
    {
      description: "Electrodos de soldadura",
      unit: "kg",
      quantity: welding.electrodeKg,
    },
  ];

  return { items, detail: { sheets, tubes, screws, paint, welding } };
}

// ---------------------------------------------------------------------------
// CERCOS Y PORTONES — despiece más simple (postes, malla/paño, pintura)
// ---------------------------------------------------------------------------

/** Despiece de un cerco metálico: postes cada `postSpacingM`, paño en m², pintura. */
export function computeFenceTakeoff({
  lengthM,
  heightM = 2.0,
  postSpacingM = DEFAULTS.FENCE_POST_SPACING_M,
  tubeProfile = "2x1",
}) {
  if (!(lengthM > 0) || !(heightM > 0)) {
    throw new Error("Largo y altura deben ser mayores a 0.");
  }
  const postCount = Math.ceil(lengthM / postSpacingM) + 1;
  const meshAreaM2 = round2(lengthM * heightM);

  // Metros de tubo para marco perimetral (superior + inferior) + postes
  const frameMeters = round2(lengthM * 2); // línea superior + inferior
  const postMeters = round2(postCount * (heightM + 0.4)); // +0.4m de empotrado en dado de concreto
  const totalMeters = round2(frameMeters + postMeters);
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);

  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Postes de tubo ${tubeProfile}"`, unit: "und", quantity: postCount },
    { description: `Tiras de tubo ${tubeProfile}" (marco y refuerzos)`, unit: "und", quantity: strips },
    { description: "Malla/paño metálico", unit: "m2", quantity: meshAreaM2 },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { postCount, meshAreaM2, totalMetersWithWaste, strips, paint } };
}

// ---------------------------------------------------------------------------
// ESCALERAS — despiece por desnivel a salvar
// ---------------------------------------------------------------------------

const STEP_RISE_M = 0.18; // altura típica de paso (contrapaso) en escalera metálica

/**
 * Arma el despiece completo de una escalera metálica según el desnivel a salvar.
 */
export function computeStairTakeoff({ riseM, widthM = 1.0, tubeProfile = "2x1" }) {
  if (!(riseM > 0)) throw new Error("El desnivel (riseM) debe ser mayor a 0.");
  const stepCount = Math.ceil(riseM / STEP_RISE_M);
  // Largo de zanca (stringer) aproximado: hipotenusa asumiendo huella típica 0.28m por paso
  const stringerLength = round2(Math.sqrt(riseM ** 2 + (stepCount * 0.28) ** 2));
  const totalMeters = round2(stringerLength * 2 + stepCount * widthM); // 2 zancas + peldaños
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: "Peldaños (planchas antideslizantes)", unit: "und", quantity: stepCount },
    { description: `Tiras de tubo ${tubeProfile}" (zancas y refuerzos)`, unit: "und", quantity: strips },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { stepCount, stringerLength, totalMetersWithWaste, strips, paint } };
}

// ---------------------------------------------------------------------------
// COBERTURA METÁLICA — cerramiento/cobertura plana simple (pared o cobertizo
// sin la estructura completa de tijerales de un galpón), solo marco + plancha.
// ---------------------------------------------------------------------------

/**
 * Despiece de una cobertura metálica plana: reutiliza el mismo despiece de
 * planchas que un techo a una agua (computeSheetTakeoff con pitchFactor=1,
 * porque acá no hay pendiente que alargue la superficie), más un marco de
 * tubo simple (perimetral + parantes intermedios) en vez de tijerales.
 */
export function computeCladdingTakeoff({ lengthM, heightM, sheetLengthM = 3.66, tubeProfile = "2x1" }) {
  if (!(lengthM > 0) || !(heightM > 0)) {
    throw new Error("Largo y altura deben ser mayores a 0.");
  }
  const sheets = computeSheetTakeoff({ lengthM, widthM: heightM, roofType: "una_agua", sheetLengthM, pitchFactor: 1 });

  const perimeterMeters = round2(lengthM * 2); // línea superior + inferior del marco
  const studCount = Math.ceil(lengthM / 1.0) + 1; // parantes verticales cada ~1m
  const studMeters = round2(studCount * heightM);
  const totalMeters = round2(perimeterMeters + studMeters);
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);

  const screws = computeScrewTakeoff({ totalSheets: sheets.totalSheets, sheetLengthM, purlinSpacingM: 1.0 });
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Tiras de tubo ${tubeProfile}" (marco y parantes)`, unit: "und", quantity: strips },
    { description: `Planchas de cobertura TR-4 (${sheetLengthM}m)`, unit: "und", quantity: sheets.totalSheets },
    { description: "Pernos autoperforantes", unit: "und", quantity: screws.totalScrews },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { sheets, studCount, totalMetersWithWaste, strips, screws, paint } };
}

// ---------------------------------------------------------------------------
// BARANDAS — pasamanos de escalera o balcón: postes + 2 líneas de tubo
// horizontal (pasamanos + travesaño), sin malla ni paño.
// ---------------------------------------------------------------------------

export function computeRailingTakeoff({
  lengthM,
  heightM = 1.0,
  postSpacingM = DEFAULTS.RAILING_POST_SPACING_M,
  railLines = DEFAULTS.RAILING_RAIL_LINES,
  tubeProfile = "1.5x1.5",
}) {
  if (!(lengthM > 0) || !(heightM > 0)) {
    throw new Error("Largo y altura deben ser mayores a 0.");
  }
  const postCount = Math.ceil(lengthM / postSpacingM) + 1;
  const postMeters = round2(postCount * heightM);
  const railMeters = round2(lengthM * railLines);
  const totalMeters = round2(postMeters + railMeters);
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Postes de tubo ${tubeProfile}"`, unit: "und", quantity: postCount },
    { description: `Tiras de tubo ${tubeProfile}" (pasamanos y travesaños)`, unit: "und", quantity: strips },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { postCount, totalMetersWithWaste, strips, paint } };
}

// ---------------------------------------------------------------------------
// REJAS — marco + barrotes verticales para un vano de ventana/puerta.
// ---------------------------------------------------------------------------

export function computeGrilleTakeoff({
  widthM,
  heightM,
  barSpacingM = DEFAULTS.GRILLE_BAR_SPACING_M,
  tubeProfile = "1.5x1.5",
}) {
  if (!(widthM > 0) || !(heightM > 0)) {
    throw new Error("Ancho y altura deben ser mayores a 0.");
  }
  const perimeterMeters = round2((widthM + heightM) * 2);
  const barCount = Math.ceil(widthM / barSpacingM) + 1;
  const barMeters = round2(barCount * heightM);
  const totalMeters = round2(perimeterMeters + barMeters);
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);

  // Uniones soldadas: cada barrote se suelda arriba y abajo, más las 4 esquinas del marco.
  const totalJoints = barCount * 2 + 4;
  const electrodeKg = round2(totalJoints * DEFAULTS.WELD_KG_PER_JOINT);
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Tiras de tubo ${tubeProfile}" (marco y barrotes)`, unit: "und", quantity: strips },
    { description: "Electrodos de soldadura", unit: "kg", quantity: electrodeKg },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { barCount, totalMetersWithWaste, strips, electrodeKg, paint } };
}

// ---------------------------------------------------------------------------
// PORTONES — como una reja, pero con refuerzo diagonal (arriostre en X) y
// herrajes de portón (bisagras, pasador). Se asume una sola hoja batiente;
// para un portón de dos hojas, calcula cada hoja por separado.
// ---------------------------------------------------------------------------

export function computeGateTakeoff({
  widthM,
  heightM,
  barSpacingM = DEFAULTS.GATE_BAR_SPACING_M,
  tubeProfile = "1.5x1.5",
}) {
  if (!(widthM > 0) || !(heightM > 0)) {
    throw new Error("Ancho y altura deben ser mayores a 0.");
  }
  const perimeterMeters = round2((widthM + heightM) * 2);
  const diagonalMeters = round2(Math.sqrt(widthM ** 2 + heightM ** 2) * 2); // arriostre en X
  const barCount = Math.ceil(widthM / barSpacingM) + 1;
  const barMeters = round2(barCount * heightM);
  const totalMeters = round2(perimeterMeters + diagonalMeters + barMeters);
  const totalMetersWithWaste = round2(totalMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);

  const totalJoints = barCount * 2 + 8; // barrotes + esquinas de marco y diagonales
  const electrodeKg = round2(totalJoints * DEFAULTS.WELD_KG_PER_JOINT);
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Tiras de tubo ${tubeProfile}" (marco, diagonales y barrotes)`, unit: "und", quantity: strips },
    { description: "Bisagras pesadas", unit: "und", quantity: DEFAULTS.GATE_HINGES },
    { description: "Pasador / cerrojo", unit: "und", quantity: 1 },
    { description: "Electrodos de soldadura", unit: "kg", quantity: electrodeKg },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { barCount, totalMetersWithWaste, strips, electrodeKg, paint } };
}

// ---------------------------------------------------------------------------
// PUERTA LEVADIZA AUTOMÁTICA — panel de plancha + riel guía + kit motorreductor.
// ---------------------------------------------------------------------------

export function computeLiftGateTakeoff({
  widthM,
  heightM,
  sheetLengthM = 3.66,
  tubeProfile = "2x1",
}) {
  if (!(widthM > 0) || !(heightM > 0)) {
    throw new Error("Ancho y altura deben ser mayores a 0.");
  }
  const panel = computeSheetTakeoff({ lengthM: widthM, widthM: heightM, roofType: "una_agua", sheetLengthM, pitchFactor: 1 });

  const perimeterMeters = round2((widthM + heightM) * 2);
  const totalMetersWithWaste = round2(perimeterMeters * DEFAULTS.TUBE_CUT_WASTE_FACTOR);
  const strips = Math.ceil(totalMetersWithWaste / DEFAULTS.TUBE_STANDARD_LENGTH_M);

  // Riel guía a cada lado: sube la altura del vano y se prolonga en horizontal hacia el techo.
  const railMeters = round2((heightM + DEFAULTS.LIFT_GATE_RAIL_EXTRA_M) * 2);
  const paint = computePaintTakeoff({ totalTubeMeters: totalMetersWithWaste, tubeProfile });

  const items = [
    { description: `Tiras de tubo ${tubeProfile}" (marco de panel)`, unit: "und", quantity: strips },
    { description: `Planchas de panel (${sheetLengthM}m)`, unit: "und", quantity: panel.totalSheets },
    { description: "Riel guía", unit: "m", quantity: railMeters },
    { description: "Kit motorreductor", unit: "und", quantity: 1 },
    { description: `Pintura anticorrosiva (perfil ${tubeProfile}")`, unit: "gal", quantity: paint.gallons },
  ];

  return { items, detail: { panel, railMeters, totalMetersWithWaste, strips, paint } };
}
