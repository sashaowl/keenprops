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
    const targetCols = ww < 768? 3 : 4.5;
    return ww / (targetCols * UNIT_SIZE);
}

curScale = getBaseScale();

// Защита для Safari: перехватываем начало касания у краев экрана
window.addEventListener('touchstart', (e) => {
    if (e.pageX < 20 |

| e.pageX > window.innerWidth - 20) {
        e.preventDefault();
    }
}, { passive: false });

async function init() {
    const response = await fetch('./data.json');
    const data = await response.json();
    const canvas = document.querySelector('#canvas');

    const offsets =;
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
            // Движение холста
            curX += self.deltaX / curScale;
            curY += self.deltaY / curScale;
            render();
        },
        
        onZoom: (self) => {
            // Фокусный зум (Zoom at Focal Point)
            const factor = self.deltaY > 0? 0.95 : 1.05;
            const newScale = gsap.utils.clamp(MIN_SCALE, MAX_SCALE, curScale * factor);
            
            if (newScale!== curScale) {
                // Математическая коррекция смещения:
                // Чтобы точка под курсором осталась на месте, пересчитываем X и Y
                // T_new = P_focal - (P_focal - T_old) * (S_new / S_old)
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