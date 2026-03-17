gsap.registerPlugin(Observer);

const TILE_W = 8532;
const TILE_H = 4740;
const UNIT_SIZE = 948;

let curScale = 1;
let curX = -TILE_W; 
let curY = -TILE_H;

const MIN_SCALE = 0.1; // Позволяем отдалять очень сильно
const MAX_SCALE = 1.0;

function getBaseScale() {
    const ww = window.innerWidth;
    const targetCols = ww < 768 ? 3 : 4.5;
    return ww / (targetCols * UNIT_SIZE);
}

curScale = getBaseScale();

// Защита для Safari и переменные для зума
let initialPinchDistance = null;
let initialScale = 1;
let isPinching = false; // Флаг для блокировки GSAP Observer

// Функция для вычисления расстояния между двумя касаниями
function getPinchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && (e.touches[0].pageX < 20 || e.touches[0].pageX > window.innerWidth - 20)) {
        e.preventDefault();
    }

    if (e.touches.length === 2) {
        e.preventDefault(); 
        e.stopPropagation(); // Не отдаем событие GSAP
        isPinching = true;
        initialPinchDistance = getPinchDistance(e.touches[0], e.touches[1]);
        initialScale = curScale; 
    }
}, { passive: false, capture: true }); // capture: true делает этот код приоритетным

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        e.stopPropagation(); // Не отдаем событие GSAP
        
        const currentDistance = getPinchDistance(e.touches[0], e.touches[1]);
        const scaleFactor = currentDistance / initialPinchDistance;
        
        curScale = Math.max(MIN_SCALE, Math.min(initialScale * scaleFactor, MAX_SCALE)); 

        render(); 
    }
}, { passive: false, capture: true });

window.addEventListener('touchend', (e) => {
    if (e.touches && e.touches.length < 2) {
        initialPinchDistance = null;
        isPinching = false;
    }
}, { passive: false, capture: true });

async function init() {
    const response = await fetch('./data.json');
    const data = await response.json();
    const canvas = document.querySelector('#canvas');

    const offsets = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            offsets.push({ dx: i * TILE_W, dy: j * TILE_H });
        }
    }

    data.forEach(item => {
        offsets.forEach(offset => {
            const el = document.createElement('div');
            el.className = 'item';
            gsap.set(el, {
                x: item.x + offset.dx,
                y: item.y + offset.dy,
                width: item.w,
                height: item.h
            });
            const img = new Image();
            img.src = `./images/${item.id}.webp`;
            el.appendChild(img);
            canvas.appendChild(el);
        });
    });

    render();
    setupInteraction();
}

function render() {
    // Бесконечный цикл по принципу беговой дорожки
    const wrappedX = gsap.utils.wrap(-TILE_W * 2, -TILE_W, curX);
    const wrappedY = gsap.utils.wrap(-TILE_H * 2, -TILE_H, curY);

    gsap.set("#canvas", {
        x: wrappedX * curScale,
        y: wrappedY * curScale,
        scale: curScale
    });
}

function setupInteraction() {
    Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        preventDefault: true, // Ключ к подавлению жеста "Назад"
        
        onChange: (self) => {
            // Если сейчас идет зум двумя пальцами — игнорируем панорамирование
            if (isPinching) return; 

            // Движение холста
            curX += self.deltaX / curScale;
            curY += self.deltaY / curScale;
            render();
        },
        
        onZoom: (self) => {
            // Фокусный зум (Zoom at Focal Point)
            const factor = self.deltaY > 0 ? 0.95 : 1.05;
            const newScale = gsap.utils.clamp(MIN_SCALE, MAX_SCALE, curScale * factor);
            
            if (newScale !== curScale) {
                // Математическая коррекция смещения:
                // Чтобы точка под курсором осталась на месте, пересчитываем X и Y
                curX = self.x / newScale - (self.x / curScale - curX);
                curY = self.y / newScale - (self.y / curScale - curY);
                
                curScale = newScale;
                render();
            }
        }
    });

    window.addEventListener('resize', () => {
        curScale = getBaseScale();
        render();
    });
}

init();