"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const explanationCards = [
    {
        type: client_2.CardType.RC,
        isExplanation: true,
        question: "RESOLUCIÓN DE CONFLICTOS: Habilidades para manejar y resolver situaciones de tensión o desacuerdo de manera constructiva, buscando soluciones que beneficien a todas las partes involucradas.",
        points: 0,
        difficulty: client_2.Difficulty.EASY
    },
    {
        type: client_2.CardType.AC,
        isExplanation: true,
        question: "AUTOCONOCIMIENTO: Capacidad de reconocer y comprender nuestras propias emociones, pensamientos, fortalezas y áreas de mejora para un mejor desarrollo personal.",
        points: 0,
        difficulty: client_2.Difficulty.EASY
    },
    {
        type: client_2.CardType.E,
        isExplanation: true,
        question: "EMPATÍA: Habilidad para comprender y compartir los sentimientos de otras personas, poniéndonos en su lugar y respondiendo con comprensión y cuidado.",
        points: 0,
        difficulty: client_2.Difficulty.EASY
    },
    {
        type: client_2.CardType.CE,
        isExplanation: true,
        question: "COMUNICACIÓN EFECTIVA: Capacidad de expresar ideas, sentimientos y necesidades de manera clara y respetuosa, mientras escuchamos activamente a los demás.",
        points: 0,
        difficulty: client_2.Difficulty.EASY
    }
];
const gameCards = [
    {
        type: client_2.CardType.RC,
        isExplanation: false,
        question: "Tu hermano tomó tu juguete favorito sin permiso. ¿Qué haces?",
        options: JSON.stringify([
            "Le grito y se lo quito",
            "Le digo calmadamente que me lo devuelva",
            "Se lo digo a mamá inmediatamente",
            "Tomo algo suyo sin permiso"
        ]),
        correctAnswer: "Le digo calmadamente que me lo devuelva",
        points: 3,
        difficulty: client_2.Difficulty.MEDIUM
    },
    {
        type: client_2.CardType.RC,
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
        difficulty: client_2.Difficulty.HARD
    },
    {
        type: client_2.CardType.AC,
        isExplanation: false,
        question: "Completa la frase: 'Me siento más feliz cuando...'",
        options: null,
        correctAnswer: null,
        points: 2,
        difficulty: client_2.Difficulty.EASY
    },
    {
        type: client_2.CardType.AC,
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
        difficulty: client_2.Difficulty.MEDIUM
    },
    {
        type: client_2.CardType.E,
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
        difficulty: client_2.Difficulty.MEDIUM
    },
    {
        type: client_2.CardType.E,
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
        difficulty: client_2.Difficulty.HARD
    },
    {
        type: client_2.CardType.CE,
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
        difficulty: client_2.Difficulty.MEDIUM
    },
    {
        type: client_2.CardType.CE,
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
        difficulty: client_2.Difficulty.HARD
    }
];
async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');
    await prisma.playerAnswer.deleteMany();
    await prisma.gameRound.deleteMany();
    await prisma.cardPile.deleteMany();
    await prisma.player.deleteMany();
    await prisma.game.deleteMany();
    await prisma.card.deleteMany();
    console.log('📝 Creando cartas de explicación...');
    for (const card of explanationCards) {
        await prisma.card.create({ data: card });
    }
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
    .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map