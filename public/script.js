import {
  imgPelotita,
  imgTabiCoin,
  imgGgCoin,
  coinSound,
  imgOso,
  imgNotge,
  imgShiface,
  personajeDerechaImg,
  personajeIzquierdaImg
} from '../src/resources.js';

// ==============================
// CONFIGURACIÓN INICIAL
// ==============================

const menuInicio = document.getElementById('menuInicio');
const btnIniciar = document.getElementById('btnIniciar');
const canvas = document.getElementById('juegoCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ==============================
// OBJETOS Y VARIABLES DEL JUEGO
// ==============================

const pelotita = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radio: 20,
  color: 'orange',
  velocidadY: 0,
  gravedad: 0.5,
  impulso: -12,
  velocidadX: 0,
  aceleracion: 2.5,
  maxVelocidadX: 8,
  angulo: 1, // nuevo valor para rotación
  velocidadRotacion: 0,
  rotando: false,
  estaSaltando: false
};

const teclas = {
  izquierda: false,
  derecha: false
};

let monedas = []; // Array para almacenar las monedas

const obstaculos = [];
const particulas = [];

let tiposObstaculo = ['notge', 'oso', 'shiface'];
let velocidadObstaculo = 2;

let gameOver = false;
let puntaje = 0;
let mejorPuntaje = 0;
let animacionPuntaje = {
  activo: false,
  tiempoInicio: 0,
  duracion: 300
};

let modoDepuracion = false;
let estrellas = [];

// ==============================
// FUNCIONES DEL JUEGO
// ==============================

function getCicloCielo() {
  // Un ciclo completo dura 45 segundos (ajusta a tu gusto)
  const duracionCiclo = 45000;
  const ahora = Date.now();
  const t = (ahora % duracionCiclo) / duracionCiclo; // 0 a 1

  // 0-1/3 día, 1/3-2/3 tarde, 2/3-1 noche
  let ciclo, progreso;
  if (t < 1/3) {
    ciclo = 0; // Día
    progreso = t * 3;
  } else if (t < 2/3) {
    ciclo = 1; // Tarde
    progreso = (t - 1/3) * 3;
  } else {
    ciclo = 2; // Noche
    progreso = (t - 2/3) * 3;
  }

  // Colores realistas y suaves
  const ciclos = [
    // Día
    { arriba: "#6EC6FF", medio: "#B3E5FC", abajo: "#FFFDE4" },
    // Tarde (más realista)
    { arriba: "#FFB347", medio: "#FF7043", abajo: "#FFD1DC" },
    // Noche
    { arriba: "#232946", medio: "#393E6B", abajo: "#0D1B2A" }
  ];

  const actual = ciclos[ciclo];
  const siguiente = ciclos[(ciclo + 1) % ciclos.length];

  function interpColor(a, b, t) {
    const ca = parseInt(a.slice(1), 16);
    const cb = parseInt(b.slice(1), 16);
    const r = Math.round(((ca >> 16) * (1 - t)) + ((cb >> 16) * t));
    const g = Math.round((((ca >> 8) & 0xFF) * (1 - t)) + (((cb >> 8) & 0xFF) * t));
    const b_ = Math.round(((ca & 0xFF) * (1 - t)) + ((cb & 0xFF) * t));
    return `rgb(${r},${g},${b_})`;
  }

  return {
    arriba: interpColor(actual.arriba, siguiente.arriba, progreso),
    medio: interpColor(actual.medio, siguiente.medio, progreso),
    abajo: interpColor(actual.abajo, siguiente.abajo, progreso),
    ciclo, // 0: día, 1: tarde, 2: noche
    progreso, // <--- agrega esto
    esNoche: ciclo === 2
  };
}

function crearMoneda(y) {
  const tipo = Math.random() < 0.8 ? 1 : 2; // 80% tipo 1, 20% tipo 2
  const x = Math.random() * (canvas.width - 30); // posición aleatoria
  const ancho = 25;
  const alto = 25;

  // Verificar si la moneda no se genera en una zona ocupada por un obstáculo
  if (noColisionaConObstaculos(x, y)) {
    monedas.push({
      x,
      y,
      tipo,
      ancho,
      alto,
      recogida: false,
      vibracion: Math.random() * Math.PI * 2
    });
  }
}

function noColisionaConObstaculos(x, y, ancho = 25, alto = 25) {
  for (let obs of obstaculos) {
    if (
      x < obs.x + obs.ancho &&
      x + ancho > obs.x &&
      y < obs.y + obs.alto &&
      y + alto > obs.y
    ) {
      return false; // Hay colisión
    }
  }
  return true; // No hay colisión
}

