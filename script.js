gsap.registerPlugin(Observer);

const TILE_W = 8532;
const TILE_H = 4740;
const UNIT_SIZE = 948;

let curScale = 1;
let curX = -TILE_W; 
let curY = -TILE_H;

const MIN_SCALE = 0.4; 
const MAX_SCALE = 3.0;

function getBaseScale() {
    const ww = window.innerWidth;
    const targetCols = ww < 768 ? 3 : 4.5;
    return ww / (targetCols * UNIT_SIZE);
}

curScale = getBaseScale();

// ==========================================
// 1. НАСТРОЙКА БРАУЗЕРА (Блокировка системного зума)
// ==========================================
// Жесткий перехват ctrl+wheel для macOS, чтобы браузер не увеличивал весь UI
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });


// ==========================================
// 2. МОБИЛЬНЫЙ ЗУМ (Нативный Pinch-to-zoom)
// ==========================================
let initialPinchDistance = null;
let initialScale = 1;
let isPinching = false; 

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && (e.touches[0].pageX < 20 || e.touches[0].pageX > window.innerWidth - 20)) {
        e.preventDefault();
    }
    if (e.touches.length === 2) {
        e.preventDefault(); 
        e.stopPropagation(); 
        isPinching = true;
        
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialScale = curScale; 
    }
}, { passive: false, capture: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        e.stopPropagation(); 
        
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        const scaleFactor = currentDistance / initialPinchDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(initialScale * scaleFactor, MAX_SCALE)); 

        if (newScale !== curScale) {
            // Вычисляем точку фокуса (середину между пальцами)
            const focalX = (t1.clientX + t2.clientX) / 2;
            const focalY = (t1.clientY + t2.clientY) / 2;
            
            // Магическая компенсация координат
            curX = focalX / newScale - (focalX / curScale - curX);
            curY = focalY / newScale - (focalY / curScale - curY);
            curScale = newScale;
            
            render();
        }
    }
}, { passive: false, capture: true });

window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        isPinching = false;
    }
}, { passive: false, capture: true });


// ==========================================
// 3. ОСНОВНАЯ ЛОГИКА
// ==========================================
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
    const wrappedX = gsap.utils.wrap(-TILE_W * 2, -TILE_W, curX);
    const wrappedY = gsap.utils.wrap(-TILE_H * 2, -TILE_H, curY);

    gsap.set("#canvas", {
        x: wrappedX * curScale,
        y: wrappedY * curScale,
        scale: curScale
    });
}


// ==========================================
// 4. ДЕСКТОП И ТАЧПАД (GSAP Observer)
// ==========================================
function setupInteraction() {
    Observer.create({
        target: window,
        // ВАЖНО: Убрали "touch" из type, чтобы он не перехватывал работу пальцами
        type: "wheel,pointer", 
        preventDefault: true, 
        
        onDrag: (self) => {
            if (isPinching) return; 
            
            // Панорамирование при зажатии левой кнопки мыши
            curX += self.deltaX / curScale;
            curY += self.deltaY / curScale;
            render();
        },
        
        onWheel: (self) => { 
            if (isPinching) return;

            // Если зажат Ctrl (это зум с клавиатуры или щипок на тачпаде MacBook)
            if (self.event.ctrlKey) {
                // Вычисляем новый масштаб (используем экспоненту для плавности как на тачпаде, так и на мышке)
                const zoomFactor = Math.exp(self.deltaY * -0.005);
                const newScale = gsap.utils.clamp(MIN_SCALE, MAX_SCALE, curScale * zoomFactor);
                
                if (newScale !== curScale) {
                    // Фокусная точка - координаты курсора
                    const focalX = self.x;
                    const focalY = self.y;
                    
                    // Компенсация координат
                    curX = focalX / newScale - (focalX / curScale - curX);
                    curY = focalY / newScale - (focalY / curScale - curY);
                    curScale = newScale;
                    render();
                }
            } 
            // Обычный скролл без Ctrl (колесико мыши или два пальца по тачпаду)
            else {
                // Панорамирование
                curX -= (self.deltaX * 2) / curScale; 
                curY -= (self.deltaY * 2) / curScale;
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