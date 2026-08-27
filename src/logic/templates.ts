import { Category, Difficulty } from '../types';

interface TemplateStep {
  title: string;
  weight: Difficulty;
  minutes: number;
}

// Plantillas base por categoría. El "weight" indica a partir de qué
// nivel de dificultad del proyecto se incluye ese paso: proyectos fáciles
// solo ven los pasos esenciales, los difíciles ven el desglose completo.
const TEMPLATES: Record<Category, TemplateStep[]> = {
  dropshipping: [
    { title: 'Elegir nicho y validar demanda', weight: 2, minutes: 60 },
    { title: 'Buscar y contactar proveedores', weight: 2, minutes: 60 },
    { title: 'Crear la tienda online', weight: 3, minutes: 90 },
    { title: 'Configurar pagos y envíos', weight: 2, minutes: 45 },
    { title: 'Cargar los primeros productos (fotos y descripciones)', weight: 3, minutes: 90 },
    { title: 'Configurar analíticas y campaña de anuncios inicial', weight: 4, minutes: 60 },
    { title: 'Lanzar campaña de prueba y medir resultados', weight: 4, minutes: 45 },
    { title: 'Optimizar anuncios según resultados', weight: 5, minutes: 45 },
    { title: 'Escalar los productos ganadores', weight: 5, minutes: 60 },
  ],
  ecommerce_meli: [
    { title: 'Crear y configurar la cuenta de vendedor en Mercado Libre', weight: 1, minutes: 30 },
    { title: 'Definir el catálogo inicial de productos', weight: 2, minutes: 45 },
    { title: 'Fotografiar y describir los productos', weight: 2, minutes: 60 },
    { title: 'Publicar las primeras publicaciones (título, SEO, precio)', weight: 3, minutes: 60 },
    { title: 'Configurar métodos de envío (Mercado Envíos)', weight: 2, minutes: 30 },
    { title: 'Configurar promociones y publicidad (Product Ads)', weight: 3, minutes: 45 },
    { title: 'Gestionar primeras ventas y atención al cliente', weight: 3, minutes: 45 },
    { title: 'Analizar métricas de reputación y ventas', weight: 4, minutes: 30 },
    { title: 'Escalar catálogo y automatizar reposición de stock', weight: 5, minutes: 60 },
  ],
  carrera: [
    { title: 'Revisar el temario o programa del tema', weight: 1, minutes: 30 },
    { title: 'Planificar el cronograma de estudio', weight: 2, minutes: 30 },
    { title: 'Estudiar la teoría (apuntes o videos)', weight: 3, minutes: 60 },
    { title: 'Resolver ejercicios prácticos', weight: 3, minutes: 60 },
    { title: 'Hacer el laboratorio o proyecto práctico', weight: 4, minutes: 90 },
    { title: 'Repasar y resolver dudas', weight: 2, minutes: 30 },
    { title: 'Hacer una autoevaluación o simulacro', weight: 4, minutes: 45 },
    { title: 'Ajustar el plan según los resultados', weight: 2, minutes: 20 },
  ],
  impresion3d: [
    { title: 'Definir la pieza o proyecto a imprimir', weight: 1, minutes: 20 },
    { title: 'Diseñar o descargar el modelo 3D', weight: 3, minutes: 60 },
    { title: 'Preparar el modelo en el slicer', weight: 2, minutes: 30 },
    { title: 'Calibrar la impresora', weight: 3, minutes: 45 },
    { title: 'Imprimir una pieza de prueba', weight: 2, minutes: 60 },
    { title: 'Revisar calidad y ajustar parámetros', weight: 3, minutes: 30 },
    { title: 'Imprimir la pieza final', weight: 2, minutes: 90 },
    { title: 'Post-procesado (lijado, pintura, ensamblaje)', weight: 2, minutes: 45 },
  ],
  otro: [
    { title: 'Definir el objetivo claro del proyecto', weight: 1, minutes: 20 },
    { title: 'Investigar y recopilar información necesaria', weight: 2, minutes: 45 },
    { title: 'Planificar los pasos principales', weight: 2, minutes: 30 },
    { title: 'Ejecutar la primera etapa', weight: 3, minutes: 60 },
    { title: 'Revisar el avance y ajustar', weight: 3, minutes: 30 },
    { title: 'Ejecutar la etapa final', weight: 4, minutes: 60 },
    { title: 'Revisión y cierre del proyecto', weight: 2, minutes: 30 },
  ],
};

/**
 * Genera el desglose de subtareas para un proyecto nuevo según su
 * categoría y dificultad. A mayor dificultad, más pasos y más granularidad.
 */
export function generateSubtaskDrafts(category: Category, difficulty: Difficulty): TemplateStep[] {
  const steps = TEMPLATES[category] ?? TEMPLATES.otro;

  let maxWeight: Difficulty = 3;
  if (difficulty <= 2) maxWeight = 2;
  else if (difficulty === 3) maxWeight = 3;
  else if (difficulty === 4) maxWeight = 4;
  else maxWeight = 5;

  let selected = steps.filter((s) => s.weight <= maxWeight);
  if (selected.length === 0) selected = [steps[0]];

  if (difficulty === 5) {
    const last = selected[selected.length - 1];
    selected = [
      ...selected.slice(0, -1),
      { ...last, title: `${last.title} (parte 1/2)`, minutes: Math.round(last.minutes / 2) },
      { ...last, title: `${last.title} (parte 2/2)`, minutes: Math.round(last.minutes / 2) },
    ];
  }

  return selected;
}
