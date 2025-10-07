import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Datos simplificados para las 56 cartas reales
const cardsData = [
  // RC - Resolución de Conflictos (amarillas) - Cartas 1-19
  { cardNumber: 1, type: 'RC', question: 'Da un ejemplo de perspectiva en conflictos', points: 3, difficulty: 'HARD', imageUrl: '/cards/1.png' },
  { cardNumber: 2, type: 'RC', question: 'Comportamientos que empeoran conflictos', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/2.png' },
  { cardNumber: 3, type: 'RC', question: 'Resolución positiva de conflictos', points: 3, difficulty: 'HARD', imageUrl: '/cards/3.png' },
  { cardNumber: 4, type: 'RC', question: 'Mantener la calma en conflictos', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/4.png' },
  { cardNumber: 5, type: 'RC', question: 'Control en discusiones', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/5.png' },
  { cardNumber: 6, type: 'RC', question: 'Disculparse sinceramente', points: 3, difficulty: 'HARD', imageUrl: '/cards/6.png' },
  { cardNumber: 7, type: 'RC', question: 'Poner límites respetuosos', points: 3, difficulty: 'HARD', imageUrl: '/cards/7.png' },
  { cardNumber: 8, type: 'RC', question: 'Entender otros puntos de vista', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/8.png' },
  { cardNumber: 9, type: 'RC', question: 'Evitar conflictos pequeños', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/9.png' },
  { cardNumber: 10, type: 'RC', question: 'Mediación en conflictos', points: 3, difficulty: 'HARD', imageUrl: '/cards/10.png' },
  { cardNumber: 11, type: 'RC', question: 'Comunicación asertiva', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/11.png' },
  { cardNumber: 12, type: 'RC', question: 'Manejo de emociones intensas', points: 3, difficulty: 'HARD', imageUrl: '/cards/12.png' },
  { cardNumber: 13, type: 'RC', question: 'Negociación efectiva', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/13.png' },
  { cardNumber: 14, type: 'RC', question: 'Perdón y reconciliación', points: 3, difficulty: 'HARD', imageUrl: '/cards/14.png' },
  { cardNumber: 15, type: 'RC', question: 'Prevención de conflictos', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/15.png' },
  { cardNumber: 16, type: 'RC', question: 'Soluciones creativas', points: 3, difficulty: 'HARD', imageUrl: '/cards/16.png' },
  { cardNumber: 17, type: 'RC', question: 'Manejo de críticas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/17.png' },
  { cardNumber: 18, type: 'RC', question: 'Compromiso y flexibilidad', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/18.png' },
  { cardNumber: 19, type: 'RC', question: 'Reflexión post-conflicto', points: 3, difficulty: 'HARD', imageUrl: '/cards/19.png' },

  // AC - Autoconocimiento (rosadas) - Cartas 20-38
  { cardNumber: 20, type: 'AC', question: 'Completa la frase: Mi mayor sueño es...', points: 3, difficulty: 'HARD', imageUrl: '/cards/20.png' },
  { cardNumber: 21, type: 'AC', question: 'Identifica tus fortalezas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/21.png' },
  { cardNumber: 22, type: 'AC', question: 'Reconoce tus emociones', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/22.png' },
  { cardNumber: 23, type: 'AC', question: 'Valores personales importantes', points: 3, difficulty: 'HARD', imageUrl: '/cards/23.png' },
  { cardNumber: 24, type: 'AC', question: 'Manejo del estrés personal', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/24.png' },
  { cardNumber: 25, type: 'AC', question: 'Metas a corto plazo', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/25.png' },
  { cardNumber: 26, type: 'AC', question: 'Áreas de mejora personal', points: 3, difficulty: 'HARD', imageUrl: '/cards/26.png' },
  { cardNumber: 27, type: 'AC', question: 'Motivaciones internas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/27.png' },
  { cardNumber: 28, type: 'AC', question: 'Patrones de comportamiento', points: 3, difficulty: 'HARD', imageUrl: '/cards/28.png' },
  { cardNumber: 29, type: 'AC', question: 'Reacciones automáticas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/29.png' },
  { cardNumber: 30, type: 'AC', question: 'Influencias externas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/30.png' },
  { cardNumber: 31, type: 'AC', question: 'Límites personales', points: 3, difficulty: 'HARD', imageUrl: '/cards/31.png' },
  { cardNumber: 32, type: 'AC', question: 'Autoaceptación', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/32.png' },
  { cardNumber: 33, type: 'AC', question: 'Crecimiento personal', points: 3, difficulty: 'HARD', imageUrl: '/cards/33.png' },
  { cardNumber: 34, type: 'AC', question: 'Reflexión sobre decisiones', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/34.png' },
  { cardNumber: 35, type: 'AC', question: 'Identidad personal', points: 3, difficulty: 'HARD', imageUrl: '/cards/35.png' },
  { cardNumber: 36, type: 'AC', question: 'Manejo de la soledad', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/36.png' },
  { cardNumber: 37, type: 'AC', question: 'Autocompasión', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/37.png' },
  { cardNumber: 38, type: 'AC', question: 'Propósito de vida', points: 3, difficulty: 'HARD', imageUrl: '/cards/38.png' },

  // E - Empatía (celestes) - Cartas 39-47
  { cardNumber: 39, type: 'E', question: 'Comprensión emocional de otros', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/39.png' },
  { cardNumber: 40, type: 'E', question: 'Apoyo en momentos difíciles', points: 3, difficulty: 'HARD', imageUrl: '/cards/40.png' },
  { cardNumber: 41, type: 'E', question: 'Lectura de emociones no verbales', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/41.png' },
  { cardNumber: 42, type: 'E', question: 'Respuesta empática apropiada', points: 3, difficulty: 'HARD', imageUrl: '/cards/42.png' },
  { cardNumber: 43, type: 'E', question: 'Perspectiva de otros', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/43.png' },
  { cardNumber: 44, type: 'E', question: 'Compasión activa', points: 3, difficulty: 'HARD', imageUrl: '/cards/44.png' },
  { cardNumber: 45, type: 'E', question: 'Escucha empática', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/45.png' },
  { cardNumber: 46, type: 'E', question: 'Conexión emocional', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/46.png' },
  { cardNumber: 47, type: 'E', question: 'Sensibilidad social', points: 3, difficulty: 'HARD', imageUrl: '/cards/47.png' },

  // CE - Comunicación Efectiva (verdes) - Cartas 48-56
  { cardNumber: 48, type: 'CE', question: 'Expresión clara de ideas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/48.png' },
  { cardNumber: 49, type: 'CE', question: 'Escucha activa', points: 3, difficulty: 'HARD', imageUrl: '/cards/49.png' },
  { cardNumber: 50, type: 'CE', question: 'Comunicación no verbal', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/50.png' },
  { cardNumber: 51, type: 'CE', question: 'Feedback constructivo', points: 3, difficulty: 'HARD', imageUrl: '/cards/51.png' },
  { cardNumber: 52, type: 'CE', question: 'Asertividad respetuosa', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/52.png' },
  { cardNumber: 53, type: 'CE', question: 'Manejo de conversaciones difíciles', points: 3, difficulty: 'HARD', imageUrl: '/cards/53.png' },
  { cardNumber: 54, type: 'CE', question: 'Clarificación y preguntas', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/54.png' },
  { cardNumber: 55, type: 'CE', question: 'Comunicación en grupo', points: 2, difficulty: 'MEDIUM', imageUrl: '/cards/55.png' },
  { cardNumber: 56, type: 'CE', question: 'Síntesis y conclusiones', points: 3, difficulty: 'HARD', imageUrl: '/cards/56.png' }
];

async function main() {
  console.log('🌱 Iniciando seed simplificado...');

  // Limpiar datos existentes
  await prisma.playerAnswer.deleteMany();
  await prisma.gameRound.deleteMany();
  await prisma.cardPile.deleteMany();
//   await prisma.player.deleteMany();
  await prisma.game.deleteMany();
  await prisma.card.deleteMany();

  // Crear todas las cartas
  console.log('🃏 Creando 56 cartas del juego...');
  for (const cardData of cardsData) {
    await prisma.card.create({
      data: {
        type: cardData.type as any,
        isExplanation: false,
        question: cardData.question,
        options: undefined,
        correctAnswer: undefined,
        points: cardData.points,
        difficulty: cardData.difficulty as any,
        imageUrl: cardData.imageUrl,
        cardNumber: cardData.cardNumber
      }
    });
  }

  console.log('✅ Seed completado exitosamente');
  console.log(`📊 Cartas creadas: ${cardsData.length}`);
}

main()
  .catch((e: Error) => {
    console.error('❌ Error en seed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
