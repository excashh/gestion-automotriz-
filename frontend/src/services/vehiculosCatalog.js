/**
 * Catálogo inteligente de vehículos y conexión con API NHTSA
 * Soporta autocompletado en tiempo real con latencia cero (modo offline/red restringida)
 * y enriquecimiento dinámico vía API de la NHTSA.
 */

// Catálogo enriquecido con marcas y modelos líderes en México y Latinoamérica
export const CATALOGO_VEHICULOS = {
  'Acura': ['ILX', 'Integra', 'MDX', 'NSX', 'RDX', 'TLX'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', '4C', 'Giulietta'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'RS3', 'RS5', 'RS6', 'TT'],
  'BMW': ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 7', 'Serie 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'M2', 'M3', 'M4', 'M5', 'Z4', 'i4', 'iX3', 'iX'],
  'Buick': ['Encore', 'Encore GX', 'Envision', 'Enclave', 'LaCrosse', 'Regal'],
  'BYD': ['Dolphin', 'Seal', 'Yuan Plus', 'Han', 'Tang', 'Song Plus'],
  'Cadillac': ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'XT6', 'Lyriq'],
  'Chevrolet': [
    'Aveo', 'Beat', 'Spark', 'Onix', 'Cavalier', 'Cruze', 'Malibu', 'Camaro', 'Corvette',
    'Tracker', 'Trax', 'Captiva', 'Groove', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban',
    'Tornado', 'Tornado Van', 'Colorado', 'S10', 'Silverado', 'Cheyenne'
  ],
  'Chrysler': ['Pacifica', 'Voyager', '300C', 'Town & Country'],
  'Cupra': ['Formentor', 'Leon', 'Ateca', 'Born', 'Tavascan'],
  'Dodge': ['Attitude', 'Neon', 'Dart', 'Charger', 'Challenger', 'Journey', 'Durango'],
  'Fiat': ['Mobi', 'Argo', 'Pulse', 'Fastback', '500', 'Ducato'],
  'Ford': [
    'Fiesta', 'Focus', 'Fusion', 'Mustang', 'EcoSport', 'Escape', 'Edge', 'Explorer', 'Expedition',
    'Ranger', 'F-150', 'Lobo', 'Maverick', 'Bronco', 'Bronco Sport', 'Transit', 'Transit Custom'
  ],
  'Geely': ['Coolray', 'Emgrand', 'GX3 Pro', 'Monjaro', 'Starray'],
  'GMC': ['Terrain', 'Acadia', 'Yukon', 'Sierra', 'Canyon'],
  'Honda': ['Fit', 'City', 'Civic', 'Accord', 'Insight', 'HR-V', 'CR-V', 'BR-V', 'Pilot', 'Passport', 'Odyssey', 'Ridgeline'],
  'Hyundai': ['Grand i10', 'HB20', 'Accent', 'Elantra', 'Sonata', 'Creta', 'Creta Grand', 'Tucson', 'Santa Fe', 'Palisade', 'Venue', 'Kona', 'Ioniq 5', 'Staria'],
  'Infiniti': ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  'JAC': ['J4', 'EJ7', 'Sei 2', 'Sei 3', 'Sei 4 Pro', 'Sei 7 Pro', 'Frison T6', 'Frison T8', 'E10X'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Patriot', 'Commander'],
  'Kia': ['Rio', 'K3', 'K4', 'Forte', 'Optima', 'Soul', 'Seltos', 'Sportage', 'Sorento', 'Telluride', 'Carnival', 'Stinger', 'Sonet', 'EV6'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Velar', 'Range Rover Sport'],
  'Lexus': ['IS', 'ES', 'LS', 'NX', 'RX', 'GX', 'LX', 'UX', 'TX'],
  'Lincoln': ['Corsair', 'Nautilus', 'Aviator', 'Navigator', 'MKZ'],
  'Mazda': ['Mazda 2', 'Mazda 3', 'Mazda 6', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9', 'CX-70', 'CX-90', 'MX-5 Miata'],
  'Mercedes-Benz': ['Clase A', 'Clase C', 'Clase E', 'Clase S', 'CLA', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'Clase G', 'EQE', 'EQS', 'Sprinter', 'Vito'],
  'MG': ['MG 4', 'MG 5', 'MG GT', 'MG ONE', 'ZS', 'HS', 'RX8', 'Cyberster'],
  'MINI': ['Cooper', 'Cooper S', 'Countryman', 'Clubman'],
  'Mitsubishi': ['Mirage', 'Mirage G4', 'Lancer', 'Eclipse Cross', 'Outlander', 'Montero Sport', 'L200', 'Xpander'],
  'Nissan': [
    'Tsuru', 'Tiida', 'March', 'Versa', 'Sentra', 'Altima', 'Maxima', 'Note',
    'Kicks', 'X-Trail', 'Pathfinder', 'Armada', 'Murano', 'Frontier', 'NP300', 'Urvan', '370Z', 'GT-R'
  ],
  'Peugeot': ['208', '301', '308', '2008', '3008', '5008', 'Partner', 'Rifter', 'Expert', 'Boxer'],
  'Porsche': ['911', '718 Cayman', '718 Boxster', 'Panamera', 'Macan', 'Cayenne', 'Taycan'],
  'Ram': ['700', '1200', '1500', '2500', '4000', 'ProMaster'],
  'Renault': ['Kwid', 'Sandero', 'Stepway', 'Logan', 'Duster', 'Captur', 'Koleos', 'Oroch', 'Kangoo', 'Master'],
  'SEAT': ['Ibiza', 'Leon', 'Toledo', 'Arona', 'Ateca', 'Tarraco'],
  'Subaru': ['Impreza', 'WRX', 'Crosstrek', 'Forester', 'Outback', 'BRZ', 'Ascent'],
  'Suzuki': ['Swift', 'Ignis', 'Baleno', 'Ciaz', 'Ertiga', 'Fronx', 'Grand Vitara', 'Jimny', 'S-Cross'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  'Toyota': [
    'Yaris', 'Yaris Sedán', 'Corolla', 'Corolla Cross', 'Camry', 'Prius', 'Supra', 'Avanza', 'Raize',
    'RAV4', 'Highlander', 'Sienna', 'Grand Highlander', 'Sequoia', '4Runner', 'Tacoma', 'Tundra', 'Hilux', 'Hiace', 'Land Cruiser'
  ],
  'Volkswagen': [
    'Vento', 'Gol', 'Polo', 'Virtus', 'Jetta', 'Bora', 'Golf', 'Passat', 'Beetle',
    'Taos', 'Tiguan', 'Teramont', 'T-Cross', 'Nivus', 'Saveiro', 'Amarok', 'Transporter', 'Crafter'
  ],
  'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'EX30', 'EX90', 'C40 Recharge']
};

export const LISTA_MARCAS = Object.keys(CATALOGO_VEHICULOS).sort();

// Caché en memoria para no repetir peticiones innecesarias
const cacheModelosNHTSA = new Map();

/**
 * Obtiene modelos para una marca.
 * Combina el catálogo local inmediato con la API de NHTSA si está disponible.
 */
export const obtenerModelos = async (marca) => {
  if (!marca || marca.trim().length === 0) return [];

  const marcaLimpia = marca.trim();
  // 1. Modelos locales inmediatos
  const marcaKey = Object.keys(CATALOGO_VEHICULOS).find(
    (m) => m.toLowerCase() === marcaLimpia.toLowerCase()
  );
  const modelosLocales = marcaKey ? CATALOGO_VEHICULOS[marcaKey] : [];

  // Si ya tenemos en caché la consulta a NHTSA
  if (cacheModelosNHTSA.has(marcaLimpia.toLowerCase())) {
    const modelosCache = cacheModelosNHTSA.get(marcaLimpia.toLowerCase());
    return Array.from(new Set([...modelosLocales, ...modelosCache])).sort();
  }

  // 2. Intentar consultar NHTSA con un timeout de 2.5 segundos
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(marcaLimpia)}?format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.Results && Array.isArray(data.Results)) {
        const modelosApi = data.Results
          .map((r) => r.Model_Name ? r.Model_Name.trim() : '')
          .filter(Boolean);

        cacheModelosNHTSA.set(marcaLimpia.toLowerCase(), modelosApi);
        return Array.from(new Set([...modelosLocales, ...modelosApi])).sort();
      }
    }
  } catch (_err) {
    // Si falla por firewall institucional, offline o timeout, devolvemos sin error los locales
  }

  return modelosLocales;
};

