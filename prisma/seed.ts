import { PrismaClient } from '../generated/prisma';

// Definir enums localmente
enum CardType {
  RC = 'RC',
  AC = 'AC', 
  E = 'E',
  CE = 'CE'
}

enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

const prisma = new PrismaClient();

const explanationCards = [
  {
    type: CardType.RC,
    isExplanation: true,
    question: "RESOLUCIÓN DE CONFLICTOS: Habilidades para manejar y resolver situaciones de tensión o desacuerdo de manera constructiva, buscando soluciones que beneficien a todas las partes involucradas.",
    points: 0,
    difficulty: Difficulty.EASY,
    imageUrl: '/cards/57.png',
    cardNumber: 57
  },
  {
    type: CardType.AC,
    isExplanation: true,
    question: "AUTOCONOCIMIENTO: Capacidad de reconocer y comprender nuestras propias emociones, pensamientos, fortalezas y áreas de mejora para un mejor desarrollo personal.",
    points: 0,
    difficulty: Difficulty.EASY,
    imageUrl: '/cards/58.png',
    cardNumber: 58
  },
  {
    type: CardType.E,
    isExplanation: true,
    question: "EMPATÍA: Habilidad para comprender y compartir los sentimientos de otras personas, poniéndonos en su lugar y respondiendo con comprensión y cuidado.",
    points: 0,
    difficulty: Difficulty.EASY,
    imageUrl: '/cards/59.png',
    cardNumber: 59
  },
  {
    type: CardType.CE,
    isExplanation: true,
    question: "COMUNICACIÓN EFECTIVA: Capacidad de expresar ideas, sentimientos y necesidades de manera clara y respetuosa, mientras escuchamos activamente a los demás.",
    points: 0,
    difficulty: Difficulty.EASY,
    imageUrl: '/cards/60.png',
    cardNumber: 60
  }
];