function moverMonedas() {
  // Movimiento de todas las monedas hacia arriba
  for (let moneda of monedas) {
    moneda.y -= velocidadObstaculo;
  }

  // Elimina monedas que ya salieron de la pantalla
  monedas = monedas.filter(moneda => moneda.y + moneda.alto > 0);

  // Espaciado para generar nuevas monedas
  const espacioMoneda = 180; // puedes ajustar

  if (
    monedas.length === 0 ||
    (canvas.height - monedas[monedas.length - 1].y > espacioMoneda)
  ) {
    const cantidad = 1 + Math.floor(Math.random() * 2); // 1 o 2 monedas
    for (let i = 0; i < cantidad; i++) {
      const y = canvas.height + i * 60;
      crearMoneda(y);
    }
  }
}

function crearObstaculo(y) {
  const tipo = tiposObstaculo[Math.floor(Math.random() * tiposObstaculo.length)];
  let x, ancho, alto, offsetX = 0, offsetY = 0, hitboxAncho, hitboxAlto;

  if (tipo === 'oso') {
    ancho = 80;
    alto = 80;
    hitboxAncho = 60; // Ajusta el hitbox
    hitboxAlto = 60;
    offsetX = 8; // Ajusta el desplazamiento del hitbox
    offsetY = 10;
  } else if (tipo === 'notge') {
    ancho = 140;
    alto = 115;
    hitboxAncho = 130;
    hitboxAlto = 80;
    offsetX = 0;
    offsetY = 30;
  } else if (tipo === 'shiface') {
    ancho = 120;
    alto = 120;
    hitboxAncho = 90;
    hitboxAlto = 75;
    offsetX = 15;
    offsetY = 20;
  }

  let intentos = 0;
  do {
    x = Math.random() * (canvas.width - ancho);
    intentos++;
  } while (!noColisionaConObstaculos(x, y, hitboxAncho, hitboxAlto) && intentos < 10);

  if (intentos < 10) {
    obstaculos.push({ x, y, tipo, ancho, alto, offsetX, offsetY, hitboxAncho, hitboxAlto });
  }
}


function dibujarPelotita() {
  const tamaño = pelotita.radio * 2.7 // El tamaño de la imagen debe coincidir con el diámetro de la pelotita

  ctx.save();
  ctx.translate(pelotita.x, pelotita.y); // Mover el contexto al centro de la pelotita
  ctx.rotate(pelotita.angulo); // Aplicar la rotación
  ctx.drawImage(
    imgPelotita,
    -tamaño / 2, // Centrar la imagen horizontalmente
    -tamaño / 2, // Centrar la imagen verticalmente
    tamaño, // Ancho de la imagen
    tamaño // Alto de la imagen
  );
  ctx.restore();
}

function dibujarObstaculos() {
  for (let obs of obstaculos) {
    ctx.fillStyle = 'red';

    switch (obs.tipo) {
      case 'notge':
        ctx.drawImage(imgNotge, obs.x, obs.y, obs.ancho, obs.alto);
        break;
      case 'oso':
        ctx.drawImage(imgOso, obs.x, obs.y, obs.ancho, obs.alto);
        break;
      case 'shiface':
        ctx.drawImage(imgShiface, obs.x, obs.y, obs.ancho, obs.alto);
        break;
    }
  }
}