/**
 * Tabla estándar ISO 3779 para decodificar año a partir del 10º carácter del VIN
 */
const VIN_YEAR_MAP = {
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
  'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
  'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006,
  '7': 2007, '8': 2008, '9': 2009
};

const WMI_MAP = {
  '1FA': 'Ford', '1FD': 'Ford', '1FM': 'Ford', '1FT': 'Ford', '3FA': 'Ford', '3FE': 'Ford',
  '1GC': 'Chevrolet', '1G1': 'Chevrolet', '1GN': 'Chevrolet', '3GN': 'Chevrolet', '3GB': 'Chevrolet',
  '1HG': 'Honda', '2HG': 'Honda', '3HG': 'Honda', 'JHM': 'Honda',
  'JN1': 'Nissan', 'JN8': 'Nissan', '1N4': 'Nissan', '3N1': 'Nissan', '3N8': 'Nissan',
  '4T1': 'Toyota', 'JT2': 'Toyota', 'JTE': 'Toyota', '3TM': 'Toyota',
  '3VW': 'Volkswagen', 'WVW': 'Volkswagen', 'WAU': 'Audi', 'WBA': 'BMW', 'WDD': 'Mercedes-Benz',
  'KNA': 'Kia', 'KMH': 'Hyundai', 'JM1': 'Mazda', '3MZ': 'Mazda'
};

/**
 * Decodifica un VIN de 17 caracteres.
 * Intenta consultar la API de NHTSA, y si la red o firewall lo impiden,
 * usa el decodificador local ISO 3779.
 */
export const decodificarVin = async (vin) => {
  if (!vin || vin.trim().length !== 17) {
    throw new Error('El VIN debe contener exactamente 17 caracteres alfanuméricos.');
  }

  const vinLimpio = vin.trim().toUpperCase();

  // Intento en API de NHTSA
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vinLimpio)}?format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.Results && data.Results[0]) {
        const item = data.Results[0];
        const marca = item.Make ? item.Make.charAt(0) + item.Make.slice(1).toLowerCase() : '';
        const modelo = item.Model || '';
        const anio = parseInt(item.ModelYear) || null;

        if (marca || modelo) {
          return {
            marca,
            modelo,
            anio,
            origen: 'NHTSA API'
          };
        }
      }
    }
  } catch (_e) {
    // Continuar con decodificación local estándar
  }

  // Fallback local ISO 3779
  const wmi = vinLimpio.substring(0, 3);
  const marcaDetectada = WMI_MAP[wmi] || '';
  const charAnio = vinLimpio.charAt(9);
  const anioDetectado = VIN_YEAR_MAP[charAnio] || 2022;

  return {
    marca: marcaDetectada,
    modelo: '',
    anio: anioDetectado,
    origen: 'Decodificador Local ISO'
  };
};