const gameCards = [
  // Resolución de Conflictos (RC) - Cartas 1-19
  {
    type: CardType.RC,
    isExplanation: false,
    question: "Da un ejemplo de un conflicto que hayas tenido con un amigo o familiar, e imagínate cómo él/ella lo vería desde su perspectiva",
    options: null,
    correctAnswer: null,
    points: 3,
    difficulty: Difficulty.HARD,
    imageUrl: '/cards/1.png',
    cardNumber: 1
  },
  {
    type: CardType.RC,
    isExplanation: false,
    question: "Menciona una actitud o comportamiento que crees que empeora un conflicto",
    options: null,
    correctAnswer: null,
    points: 2,
    difficulty: Difficulty.MEDIUM,
    imageUrl: '/cards/2.png',
    cardNumber: 2
  },
  {
    type: CardType.RC,
    isExplanation: false,
    question: "En el recreo, dos amigos están peleando. ¿Cómo puedes ayudar?",
    options: JSON.stringify([
      "Me alejo para no meterme en problemas",
      "Tomo el lado de mi mejor amigo",
      "Trato de escuchar a ambos y ayudarlos a hablar",
      "Le digo a la maestra inmediatamente"
    ]),
    correctAnswer: "Trato de escuchar a ambos y ayudarlos a hablar",
    points: 4,
    difficulty: Difficulty.HARD
  },

  // Autoconocimiento (AC)
  {
    type: CardType.AC,
    isExplanation: false,
    question: "Completa la frase: 'Me siento más feliz cuando...'",
    options: null,
    correctAnswer: null, // Respuesta abierta
    points: 2,
    difficulty: Difficulty.EASY
  },
  {
    type: CardType.AC,
    isExplanation: false,
    question: "¿Qué emoción sientes cuando alguien no te incluye en un juego?",
    options: JSON.stringify([
      "Tristeza",
      "Enojo",
      "Confusión",
      "Todas las anteriores pueden ser correctas"
    ]),
    correctAnswer: "Todas las anteriores pueden ser correctas",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },

  // Empatía (E)
  {
    type: CardType.E,
    isExplanation: false,
    question: "Tu amigo está llorando porque perdió su mascota. ¿Qué haces?",
    options: JSON.stringify([
      "Le digo que no llore, que consiga otra mascota",
      "Me quedo con él y le digo que entiendo su tristeza",
      "Le cuento de cuando yo perdí algo",
      "Le digo que las mascotas no son tan importantes"
    ]),
    correctAnswer: "Me quedo con él y le digo que entiendo su tristeza",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },
  {
    type: CardType.E,
    isExplanation: false,
    question: "¿Cómo te das cuenta de que alguien está triste sin que te lo diga?",
    options: JSON.stringify([
      "Por su expresión facial y lenguaje corporal",
      "Porque no habla mucho",
      "Porque no quiere jugar",
      "Todas las anteriores"
    ]),
    correctAnswer: "Todas las anteriores",
    points: 4,
    difficulty: Difficulty.HARD
  },

  // Comunicación Efectiva (CE)
  {
    type: CardType.CE,
    isExplanation: false,
    question: "Cuando quieres pedirle algo importante a tus padres, ¿cuál es la mejor manera?",
    options: JSON.stringify([
      "Esperando el momento adecuado y hablando con respeto",
      "Pidiendo cuando están ocupados",
      "Insistiendo hasta que digan que sí",
      "Comparándolos con otros padres"
    ]),
    correctAnswer: "Esperando el momento adecuado y hablando con respeto",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },
  {
    type: CardType.CE,
    isExplanation: false,
    question: "¿Qué significa escuchar activamente?",
    options: JSON.stringify([
      "Oír las palabras que dice la otra persona",
      "Prestar atención completa y hacer preguntas si no entiendo",
      "Esperar mi turno para hablar",
      "Asentir con la cabeza mientras pienso en otra cosa"
    ]),
    correctAnswer: "Prestar atención completa y hacer preguntas si no entiendo",
    points: 4,
    difficulty: Difficulty.HARD
  },

  // Más cartas RC
  {
    type: CardType.RC,
    isExplanation: false,
    question: "Si dos amigos quieren jugar cosas diferentes, ¿cuál es la mejor solución?",
    options: JSON.stringify([
      "Que jueguen por separado",
      "Que el más grande decida",
      "Buscar un juego que les guste a ambos",
      "Que se turnen para elegir"
    ]),
    correctAnswer: "Buscar un juego que les guste a ambos",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },
  {
    type: CardType.RC,
    isExplanation: false,
    question: "Completa: 'Cuando estoy enojado, lo mejor que puedo hacer es...'",
    options: null,
    correctAnswer: null,
    points: 2,
    difficulty: Difficulty.EASY
  },

  // Más cartas AC
  {
    type: CardType.AC,
    isExplanation: false,
    question: "¿Cuál es tu mayor fortaleza?",
    options: null,
    correctAnswer: null,
    points: 2,
    difficulty: Difficulty.EASY
  },
  {
    type: CardType.AC,
    isExplanation: false,
    question: "¿Qué haces cuando te sientes abrumado?",
    options: JSON.stringify([
      "Respiro profundo y pienso en soluciones",
      "Me enojo con todos",
      "Me escondo y no hablo con nadie",
      "Culpo a otros por mis problemas"
    ]),
    correctAnswer: "Respiro profundo y pienso en soluciones",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },

  // Más cartas E
  {
    type: CardType.E,
    isExplanation: false,
    question: "Tu compañero de clase está nervioso por una presentación. ¿Cómo lo apoyas?",
    options: JSON.stringify([
      "Le digo que no se preocupe, que es fácil",
      "Le ofrezco ayuda para practicar",
      "Le digo que yo también estaría nervioso",
      "No hago nada, es su problema"
    ]),
    correctAnswer: "Le ofrezco ayuda para practicar",
    points: 3,
    difficulty: Difficulty.MEDIUM
  },
  {
    type: CardType.E,
    isExplanation: false,
    question: "¿Cómo te sientes cuando ves a alguien siendo excluido?",
    options: null,
    correctAnswer: null,
    points: 2,
    difficulty: Difficulty.EASY
  },

  // Más cartas CE
  {
    type: CardType.CE,
    isExplanation: false,
    question: "Si no estás de acuerdo con un amigo, ¿cómo expresas tu opinión?",
    options: JSON.stringify([
      "Le digo que está equivocado",
      "Digo: 'Entiendo tu punto, pero yo pienso diferente'",
      "Me quedo callado para evitar problemas",
      "Busco a otros que estén de acuerdo conmigo"
    ]),
    correctAnswer: "Digo: 'Entiendo tu punto, pero yo pienso diferente'",
    points: 4,
    difficulty: Difficulty.HARD
  },
  {
    type: CardType.CE,
    isExplanation: false,
    question: "Completa: 'Para comunicarme mejor, necesito...'",
    options: null,
    correctAnswer: null,
    points: 2,
    difficulty: Difficulty.EASY
  }
];

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes
  await prisma.playerAnswer.deleteMany();
  await prisma.gameRound.deleteMany();
  await prisma.cardPile.deleteMany();
  await prisma.player.deleteMany();
  await prisma.game.deleteMany();
  await prisma.card.deleteMany();

  // Crear cartas de explicación
  console.log('📝 Creando cartas de explicación...');
  for (const card of explanationCards) {
    await prisma.card.create({ data: card });
  }

  // Crear cartas del juego
  console.log('🃏 Creando cartas del juego...');
  for (const card of gameCards) {
    await prisma.card.create({ data: card });
  }

  console.log('✅ Seed completado exitosamente');
  console.log(`📊 Cartas creadas: ${explanationCards.length + gameCards.length}`);
  console.log(`   - Explicaciones: ${explanationCards.length}`);
  console.log(`   - Juego: ${gameCards.length}`);
}

main()
  .catch((e: Error) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