function actualizarPelotita() {
  // Movimiento vertical
  pelotita.velocidadY += pelotita.gravedad;
  pelotita.velocidadY *= 0.98; // Suavizado del movimiento vertical
  pelotita.y += pelotita.velocidadY;

  // Detectar si toca el suelo
  if (pelotita.y + pelotita.radio >= canvas.height) {
    pelotita.y = canvas.height - pelotita.radio;
    pelotita.velocidadY = 0;
    pelotita.estaSaltando = false;
    pelotita.velocidadRotacion = 0; // Detener la rotación al aterrizar
    gameOver = true; // Fin del juego si toca el suelo
  }

  // Detectar si toca el techo
  if (pelotita.y - pelotita.radio <= 0) {
    pelotita.y = pelotita.radio;
    pelotita.velocidadY *= -0.6; // Rebote con pérdida de energía
  }

  // Movimiento horizontal
  if (teclas.izquierda) {
    pelotita.velocidadX = Math.max(
      pelotita.velocidadX - pelotita.aceleracion,
      -pelotita.maxVelocidadX
    );
    pelotita.velocidadRotacion = -0.1; // Rotación hacia la izquierda
  } else if (teclas.derecha) {
    pelotita.velocidadX = Math.min(
      pelotita.velocidadX + pelotita.aceleracion,
      pelotita.maxVelocidadX
    );
    pelotita.velocidadRotacion = 0.1; // Rotación hacia la derecha
  } else {
    pelotita.velocidadX *= 0.9; // Suavizado del movimiento horizontal
    pelotita.velocidadRotacion *= 0.9; // Suavizado de la rotación
  }

  pelotita.x += pelotita.velocidadX;

  // Colisiones laterales
  if (pelotita.x - pelotita.radio < 0) {
    pelotita.x = pelotita.radio;
    pelotita.velocidadX = 0;
  }
  if (pelotita.x + pelotita.radio > canvas.width) {
    pelotita.x = canvas.width - pelotita.radio;
    pelotita.velocidadX = 0;
  }

  // Aplicar rotación suave
  pelotita.angulo += pelotita.velocidadRotacion;
}

function ajustarDificultad(puntaje) {
  const nivel = Math.floor(puntaje / 50); // Incrementar dificultad cada 50 puntos
  const espacioMinimo = Math.max(30, 150 - nivel * 10); // Reducir espacio mínimo progresivamente
  const cantidadBase = 2 + Math.floor(nivel / 2); // Incrementar obstáculos cada 100 puntos
  const aumento = Math.random() < 0.6 ? 1 : 0; // 60% probabilidad de un obstáculo extra
  const cantidad = cantidadBase + aumento;

  return { espacioMinimo, cantidad };
}

function ajustarVelocidad(puntaje) {
  return 2 + Math.floor(puntaje / 50); // Incrementar velocidad cada 50 puntos
}

function moverObstaculos() {
  for (let obs of obstaculos) obs.y -= velocidadObstaculo;

  while (obstaculos.length && obstaculos[0].y + obstaculos[0].alto < 0) {
    obstaculos.shift();
    // Crear partículas al eliminar un obstáculo
    crearParticulas();
  }

  // Ajustar dificultad y velocidad según el puntaje
  const { espacioMinimo, cantidad } = ajustarDificultad(puntaje);
  velocidadObstaculo = ajustarVelocidad(puntaje);

  if (!obstaculos.length || canvas.height - obstaculos[obstaculos.length - 1].y > espacioMinimo) {
    for (let i = 0; i < cantidad; i++) {
      const y = canvas.height + i * 50;

      if (
        obstaculos.length === 0 || 
        y - obstaculos[obstaculos.length - 1].y >= espacioMinimo
      ) {
        crearObstaculo(y);
      }
    }
  }
}

function generarMonedas() {
  const probabilidadMoneda = 0.12; // Menor probabilidad para menos monedas
  const espacioMoneda = 200;
  const ancho = 25;
  const alto = 25;
  const maxIntentos = 8; // Intentos para encontrar una posición válida

  if (
    monedas.length === 0 ||
    canvas.height - monedas[monedas.length - 1].y > espacioMoneda
  ) {
    if (Math.random() < probabilidadMoneda) {
      const cantidad = 1; // Solo una moneda por ciclo para mejor control
      for (let i = 0; i < cantidad; i++) {
        let intentos = 0;
        let colocada = false;
        while (intentos < maxIntentos && !colocada) {
          const y = canvas.height + i * 60;
          const x = Math.random() * (canvas.width - ancho);
          if (noColisionaConObstaculos(x, y, ancho, alto)) {
            monedas.push({
              x,
              y,
              tipo: Math.random() < 0.8 ? 1 : 2,
              ancho,
              alto,
              recogida: false,
              vibracion: Math.random() * Math.PI * 2
            });
            colocada = true;
          }
          intentos++;
        }
      }
    }
  }
}

function colisionaCirculoRectangulo(circulo, rectangulo) {
  // Usar hitbox personalizada si existe, de lo contrario usar las dimensiones normales
  const offsetX = rectangulo.offsetX || 0;
  const offsetY = rectangulo.offsetY || 0;
  const hitboxAncho = rectangulo.hitboxAncho || rectangulo.ancho;
  const hitboxAlto = rectangulo.hitboxAlto || rectangulo.alto;

  // Coordenadas del rectángulo ajustadas por el offset
  const rectX = rectangulo.x + offsetX;
  const rectY = rectangulo.y + offsetY;

  // Verificar colisión rectangular
  const colisionX = circulo.x + circulo.radio > rectX && circulo.x - circulo.radio < rectX + hitboxAncho;
  const colisionY = circulo.y + circulo.radio > rectY && circulo.y - circulo.radio < rectY + hitboxAlto;

  return colisionX && colisionY;
}

