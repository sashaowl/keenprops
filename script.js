gsap.registerPlugin(Observer, Flip);

const TILE_W = 8532; // Ширина блока из Figma
const TILE_H = 4740; // Высота блока
const UNIT_SIZE = 948;

let scale = 1;
let curX = -TILE_W; // Начинаем из центра сетки 3x3
let curY = -TILE_H;
let isLocked = false; // Блокировка при открытом объекте

// 1. Адаптивный масштаб по вашим замерам 
function updateScale() {
    const ww = window.innerWidth;
    const targetVisibleCols = ww < 768? 3 : 4.2; // 3 на мобилках, ~4.2 на десктопе
    scale = ww / (targetVisibleCols * UNIT_SIZE);
}

async function init() {
    updateScale();
    const response = await fetch('./data.json');
    const data = await response.json();
    const canvas = document.querySelector('#canvas');

    // 2. Исправленный массив Offsets для сетки 3x3 [4, 5]
    const offsets = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            offsets.push({ dx: i * TILE_W, dy: j * TILE_H, id: `${i}${j}` });
        }
    }

    // 3. Рендерим 297 элементов (33 объекта * 9 копий)
    data.forEach(item => {
        offsets.forEach(offset => {
            const el = document.createElement('div');
            el.className = 'item';
            // Уникальный ID для Flip: "название-сетка"
            el.dataset.flipId = `${item.id}-${offset.id}`; 
            
            gsap.set(el, {
                x: item.x + offset.dx,
                y: item.y + offset.dy,
                width: item.w,
                height: item.h
            });

            const img = new Image();
            img.src = `./images/${item.id}.webp`;
            img.loading = "lazy";
            el.appendChild(img);
            canvas.appendChild(el);

            el.addEventListener('click', () => handleFlip(el));
        });
    });

    render();
    setupObserver();

    window.addEventListener('resize', () => {
        updateScale();
        render();
    });
}

function render() {
    // 4. Бесконечное зацикливание (Wrapping) [6, 7]
    const wrappedX = gsap.utils.wrap(-TILE_W * 2, -TILE_W, curX);
    const wrappedY = gsap.utils.wrap(-TILE_H * 2, -TILE_H, curY);

    gsap.set("#canvas", {
        x: wrappedX * scale,
        y: wrappedY * scale,
        scale: scale
    });
}

function setupObserver() {
    Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        onChange: (self) => {
            if (isLocked) return;
            // Делим дельту на scale, чтобы скорость движения была одинаковой при любом зуме
            curX += self.deltaX / scale;
            curY += self.deltaY / scale;
            render();
        }
    });
}

// 5. Логика FLIP-перехода [8, 9]
function handleFlip(el) {
    if (isLocked) return;
    isLocked = true;

    const state = Flip.getState(el);
    const overlay = document.querySelector('#overlay');
    
    // Создаем временный клон для анимации в оверлее
    const clone = el.cloneNode(true);
    overlay.appendChild(clone);

    // Устанавливаем финишное состояние (Lightbox)
    gsap.set(clone, { 
        position: 'fixed', 
        top: '50%', left: '50%', 
        xPercent: -50, yPercent: -50,
        width: 'auto', height: '80vh', 
        x: 0, y: 0 
    });

    Flip.from(state, {
        duration: 0.7,
        ease: "power3.inOut",
        targets: clone,
        onComplete: () => {
            clone.style.pointerEvents = "auto";
            clone.onclick = () => {
                isLocked = false;
                gsap.to(clone, { opacity: 0, onComplete: () => clone.remove() });
            };
        }
    });
}

init();