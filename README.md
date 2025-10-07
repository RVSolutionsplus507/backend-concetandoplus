# Backend Conectando+ 🎮

Backend API para el juego educativo Conectando+ desarrollado con Node.js, Express, Socket.io y PostgreSQL.

## 🚀 Características

- **API REST** completa para gestión de juegos y jugadores
- **WebSockets** para comunicación en tiempo real
- **Base de datos** PostgreSQL con Prisma ORM
- **Autenticación** JWT para usuarios y administradores
- **4 Categorías de cartas**: RC, AC, E, CE
- **Multijugador** hasta 8 jugadores por sala

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🛠️ Instalación

1. **Clonar e instalar dependencias**:
```bash
cd backend-conectandoplus
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Configurar base de datos**:
```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

4. **Iniciar servidor**:
```bash
npm run dev
```

## 🎯 Endpoints Principales

### Autenticación
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/verify` - Verificar token

### Juegos
- `GET /api/games` - Listar juegos disponibles
- `POST /api/games` - Crear nuevo juego
- `POST /api/games/join` - Unirse a juego
- `GET /api/games/:roomCode` - Obtener información del juego

### Cartas
- `GET /api/cards` - Obtener todas las cartas
- `GET /api/cards/:type` - Cartas por categoría

## 🔌 Eventos WebSocket

### Cliente → Servidor
- `join-room` - Unirse a sala
- `start-explanation` - Iniciar fase explicación
- `read-explanation` - Leer carta explicación
- `choose-pile` - Elegir categoría de carta
- `draw-card` - Sacar carta
- `submit-answer` - Enviar respuesta
- `next-turn` - Pasar turno

### Servidor → Cliente
- `player-joined` - Jugador se unió
- `explanation-started` - Explicación iniciada
- `explanation-card` - Carta de explicación
- `pile-chosen` - Categoría elegida
- `card-drawn` - Carta sacada
- `answer-submitted` - Respuesta enviada
- `turn-ended` - Turno terminado
- `game-ended` - Juego finalizado

## 🎴 Categorías de Cartas

1. **RC** - Resolución de Conflictos (Amarillo)
2. **AC** - Autoconocimiento (Rosado)
3. **E** - Empatía (Celeste)
4. **CE** - Comunicación Efectiva (Verde)

## 🏗️ Arquitectura

```
src/
├── controllers/     # Controladores de API
├── models/         # Modelos de datos
├── routes/         # Rutas de API
├── services/       # Servicios (Socket.io)
├── middleware/     # Middleware personalizado
├── types/          # Tipos TypeScript
└── utils/          # Utilidades
```

## 🔒 Seguridad

- Helmet para headers de seguridad
- CORS configurado
- JWT para autenticación
- Validación de datos con Zod
- Rate limiting (pendiente)

## 📊 Base de Datos

Modelos principales:
- **User** - Usuarios del sistema
- **Game** - Partidas de juego
- **Player** - Jugadores en partidas
- **Card** - Cartas del juego
- **CardPile** - Pilas de cartas por partida
- **GameRound** - Rondas de juego
- **PlayerAnswer** - Respuestas de jugadores

## 🧪 Scripts Disponibles

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm run start` - Iniciar en producción
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:seed` - Poblar base de datos
- `npm run db:studio` - Abrir Prisma Studio

## 🌍 Variables de Entorno

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/conectandoplus_db"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
SOCKET_CORS_ORIGIN="http://localhost:3000"
```

## 📈 Estado del Proyecto

✅ **Completado**:
- Configuración inicial del servidor
- Endpoints de autenticación
- Endpoints de juegos
- WebSocket para tiempo real
- Modelos de base de datos
- Sistema de cartas
- Seed con cartas de ejemplo

⏳ **Pendiente**:
- Middleware de validación con Zod
- Rate limiting
- Tests unitarios
- Documentación API con Swagger
- Deploy en Railway

## 👥 Desarrollado por

**Roberto J. Vargas**  
Email: rvargas@rv-solutions.net  
Proyecto: Conectando+ para Dra. Mónica
