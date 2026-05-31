// ============================================================
//  Presentation.js — Estilo Moderno Realista / Ciencia Ficción Oscura
//  Fuente: Montserrat
//  Estilo: Fondos oscuros, acentos neón, bordes metálicos
// ============================================================

class Presentation extends Phaser.Scene {
    constructor() {
        super({ key: 'Presentation' });
        this.currentSlide = 0;
        this.maxSlides = 4;
        this.isTransitioning = false;
        this.typingEvents = [];
        this.activeWeaponIndex = 0;
        this.activeEnemyIndex = 0;
    }

    preload() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // Fondo de gradiente radial para loading (moderno)
        if (!this.textures.exists('loading-bg')) {
            const canvas = this.textures.createCanvas('loading-bg', 1024, 1024);
            const ctx = canvas.context;
            const grad = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
            grad.addColorStop(0, '#0a0a0a');
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1024, 1024);
            canvas.refresh();
        }

        // Partículas modernas (puntos de luz)
        if (!this.textures.exists('particle')) {
            const canvas = this.textures.createCanvas('particle', 4, 4);
            const ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 4, 4);
            canvas.refresh();
        }

        this.load.on('start', () => {
            this.loadingBg = this.add.image(0, 0, 'loading-bg').setOrigin(0);
            this.loadingBg.setDisplaySize(W, H);
            
            // Marco de carga minimalista
            const loadFrame = this.add.graphics();
            loadFrame.lineStyle(1, 0x333333, 1);
            loadFrame.strokeRect(W/2 - 250, H/2 - 120, 500, 200);
            
            const loadTitle = this.make.text({
                x: W / 2, y: H / 2 - 70,
                text: 'EL ÚLTIMO CAZADOR',
                style: {
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: '800',
                    fontSize: '42px',
                    color: '#ffffff',
                    letterSpacing: 2,
                    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 8, fill: true }
                }
            }).setOrigin(0.5);

            const loadSub = this.make.text({
                x: W / 2, y: H / 2 - 30,
                text: 'INICIANDO PROTOCOLO DE ACCESO',
                style: {
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: '300',
                    fontSize: '14px',
                    color: '#808080',
                    letterSpacing: 4
                }
            }).setOrigin(0.5);

            const pctText = this.make.text({
                x: W / 2, y: H / 2 + 40,
                text: '0%',
                style: {
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: '600',
                    fontSize: '20px',
                    color: '#00aaff'
                }
            }).setOrigin(0.5);

            const trackGfx = this.add.graphics();
            trackGfx.fillStyle(0x1a1a1a, 1);
            trackGfx.fillRect(W / 2 - 200, H / 2 + 15, 400, 4);
            
            const barGfx = this.add.graphics();

            this.load.on('progress', (v) => {
                pctText.setText(Math.floor(v * 100) + '%');
                barGfx.clear();
                barGfx.fillStyle(0x00aaff, 1);
                barGfx.fillRect(W / 2 - 200, H / 2 + 15, 400 * v, 4);
                
                // Efecto de brillo en la barra
                if (v > 0.01) {
                    barGfx.fillStyle(0x00aaff, 0.3);
                    barGfx.fillRect(W / 2 - 200, H / 2 + 13, 400 * v, 8);
                }
            });

            this.load.on('complete', () => {
                [trackGfx, barGfx, loadTitle, loadSub, pctText, loadFrame, this.loadingBg].forEach(o => o.destroy());
            });
        });

        // Assets - eamon-action mantiene resolución original
        this.load.image('eamon-portrait', 'assets/eamon/eamon.png');
        this.load.image('eamon-action',   'assets/eamon/eamon-action.png');
        this.load.image('egregor',        'assets/egregor/egregor.png');
        this.load.image('the-crack',        'assets/init/the-crack-environment.png');
        this.load.image('centella',       'assets/guns/centella/centella.png');
        this.load.image('perforadora',    'assets/guns/perforadora/perforadora.png');
        this.load.image('rompehuesos',    'assets/guns/rompehuesos/rompe-huesos.png');
        this.load.image('zombie',         'assets/zombie/zombie.png');
        this.load.image('iron-sentinel',  'assets/iron-sentinel/iron-sentinel.png');
    }

    create() {
        // Fondo principal: negro puro con gradiente radial
        const bgGrad = this.add.graphics();
        bgGrad.fillGradientStyle(0x050505, 0x050505, 0x0a0a0a, 0x0a0a0a);
        bgGrad.fillRect(0, 0, 1280, 720);
        
        // Gradiente radial para profundidad
        const radialGrad = this.add.graphics();
        radialGrad.fillStyle(0x0a0a0a, 0.8);
        radialGrad.fillCircle(640, 360, 500);
        
        // Viñeta ligera moderna
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.4);
        vignette.fillRect(0, 0, 1280, 720);
        vignette.fillStyle(0x000000, 0);
        vignette.fillEllipse(640, 360, 1000, 600);
        
        // Partículas ambientales estilo energía
        this.energyParticles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: 1280 },
            y: 740,
            lifespan: 6000,
            speedY: { min: -20, max: -60 },
            speedX: { min: -8, max: 8 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 0.15, end: 0 },
            tint: [0x00aaff, 0x0088cc],
            frequency: 200
        });

        this.slideContainer = this.add.container(0, 0).setDepth(1);
        this.createPersistentUI();

        // Controles
        this.input.keyboard.on('keydown-ESC',   () => this.skipPresentation());
        this.input.keyboard.on('keydown-LEFT',  () => this.prevSlide());
        this.input.keyboard.on('keydown-RIGHT', () => this.nextSlide());
        this.input.keyboard.on('keydown-SPACE', () => this.nextSlide());

        this.currentSlide = 0;
        this.buildSlide();
        
        // Animación de entrada
        this.slideContainer.setScale(0.95).setAlpha(0);
        this.tweens.add({
            targets: this.slideContainer,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.Out'
        });
    }

    // ------------------------------------------------------------
    // UI PERSISTENTE (estilo moderno)
    // ------------------------------------------------------------
    createPersistentUI() {
        // Barra superior - negro puro
        const topBar = this.add.graphics().setDepth(100);
        topBar.fillStyle(0x000000, 0.95);
        topBar.fillRect(0, 0, 1280, 52);
        topBar.lineStyle(1, 0x222222, 1);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 52, 1280, 52));

        this.add.text(28, 18, 'EL ÚLTIMO CAZADOR DE RELIQUIAS', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '600',
            fontSize: '15px',
            color: '#ffffff',
            letterSpacing: 3,
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 4 }
        }).setDepth(100);

        const skipBtn = this.add.text(1256, 20, '[ ESC ] SALTAR', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 2
        }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });

        skipBtn.on('pointerover', () => skipBtn.setColor('#FFD700'));
        skipBtn.on('pointerout', () => skipBtn.setColor('#ffffff'));
        skipBtn.on('pointerdown', () => this.skipPresentation());

        // Barra inferior
        const botBar = this.add.graphics().setDepth(100);
        botBar.fillStyle(0x000000, 0.95);
        botBar.fillRect(0, 668, 1280, 52);
        botBar.lineStyle(1, 0x222222, 1);
        botBar.strokeLineShape(new Phaser.Geom.Line(0, 668, 1280, 668));

        // Puntos de progreso minimalistas
        this.progressDots = [];
        for (let i = 0; i < this.maxSlides; i++) {
            const dot = this.add.container(640 + (i - (this.maxSlides - 1) / 2) * 45, 694);
            const bg = this.add.graphics();
            bg.fillStyle(0x333333, 1);
            bg.fillCircle(0, 0, 5);
            const glow = this.add.graphics();
            dot.add([bg, glow]);
            this.progressDots.push({ container: dot, bg, glow });
        }

        // Botones de navegación modernos
        this.prevBtn = this.add.text(32, 688, '← ANTERIOR', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '13px',
            color: '#ffffff',
            letterSpacing: 3
        }).setDepth(100).setInteractive({ useHandCursor: true });

        this.prevBtn.on('pointerover', () => {
            if (this.currentSlide > 0) this.prevBtn.setColor('#FFD700');
        });
        this.prevBtn.on('pointerout', () => {
            this.prevBtn.setColor(this.currentSlide === 0 ? '#666666' : '#aaaaaa');
        });
        this.prevBtn.on('pointerdown', () => this.prevSlide());

        this.nextBtn = this.add.text(1248, 688, 'SIGUIENTE →', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '600',
            fontSize: '13px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });

        this.nextBtn.on('pointerover', () => this.nextBtn.setColor('#FFD700'));
        this.nextBtn.on('pointerout', () => this.nextBtn.setColor('#ffffff'));
        this.nextBtn.on('pointerdown', () => this.nextSlide());

        // Indicador de slide actual
        this.slideIndicator = this.add.text(640, 694, '1 / 4', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '400',
            fontSize: '11px',
            color: '#ffffff',
            letterSpacing: 1
        }).setOrigin(0.5).setDepth(100);

        this.updateProgressDots();
    }

    updateProgressDots() {
        this.progressDots.forEach((dot, idx) => {
            dot.bg.clear();
            if (idx === this.currentSlide) {
                dot.bg.fillStyle(0x00aaff, 1);
                dot.bg.fillCircle(0, 0, 6);
                // Aura de brillo
                dot.glow.clear();
                dot.glow.fillStyle(0x00aaff, 0.3);
                dot.glow.fillCircle(0, 0, 10);
            } else if (idx < this.currentSlide) {
                dot.bg.fillStyle(0x00aaff, 0.5);
                dot.bg.fillCircle(0, 0, 4);
                dot.glow.clear();
            } else {
                dot.bg.fillStyle(0x333333, 1);
                dot.bg.fillCircle(0, 0, 4);
                dot.glow.clear();
            }
        });

        if (this.currentSlide === 0) {
            this.prevBtn.setColor('#666666').disableInteractive();
        } else {
            this.prevBtn.setColor('#aaaaaa').setInteractive();
        }

        const nextText = this.currentSlide === this.maxSlides - 1 ? '[ → ] INGRESAR' : 'SIGUIENTE →';
        this.nextBtn.setText(nextText);
        this.slideIndicator.setText(`${this.currentSlide + 1} / ${this.maxSlides}`);
    }

    // ------------------------------------------------------------
    // Panel moderno con bordes metálicos
    // ------------------------------------------------------------
    addModernPanel(x, y, w, h, color = 0x0a0a0a) {
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(color, 0.96);
        bg.fillRect(0, 0, w, h);
        bg.lineStyle(1, 0x333333, 1);
        bg.strokeRect(0, 0, w, h);
        
        // Brillo superior
        const topGlow = this.add.graphics();
        topGlow.strokeLineShape(new Phaser.Geom.Line(0, 0, w, 0));
        
        container.add([bg, topGlow]);
        this.slideContainer.add(container);
        return container;
    }

    // ------------------------------------------------------------
    // Etiqueta de datos moderna
    // ------------------------------------------------------------
    addDataTag(x, y, label, value, accentColor = '#000000') {
        const container = this.add.container(x, y);
        
        const labelText = this.add.text(0, 0, label, {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '10px',
            color: '#666666',
            letterSpacing: 2
        });
        
        const valueText = this.add.text(0, 14, value, {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '22px',
            color: accentColor,
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3 }
        });
        
        container.add([labelText, valueText]);
        this.slideContainer.add(container);
        return container;
    }

    buildSlide() {
        switch (this.currentSlide) {
            case 0:
                this.buildSlideRift();
                break;
            case 1:
                this.buildSlideEamon();
                break;
            case 2:
                this.buildSlideWeapons();
                break;
            case 3:
                this.buildSlideEnemies();
                break;
        }
    }

    // ------------------------------------------------------------
    // SLIDE 0 - LA GRIETA (moderno)
    // ------------------------------------------------------------
    buildSlideRift() {
        // Panel izquierdo para la imagen
        const crackImg = this.add.image(265, 360, 'the-crack');
        crackImg.setScale(1);
        crackImg.setPosition(850, 380);
        crackImg.setAlpha(1);
        this.slideContainer.add(crackImg);
        
        // Título principal
        const title = this.add.text(30, 60, 'EL CATACLISMO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '52px',
            color: '#ffffff',
            stroke: '#000000',       // Borde negro
            strokeThickness: 10,  
            letterSpacing: 2,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        });
        this.slideContainer.add(title);
        
        // Subtítulo con acento
        const subtitle = this.add.text(30, 120, 'LA GRIETA', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '300',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',       // Borde negro
            strokeThickness: 10,  
            letterSpacing: 4
        });
        this.slideContainer.add(subtitle);
        
        // Texto de lore con máquina de escribir
        const loreText = `Hace cinco siglos, el pacífico reino de Valdris fue devastado por un evento sin nombre: La Grieta. El tejido de la realidad se rasgó desde la Fortaleza de Hierro hasta el Templo de los Susurros, y de las fisuras surgieron horrores imposibles.

Los No-Muertos, los Centinelas de Hierro, y sobre todos ellos, Egregor: un dios exiliado que lleva eones sediento de almas.

Para contener la invasión, una orden secreta forjó tres armas capaces de absorber la esencia primigenia. Con ellas, los Cazadores de Reliquias defendieron Valdris. Pero la orden ha caído. El juramento permanece.`;

        const descText = this.add.text(30, 170, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '400',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',       // Borde negro
            strokeThickness: 5,  
            lineSpacing: 8
        });
        descText.setWordWrapWidth(400, true);
        this.slideContainer.add(descText);
        this.startTypewriter(descText, loreText);
        
        // Cita final
        const quote = this.add.text(750, 610, '“No existe la oscuridad. Solo la ausencia de aquellos que portaron la luz.”', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: 'italic',
            fontWeight: '300',
            fontSize: '13px',
            color: '#ffffff',
            stroke: '#000000',       // Borde negro
            strokeThickness: 8,  
            wordWrap: { width: 630 }
        });
        quote.setWordWrapWidth(630, true);
        this.slideContainer.add(quote);
    }

    // ------------------------------------------------------------
    // SLIDE 1 - EAMON (moderno)
    // ------------------------------------------------------------
    buildSlideEamon() {
        // eamon-action mantiene su resolución original (escala 1)
        const eamonImg = this.add.image(265, 360, 'eamon-action');
        eamonImg.setScale(1);
        eamonImg.setPosition(850, 380);
        eamonImg.setAlpha(1);
        this.slideContainer.add(eamonImg);
        
        // Nombre
        const name = this.add.text(1020, 100, 'EAMON', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '56px',
            color: '#ffffff',
            letterSpacing: 3,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        });
        this.slideContainer.add(name);
        
        // Estadísticas en formato moderno
        this.addDataTag(1080, 200, 'EDAD', '20', '#ffffff');
        this.addDataTag(1140, 200, 'CLASE', 'CAZADOR', '#00aaff');
        this.addDataTag(1140, 250, 'ESTADO', 'ÚLTIMO', '#ee3000');
        
        // Biografía
        const dossier = `Nació en Aldea Cendra, un villorrio borrado del mapa. A los doce años fue testigo de cómo La Grieta devoraba su hogar. Rescatado por Maren, una Cazadora veterana, aprendió el arte sagrado de canalizar almas.

De cabello azul-negro, ojos grises, cicatriz bajo el ojo izquierdo. Armadura de cuero azul oscuro y capa táctica`;

        const phrase = `“El dolor no es el enemigo. La parálisis sí.” — Maren`;

        const phraseText = this.add.text(850, 620, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '15px',
            color: '#FFFFFF',        // Blanco puro
            stroke: '#000000',       // Borde negro
            strokeThickness: 5,      // Grosor del borde
            lineSpacing: 7
        });
        phraseText.setWordWrapWidth(630, true);
        this.slideContainer.add(phraseText);
        this.startTypewriter(phraseText, phrase);
        
        const bioText = this.add.text(10, 220, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '15px',
            color: '#FFFFFF',        // Blanco puro
            stroke: '#000000',       // Borde negro
            strokeThickness: 5,      // Grosor del borde
            lineSpacing: 7
        });
        bioText.setWordWrapWidth(300, true);
        this.slideContainer.add(bioText);
        this.startTypewriter(bioText, dossier);
    }

    // ------------------------------------------------------------
    // SLIDE 2 - ARMAS (moderno, con efectos brillantes)
    // ------------------------------------------------------------
    buildSlideWeapons() {
        const title = this.add.text(40, 100, 'ARTEFACTOS DE PODER', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '44px',
            color: '#ffffff',
            letterSpacing: 3,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        });
        this.slideContainer.add(title);
        
        const subtitle = this.add.text(40, 150, 'ARSENAL BENDITO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '300',
            fontSize: '18px',
            color: '#00aaff',
            letterSpacing: 6
        });
        this.slideContainer.add(subtitle);

        const weaponsData = [
            {
                name: 'La Centella', image: 'centella', type: 'Pistola de energía',
                desc: 'Forjada en plata viva y cristal de alma. Disparos de alta cadencia. Ligera y equilibrada.',
                flavor: 'Rápida, silenciosa, letal.',
                stats: { Daño: 4, Cadencia: 9, Alcance: 6 },
                color: 0x00aaff, colorStr: '#00aaff'
            },
            {
                name: 'La Rompehuesos', image: 'rompehuesos', type: 'Escopeta pesada',
                desc: 'Hierro oxidado e impregnado de esencia ígnea. Devastadora a corta distancia.',
                flavor: 'No necesita puntería. Solo valor para esperar.',
                stats: { Daño: 9, Cadencia: 2, Alcance: 3 },
                color: 0xff3300, colorStr: '#ff3300'
            },
            {
                name: 'La Perforadora', image: 'perforadora', type: 'Rifle espiritual',
                desc: 'Rifle de dos manos. Ignora blindajes, atraviesa objetivos. Exige mucho al portador.',
                flavor: 'Una bala, una alma sellada.',
                stats: { Daño: 8, Cadencia: 4, Alcance: 10 },
                color: 0x00ff88, colorStr: '#00ff88'
            }
        ];

        this.weaponCards = [];

        // Panel de información detallada
        const infoPanel = this.addModernPanel(40, 480, 1200, 200, 0x080808);
        
        const infoName = this.add.text(60, 500, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '28px',
            color: '#ffffff',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3 }
        });
        const infoType = this.add.text(60, 535, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '300',
            fontSize: '15px',
            color: '#aaaaaa'
        });
        const infoDesc = this.add.text(60, 565, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '400',
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: 680, useAdvancedWrap: true },
            lineSpacing: 6
        });
        const infoFlavor = this.add.text(60, 640, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: 'italic',
            fontWeight: '300',
            fontSize: '12px',
            color: '#666666'
        });
        this.slideContainer.add([infoName, infoType, infoDesc, infoFlavor]);
        
        // Contenedor para estadísticas
        const statContainer = this.add.container(0, 0);
        this.slideContainer.add(statContainer);
        
        // Crear tarjetas de armas
        weaponsData.forEach((weapon, idx) => {
            const cardX = 40 + idx * 400;
            const cardY = 190;
            
            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x0a0a0a, 0.95);
            cardBg.fillRect(cardX, cardY, 380, 260);
            cardBg.lineStyle(1, 0x333333, 1);
            cardBg.strokeRect(cardX, cardY, 380, 260);
            
            // Imagen - ajuste de tamaño
            const img = this.add.image(cardX + 190, cardY + 120, weapon.image);
            const maxImgSize = 160;
            const scale = Math.min(maxImgSize / img.width, maxImgSize / img.height, 1);
            img.setScale(scale);
            img.setPosition(cardX + 190, cardY + 120);
            img.setInteractive({ useHandCursor: true });
            
            const nameLabel = this.add.text(cardX + 190, cardY + 230, weapon.name, {
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: '600',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            const typeLabel = this.add.text(cardX + 190, cardY + 250, weapon.type, {
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: '400',
                fontSize: '11px',
                color: '#666666'
            }).setOrigin(0.5);
            
            this.slideContainer.add([cardBg, img, nameLabel, typeLabel]);
            
            // Efectos hover
            let glowBorder = null;
            
            img.on('pointerover', () => {
                if (this.activeWeaponIndex !== idx) {
                    nameLabel.setColor(weapon.colorStr);
                    typeLabel.setColor(weapon.colorStr);
                    // Efecto glow en borde
                    glowBorder = this.add.graphics();
                    glowBorder.lineStyle(2, weapon.color, 0.6);
                    glowBorder.strokeRect(cardX, cardY, 380, 260);
                    this.slideContainer.add(glowBorder);
                    this.tweens.add({
                        targets: img,
                        scale: scale * 1.02,
                        duration: 150,
                        ease: 'Power2'
                    });
                }
                this.input.setDefaultCursor('pointer');
            });
            
            img.on('pointerout', () => {
                if (this.activeWeaponIndex !== idx) {
                    nameLabel.setColor('#ffffff');
                    typeLabel.setColor('#666666');
                }
                if (glowBorder) glowBorder.destroy();
                this.tweens.add({
                    targets: img,
                    scale: scale,
                    duration: 150,
                    ease: 'Power2'
                });
                this.input.setDefaultCursor('auto');
            });
            
            img.on('pointerdown', () => {
                this.activeWeaponIndex = idx;
                
                // Animación de click
                this.tweens.add({
                    targets: img,
                    scale: scale * 0.95,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => img.setScale(scale)
                });
                
                // Actualizar panel de información
                infoName.setText(weapon.name).setColor(weapon.colorStr);
                infoType.setText(weapon.type);
                infoDesc.setText(weapon.desc);
                infoFlavor.setText(`“${weapon.flavor}”`);
                
                // Actualizar estadísticas
                statContainer.removeAll(true);
                const barX = 800, startY = 500;
                const keys = Object.keys(weapon.stats);
                keys.forEach((key, i) => {
                    const val = weapon.stats[key];
                    const y = startY + i * 42;
                    
                    const bg = this.add.graphics();
                    bg.fillStyle(0x1a1a1a, 1);
                    bg.fillRect(barX, y + 4, 360, 8);
                    
                    const fill = this.add.graphics();
                    fill.fillStyle(weapon.color, 1);
                    fill.fillRect(barX, y + 4, 360 * (val / 10), 8);
                    
                    // Brillo en barra
                    const glow = this.add.graphics();
                    glow.fillStyle(weapon.color, 0.3);
                    glow.fillRect(barX, y + 2, 360 * (val / 10), 12);
                    
                    const label = this.add.text(barX - 12, y, key, {
                        fontFamily: '"Montserrat", sans-serif',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#aaaaaa',
                        letterSpacing: 1
                    }).setOrigin(1, 0);
                    
                    const valueTxt = this.add.text(barX + 370, y, val.toString(), {
                        fontFamily: '"Montserrat", sans-serif',
                        fontWeight: '700',
                        fontSize: '14px',
                        color: weapon.colorStr
                    });
                    
                    statContainer.add([bg, fill, glow, label, valueTxt]);
                });
                
                // Resaltar tarjeta seleccionada
                this.weaponCards.forEach((card, i) => {
                    if (i === idx) {
                        card.highlight = this.add.graphics();
                        card.highlight.lineStyle(2, weapon.color, 0.8);
                        card.highlight.strokeRect(40 + i * 400, 190, 380, 260);
                        this.slideContainer.add(card.highlight);
                    } else if (card.highlight) {
                        card.highlight.destroy();
                    }
                });
            });
            
            this.weaponCards.push({ img, nameLabel, typeLabel, cardBg, highlight: null });
        });
        
        // Seleccionar primera arma por defecto
        this.weaponCards[0].img.emit('pointerdown');
    }

    // ------------------------------------------------------------
    // SLIDE 3 - ENEMIGOS (moderno)
    // ------------------------------------------------------------
    buildSlideEnemies() {
        const title = this.add.text(40, 100, 'AMENAZAS DE LA GRIETA', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '44px',
            color: '#ffffff',
            letterSpacing: 3,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        });
        this.slideContainer.add(title);
        
        const subtitle = this.add.text(40, 150, 'ARCHIVO DE PELIGROS', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '300',
            fontSize: '18px',
            color: '#ff3300',
            letterSpacing: 6
        });
        this.slideContainer.add(subtitle);

        const enemiesData = [
            {
                name: 'No-Muerto', image: 'zombie', class: 'Infantería de plaga',
                threat: 'BAJA · ALTA DENSIDAD', weakness: 'ESCOPETA CORTA DISTANCIA',
                desc: 'Restos de los habitantes de Valdris animados por energía primigenia. Lentos pero asfixiantes en horda.',
                flavor: 'Lo más aterrador no es que quieran matarte. Es que no quieren nada.',
                color: 0x00ff88, colorStr: '#00ff88'
            },
            {
                name: 'Centinela', image: 'iron-sentinel', class: 'Forjado poseído',
                threat: 'MEDIA · BLINDAJE PESADO', weakness: 'ARTICULACIONES EXPUESTAS',
                desc: 'Antiguos guardianes mecánicos poseídos por entidades de fuego. Cargan y disparan proyectiles incendiarios.',
                flavor: 'Fueron construidos para proteger. Ya no recuerdan a quién.',
                color: 0xff6600, colorStr: '#ff6600'
            },
            {
                name: 'Egregor', image: 'egregor', class: 'Entidad interdimensional',
                threat: 'EXTREMA · JEFE FINAL', weakness: 'LAS TRES RELIQUIAS A LA VEZ',
                desc: 'Dios exiliado que abrió La Grieta. Habita el Templo de los Susurros, dobla el espacio y convoca oleadas.',
                flavor: 'No es maldad. Es hambre. Y lleva siglos sin comer.',
                color: 0xff3300, colorStr: '#ff3300'
            }
        ];

        this.enemyCards = [];

        // Panel de información
        const infoPanel = this.addModernPanel(40, 480, 1200, 200, 0x080808);
        
        const infoName = this.add.text(60, 500, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '28px',
            color: '#ffffff',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 3 }
        });
        const infoClass = this.add.text(60, 535, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '300',
            fontSize: '15px',
            color: '#aaaaaa'
        });
        const infoMeta = this.add.text(700, 500, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '13px',
            color: '#ff6600',
            wordWrap: { width: 500, useAdvancedWrap: true },
            lineSpacing: 8
        });
        const infoDesc = this.add.text(60, 570, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '400',
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: 1160, useAdvancedWrap: true },
            lineSpacing: 6
        });
        const infoFlavor = this.add.text(60, 640, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: 'italic',
            fontWeight: '300',
            fontSize: '12px',
            color: '#666666'
        });
        this.slideContainer.add([infoName, infoClass, infoMeta, infoDesc, infoFlavor]);
        
        // Crear tarjetas de enemigos
        enemiesData.forEach((enemy, idx) => {
            const cardX = 40 + idx * 400;
            const cardY = 190;
            
            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x0a0a0a, 0.95);
            cardBg.fillRect(cardX, cardY, 380, 260);
            cardBg.lineStyle(1, 0x333333, 1);
            cardBg.strokeRect(cardX, cardY, 380, 260);
            
            // Imagen con ajuste de tamaño
            const img = this.add.image(cardX + 190, cardY + 120, enemy.image);
            const maxImgSize = 160;
            const scale = Math.min(maxImgSize / img.width, maxImgSize / img.height, 1);
            img.setScale(scale);
            img.setPosition(cardX + 190, cardY + 120);
            img.setInteractive({ useHandCursor: true });
            
            const nameLabel = this.add.text(cardX + 190, cardY + 230, enemy.name, {
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: '600',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            const threatLabel = this.add.text(cardX + 190, cardY + 250, enemy.threat, {
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: '400',
                fontSize: '10px',
                color: '#666666',
                letterSpacing: 1
            }).setOrigin(0.5);
            
            this.slideContainer.add([cardBg, img, nameLabel, threatLabel]);
            
            let glowBorder = null;
            
            img.on('pointerover', () => {
                if (this.activeEnemyIndex !== idx) {
                    nameLabel.setColor(enemy.colorStr);
                    threatLabel.setColor(enemy.colorStr);
                    glowBorder = this.add.graphics();
                    glowBorder.lineStyle(2, enemy.color, 0.6);
                    glowBorder.strokeRect(cardX, cardY, 380, 260);
                    this.slideContainer.add(glowBorder);
                    this.tweens.add({
                        targets: img,
                        scale: scale * 1.02,
                        duration: 150,
                        ease: 'Power2'
                    });
                }
                this.input.setDefaultCursor('pointer');
            });
            
            img.on('pointerout', () => {
                if (this.activeEnemyIndex !== idx) {
                    nameLabel.setColor('#ffffff');
                    threatLabel.setColor('#666666');
                }
                if (glowBorder) glowBorder.destroy();
                this.tweens.add({
                    targets: img,
                    scale: scale,
                    duration: 150,
                    ease: 'Power2'
                });
                this.input.setDefaultCursor('auto');
            });
            
            img.on('pointerdown', () => {
                this.activeEnemyIndex = idx;
                
                this.tweens.add({
                    targets: img,
                    scale: scale * 0.95,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => img.setScale(scale)
                });
                
                infoName.setText(enemy.name).setColor(enemy.colorStr);
                infoClass.setText(enemy.class);
                infoMeta.setText(`⚠ ${enemy.threat}\n🔧 DEBILIDAD: ${enemy.weakness}`);
                infoDesc.setText(enemy.desc);
                infoFlavor.setText(`“${enemy.flavor}”`);
                
                this.enemyCards.forEach((card, i) => {
                    if (i === idx) {
                        card.highlight = this.add.graphics();
                        card.highlight.lineStyle(2, enemy.color, 0.8);
                        card.highlight.strokeRect(40 + i * 400, 190, 380, 260);
                        this.slideContainer.add(card.highlight);
                    } else if (card.highlight) {
                        card.highlight.destroy();
                    }
                });
            });
            
            this.enemyCards.push({ img, nameLabel, threatLabel, cardBg, highlight: null });
        });
        
        this.enemyCards[0].img.emit('pointerdown');
    }

    // ------------------------------------------------------------
    // Navegación con animaciones modernas
    // ------------------------------------------------------------
    nextSlide() {
        if (this.currentSlide === this.maxSlides - 1) {
            this.skipPresentation();
        } else {
            this.goToSlide(this.currentSlide + 1);
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) this.goToSlide(this.currentSlide - 1);
    }

    goToSlide(index) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        if (this.typingEvents.length) {
            this.typingEvents.forEach(e => e.destroy());
            this.typingEvents = [];
        }
        
        this.tweens.add({
            targets: this.slideContainer,
            scale: 0.95,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.currentSlide = index;
                this.slideContainer.removeAll(true);
                this.createPersistentUI();
                this.buildSlide();
                this.tweens.add({
                    targets: this.slideContainer,
                    scale: 1,
                    alpha: 1,
                    duration: 200,
                    ease: 'Back.Out',
                    onComplete: () => { this.isTransitioning = false; }
                });
            }
        });
    }

    skipPresentation() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        if (this.typingEvents.length) {
            this.typingEvents.forEach(e => e.destroy());
            this.typingEvents = [];
        }
        
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Menu');
        });
    }

    // ------------------------------------------------------------
    // Máquina de escribir rápida (estilo datos cargándose)
    // ------------------------------------------------------------
    startTypewriter(textObj, fullString) {
        textObj.setText('');
        let charIndex = 0;
        const event = this.time.addEvent({
            delay: 12, // Rápido, sensación de datos
            callback: () => {
                if (charIndex < fullString.length) {
                    textObj.setText(textObj.text + fullString[charIndex]);
                    charIndex++;
                } else {
                    event.destroy();
                }
            },
            loop: true
        });
        this.typingEvents.push(event);
        
        // Permitir skip del typewriter con click
        this.time.delayedCall(50, () => {
            if (!this.scene || !this.scene.isActive()) return;
            const skipListener = () => {
                if (event.active) {
                    event.destroy();
                    textObj.setText(fullString);
                }
                this.input.off('pointerdown', skipListener);
            };
            this.input.once('pointerdown', skipListener);
        });
    }
}