function detectarColision() {
  for (let obs of obstaculos) {
    if (colisionaCirculoRectangulo(pelotita, obs)) {
      gameOver = true;
    }
  }
}

function detectarColisionMonedas() {
  monedas.forEach((moneda) => {
    if (!moneda.recogida && colisionaCirculoRectangulo(pelotita, moneda)) {
      moneda.recogida = true;

      // Reproducir el sonido
      coinSound.currentTime = 0;
      coinSound.play();

      // Actualizar el puntaje según el tipo de moneda
      puntaje += moneda.tipo === 1 ? 5 : 10;
      if (puntaje > mejorPuntaje) mejorPuntaje = puntaje;
      animacionPuntaje.activo = true;
      animacionPuntaje.tiempoInicio = Date.now();

      console.log("Moneda recogida! Puntaje:", puntaje);
    }
  });
}

// ==============================
// PARTÍCULAS
// ==============================

function crearParticulas() {
    for (let i = 0; i < 12; i++) {
      particulas.push({
        x: pelotita.x + (Math.random() - 0.5) * pelotita.radio,
        y: pelotita.y + pelotita.radio,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 1.5 + 1,
        radio: Math.random() * 1.5 + 0.5,
        alpha: 1,
        color: `rgba(255, ${180 + Math.floor(Math.random() * 40)}, 0,`
      });
    }
  }

function actualizarYdibujarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.02;

    if (p.alpha <= 0) {
      particulas.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 0, ${p.alpha})`;
    ctx.fill();
  }
}

// ==============================
// INTERFAZ Y TEXTOS
// ==============================

function dibujarHitboxes() {
  // Dibujar hitboxes de los obstáculos
  for (let obs of obstaculos) {
    ctx.save();
    ctx.strokeStyle = 'red'; // Color de la hitbox
    ctx.lineWidth = 2;

    // Dibujar hitbox personalizado
    ctx.strokeRect(
      obs.x + obs.offsetX,
      obs.y + obs.offsetY,
      obs.hitboxAncho,
      obs.hitboxAlto
    );

    ctx.restore();
  }

  // Dibujar hitbox de la pelotita
  ctx.save();
  ctx.strokeStyle = 'blue'; // Color de la hitbox de la pelotita
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pelotita.x, pelotita.y, pelotita.radio, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function dibujarNubes(ctx, x, y, escala = 1, color = "#fff", sombra = "#d3d3d3", alpha = 0.7, estilo = "dia", forma = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = sombra;
  ctx.shadowBlur = 12 * escala;

  ctx.beginPath();

  if (forma === 1) {
    // Nube ovalada clásica
    ctx.ellipse(x, y, 48 * escala, 18 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * escala, y + 4 * escala, 18 * escala, 10 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22 * escala, y + 4 * escala, 16 * escala, 9 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y + 10 * escala, 22 * escala, 8 * escala, 0, 0, Math.PI * 2);
  } else if (forma === 2) {
    // Nube más plana y ancha
    ctx.ellipse(x, y, 60 * escala, 14 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 28 * escala, y + 2 * escala, 16 * escala, 8 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * escala, y + 2 * escala, 14 * escala, 7 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y + 8 * escala, 28 * escala, 7 * escala, 0, 0, Math.PI * 2);
  } else if (forma === 3) {
    // Nube con pico arriba
    ctx.ellipse(x, y, 40 * escala, 16 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 18 * escala, y + 6 * escala, 12 * escala, 8 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 18 * escala, y + 6 * escala, 12 * escala, 8 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y - 10 * escala, 10 * escala, 8 * escala, 0, 0, Math.PI * 2);
  } else {
    // Nube tipo burbuja
    ctx.arc(x, y, 18 * escala, 0, Math.PI * 2);
    ctx.arc(x - 14 * escala, y + 6 * escala, 12 * escala, 0, Math.PI * 2);
    ctx.arc(x + 14 * escala, y + 6 * escala, 10 * escala, 0, Math.PI * 2);
    ctx.arc(x, y + 12 * escala, 14 * escala, 0, Math.PI * 2);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarFondoCielo() {
  const colores = getCicloCielo();
  const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradiente.addColorStop(0, colores.arriba);
  gradiente.addColorStop(0.5, colores.medio);
  gradiente.addColorStop(1, colores.abajo);
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Día: Nubes minimalistas, suaves y relajadas
if (colores.ciclo === 0) {
  for (let i = 0; i < 7; i++) {
    const baseX = (canvas.width / 7) * i + 40 * Math.sin(Date.now() / 1800 + i);
    const baseY = 60 + 18 * Math.sin(Date.now() / 1400 + i * 2);
    const escala = 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 2000 + i));
    const forma = 1 + (i % 4); // Alterna entre 1, 2, 3, 4
    dibujarNubes(ctx, baseX, baseY, escala, "#fff", "#e0e0e0", 0.18, "dia", forma);
  }
}

// Tarde: Nubes cálidas, difusas y tranquilas
if (colores.ciclo === 1 || (colores.ciclo === 2 && colores.progreso < 0.35)) {
  for (let i = 0; i < 5; i++) {
    const baseX = (canvas.width / 5) * i + 30 * Math.sin(Date.now() / 1700 + i);
    const baseY = 80 + 16 * Math.sin(Date.now() / 1200 + i * 2);
    const escala = 0.6 + 0.25 * Math.abs(Math.cos(Date.now() / 1600 + i));
    const forma = 1 + (i % 4); // Alterna entre 1, 2, 3, 4
    dibujarNubes(ctx, baseX, baseY, escala, "#FFD1A9", "#FFB347", 0.13, "tarde", forma);
  }
}

  // Noche: Estrellas (igual que antes)
  if (colores.esNoche) {
    if (estrellas.length === 0) {
      for (let i = 0; i < 120; i++) {
        estrellas.push({
          x: Math.random() * canvas.width,
          y: Math.random() * (canvas.height * 0.5),
          radio: Math.random() * 1.2 + 0.2,
          alpha: Math.random() * 0.5 + 0.5
        });
      }
    }
    for (let estrella of estrellas) {
      ctx.save();
      ctx.globalAlpha = estrella.alpha * (0.7 + 0.3 * Math.sin(Date.now() / 700 + estrella.x));
      ctx.beginPath();
      ctx.arc(estrella.x, estrella.y, estrella.radio, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  } else {
    estrellas = [];
  }
}

function dibujarMonedas() {
  monedas.forEach((moneda) => {
    if (!moneda.recogida) {
      moneda.vibracion += 0.2;

      const vibrarX = Math.sin(moneda.vibracion) * 2;
      const vibrarY = Math.cos(moneda.vibracion) * 2;

      const x = moneda.x + vibrarX;
      const y = moneda.y + vibrarY;
      const img = moneda.tipo === 1 ? imgTabiCoin : imgGgCoin;

      // 🌟 Borde dorado glow adaptado a la imagen
      ctx.save();
      ctx.shadowColor = 'gold';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.7;
      // Dibujamos la imagen más grande detrás como si fuera el borde glow
      ctx.drawImage(img, x - 2, y - 2, moneda.ancho + 8, moneda.alto + 8);
      ctx.restore();

      // 🟡 Dibujo real de la moneda encima
      ctx.drawImage(img, x, y, moneda.ancho + 4, moneda.alto + 4);
    }
  });
}

function dibujarTexto() {
  ctx.save();
  let escala = 1;
  const ahora = Date.now();

  if (animacionPuntaje.activo) {
    const tiempoTranscurrido = ahora - animacionPuntaje.tiempoInicio;
    if (tiempoTranscurrido < animacionPuntaje.duracion) {
      const progreso = tiempoTranscurrido / animacionPuntaje.duracion;
      escala = 1.1 + 0.5 * (1 - Math.abs(2 * progreso - 1));
    } else {
      animacionPuntaje.activo = false;
    }
  }

  ctx.translate(38, 64);
  ctx.scale(escala, escala);

  // Dibuja la moneda primero
  const monedaSize = 40;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowBlur = 0;
  ctx.drawImage(imgTabiCoin, 0, -monedaSize + 8, monedaSize, monedaSize);
  ctx.restore();

  // Dibuja el puntaje a la derecha de la moneda
  ctx.font = 'bold 35px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FF4500';
  ctx.fillText(`${puntaje}`, monedaSize + 12, 0);

  ctx.restore();
}

function mostrarGameOver() {
  // Fondo apagado
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Medidas del recuadro
  const anchoCaja = 400;
  const altoCaja = 250;
  const x = (canvas.width - anchoCaja) / 2;
  const y = (canvas.height - altoCaja) / 2;
  const radio = 20;

  // Fondo blanco con bordes redondeados
  ctx.fillStyle = '#F5F5F5';
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.lineTo(x + anchoCaja - radio, y);
  ctx.quadraticCurveTo(x + anchoCaja, y, x + anchoCaja, y + radio);
  ctx.lineTo(x + anchoCaja, y + altoCaja - radio);
  ctx.quadraticCurveTo(x + anchoCaja, y + altoCaja, x + anchoCaja - radio, y + altoCaja);
  ctx.lineTo(x + radio, y + altoCaja);
  ctx.quadraticCurveTo(x, y + altoCaja, x, y + altoCaja - radio);
  ctx.lineTo(x, y + radio);
  ctx.quadraticCurveTo(x, y, x + radio, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Texto
  ctx.fillStyle = '#FF4500';
  ctx.font = 'bold 48px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillText('¡Game Over!', canvas.width / 2, y + 60);

  ctx.font = '28px Montserrat';
  ctx.fillText(`Score: ${puntaje}`, canvas.width / 2, y + 110);
  ctx.fillText(`Best: ${mejorPuntaje}`, canvas.width / 2, y + 150);

  ctx.font = '22px Montserrat';
  ctx.fillText('Press r to restart', canvas.width / 2, y + 200);

  // Mostrar personaje PNG a la derecha del cuadro, sobresaliendo un poco
  const personajeAncho = 300;
  const personajeAlto = 300;
  const personajeX = x + anchoCaja - 110; // ligeramente fuera del borde derecho
  const personajeY = y + altoCaja / 2 - personajeAlto / 2;
  ctx.drawImage(personajeDerechaImg, personajeX, personajeY, personajeAncho, personajeAlto);

  // Mostrar Personaje Izquierda
  const personajeIzquierdaX = x - personajeAncho + 110;
  const personajeIzquierdaY = y + altoCaja / 2 - personajeAlto / 2;
  ctx.drawImage(personajeIzquierdaImg, personajeIzquierdaX, personajeIzquierdaY, personajeAncho, personajeAlto);
}

// ==============================
// CICLO PRINCIPAL
// ==============================

function reiniciarJuego() {
  pelotita.x = canvas.width / 2;
  pelotita.y = canvas.height / 2;
  pelotita.velocidadY = 0;
  pelotita.velocidadX = 0;
  obstaculos.length = 0;
  monedas.length = 0;
  particulas.length = 0;
  velocidadObstaculo = 2;
  tiempo = 0;
  puntaje = 0;
  gameOver = false;
  crearObstaculo(canvas.height);
  loop();
}

function loop() {
  if (gameOver) {
    mostrarGameOver();
    return;
  }

  // Limpiar el canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar el fondo y elementos decorativos
  dibujarFondoCielo();

  // Actualizar y dibujar los elementos del juego
  actualizarPelotita();
  detectarColisionMonedas();
  moverObstaculos();
  moverMonedas();
  generarMonedas();
  detectarColision();

  // Ajustar dificultad y velocidad según el puntaje
  const { espacioMinimo, cantidad } = ajustarDificultad(puntaje);
  velocidadObstaculo = ajustarVelocidad(puntaje);

  // Dibujar los elementos del juego
  actualizarYdibujarParticulas();
  dibujarPelotita();
  dibujarObstaculos();
  dibujarMonedas();

  // Dibujar las hitboxes si el modo de depuración está activado
  if (modoDepuracion) {
    dibujarHitboxes();
  }

  // Dibujar la interfaz
  dibujarTexto();

  // Solicitar el siguiente frame
  requestAnimationFrame(loop);
}

// ==============================
// EVENTOS
// ==============================

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyD') {
    modoDepuracion = !modoDepuracion; // Alternar el modo de depuración
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    // Permitir múltiples saltos consecutivos
    pelotita.velocidadY = pelotita.impulso;
    pelotita.velocidadRotacion = 0.2; // Inicia la rotación suave al saltar
    crearParticulas();
  }
  if (e.code === 'KeyR' && gameOver) reiniciarJuego();
  if (e.code === 'ArrowLeft') teclas.izquierda = true;
  if (e.code === 'ArrowRight') teclas.derecha = true;
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') teclas.izquierda = false;
  if (e.code === 'ArrowRight') teclas.derecha = false;
});

btnIniciar.addEventListener('click', () => {
  menuInicio.style.display = 'none';
  canvas.style.display = 'block';
  crearObstaculo(canvas.height);
  loop();
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});