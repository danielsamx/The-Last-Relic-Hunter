// ============================================================
//  Presentation.js — Minimalista Cinematográfico
//  Fuente: Montserrat (Google Fonts)
//  Estilo: oscuro minimalista, tipografía grande, hover fijo
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

        // Partícula simple (opcional, se puede eliminar por minimalismo)
        if (!this.textures.exists('spark')) {
            const canvas = this.textures.createCanvas('spark', 2, 2);
            const ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 2, 2);
            canvas.refresh();
        }

        // Loading screen minimalista
        this.add.rectangle(0, 0, W, H, 0x080608).setOrigin(0);

        const loadTitle = this.make.text({
            x: W / 2, y: H / 2 - 60,
            text: 'EL ÚLTIMO CAZADOR',
            style: {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '700',
                fontSize: '28px',
                color: '#e8d5b0',
                letterSpacing: 4
            }
        }).setOrigin(0.5);

        const loadSub = this.make.text({
            x: W / 2, y: H / 2 - 20,
            text: 'Cargando memoria',
            style: {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '300',
                fontSize: '14px',
                color: '#6b6070'
            }
        }).setOrigin(0.5);

        const pctText = this.make.text({
            x: W / 2, y: H / 2 + 50,
            text: '0%',
            style: {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '600',
                fontSize: '16px',
                color: '#c0a060'
            }
        }).setOrigin(0.5);

        const trackGfx = this.add.graphics();
        trackGfx.lineStyle(1, 0x2a2030, 1);
        trackGfx.strokeRect(W / 2 - 200, H / 2 + 20, 400, 2);

        const barGfx = this.add.graphics();

        this.load.on('progress', (v) => {
            pctText.setText(Math.floor(v * 100) + '%');
            barGfx.clear();
            barGfx.fillStyle(0xc0a060, 1);
            barGfx.fillRect(W / 2 - 200, H / 2 + 20, 400 * v, 2);
        });

        this.load.on('complete', () => {
            [trackGfx, barGfx, loadTitle, loadSub, pctText].forEach(o => o.destroy());
        });

        // Assets
        this.load.image('eamon-portrait', 'assets/eamon/eamon.png');
        this.load.image('eamon-action',   'assets/eamon/eamon-action.png');
        this.load.image('egregor',        'assets/egregor/egregor.png');
        this.load.image('centella',       'assets/guns/centella/centella.png');
        this.load.image('perforadora',    'assets/guns/perforadora/perforadora.png');
        this.load.image('rompehuesos',    'assets/guns/rompehuesos/rompe-huesos.png');
        this.load.image('zombie',         'assets/zombie/zombie.png');
        this.load.image('iron-sentinel',  'assets/iron-sentinel/iron-sentinel.png');
    }

    create() {
        // Fondo sólido minimalista
        this.add.rectangle(0, 0, 1280, 720, 0x0a0810).setOrigin(0);

        // Viñeta simple en bordes
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.4);
        vignette.fillRect(0, 0, 1280, 720);
        vignette.fillStyle(0x000000, 0);
        vignette.fillEllipse(640, 360, 1100, 680);

        // Partículas sutiles (poco intrusivas)
        this.sparkEmitter = this.add.particles(0, 0, 'spark', {
            x: { min: 0, max: 1280 },
            y: 740,
            lifespan: 6000,
            speedY: { min: -6, max: -20 },
            speedX: { min: -3, max: 3 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.15, end: 0 },
            tint: 0x8b1a2f,
            frequency: 300
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
    }

    // ------------------------------------------------------------
    // UI PERSISTENTE (minimalista)
    // ------------------------------------------------------------
    createPersistentUI() {
        // Barra superior muy delgada
        const topBar = this.add.graphics().setDepth(100);
        topBar.fillStyle(0x06040a, 0.85);
        topBar.fillRect(0, 0, 1280, 50);
        topBar.lineStyle(1, 0x2a2035, 0.5);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 50, 1280, 50));

        this.add.text(24, 16, 'EL ÚLTIMO CAZADOR DE RELIQUIAS', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '600',
            fontSize: '14px',
            color: '#c9a84c',
            letterSpacing: 3
        }).setDepth(100);

        const skipBtn = this.add.text(1256, 16, 'SALTAR', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '500',
            fontSize: '12px',
            color: '#4a4355',
            letterSpacing: 2
        }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });

        skipBtn.on('pointerover', () => skipBtn.setColor('#9a8070'));
        skipBtn.on('pointerout', () => skipBtn.setColor('#4a4355'));
        skipBtn.on('pointerdown', () => this.skipPresentation());

        // Barra inferior simple
        const botBar = this.add.graphics().setDepth(100);
        botBar.fillStyle(0x06040a, 0.85);
        botBar.fillRect(0, 660, 1280, 60);
        botBar.lineStyle(1, 0x2a2035, 0.5);
        botBar.strokeLineShape(new Phaser.Geom.Line(0, 660, 1280, 660));

        // Puntos de progreso minimalistas
        this.progressDots = [];
        for (let i = 0; i < this.maxSlides; i++) {
            const dot = this.add.graphics().setDepth(100);
            dot.x = 640 + (i - (this.maxSlides - 1) / 2) * 32;
            dot.y = 688;
            this.progressDots.push(dot);
        }

        // Botón anterior
        this.prevBtn = this.add.text(32, 682, '← ANTERIOR', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '500',
            fontSize: '13px',
            color: '#2e2838',
            letterSpacing: 2
        }).setDepth(100).setInteractive({ useHandCursor: true });

        this.prevBtn.on('pointerover', () => {
            if (this.currentSlide > 0) this.prevBtn.setColor('#c9a84c');
        });
        this.prevBtn.on('pointerout', () => {
            this.prevBtn.setColor(this.currentSlide === 0 ? '#2e2838' : '#6b5f7a');
        });
        this.prevBtn.on('pointerdown', () => this.prevSlide());

        // Botón siguiente
        this.nextBtn = this.add.text(1248, 682, 'SIGUIENTE →', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '600',
            fontSize: '13px',
            color: '#8a7a60',
            letterSpacing: 2
        }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });

        this.nextBtn.on('pointerover', () => this.nextBtn.setColor('#c9a84c'));
        this.nextBtn.on('pointerout', () => this.nextBtn.setColor('#8a7a60'));
        this.nextBtn.on('pointerdown', () => this.nextSlide());

        this.updateProgressDots();
    }

    updateProgressDots() {
        this.progressDots.forEach((dot, idx) => {
            dot.clear();
            if (idx === this.currentSlide) {
                dot.fillStyle(0xc9a84c, 1);
                dot.fillRect(-10, -1, 20, 2);
            } else if (idx < this.currentSlide) {
                dot.fillStyle(0x5a4a30, 1);
                dot.fillRect(-4, -1, 8, 2);
            } else {
                dot.fillStyle(0x2a2035, 1);
                dot.fillCircle(0, 0, 3);
            }
        });

        if (this.currentSlide === 0) {
            this.prevBtn.setColor('#2e2838').disableInteractive();
        } else {
            this.prevBtn.setColor('#6b5f7a').setInteractive();
        }

        this.nextBtn.setText(this.currentSlide === this.maxSlides - 1 ? 'ENTRAR →' : 'SIGUIENTE →');
    }

    // ------------------------------------------------------------
    // Construcción de diapositivas
    // ------------------------------------------------------------
    buildSlide() {
        this.slideContainer.removeAll(true);
        this.updateProgressDots();

        switch (this.currentSlide) {
            case 0: this.buildSlideRift();    break;
            case 1: this.buildSlideEamon();   break;
            case 2: this.buildSlideWeapons(); break;
            case 3: this.buildSlideEnemies(); break;
        }
    }

    // Helper: panel de texto simple
    addTextPanel(x, y, w, h, color = 0x1a1a24) {
        const g = this.add.graphics();
        g.fillStyle(color, 0.85);
        g.fillRect(x, y, w, h);
        g.lineStyle(1, 0x2a2a38, 0.6);
        g.strokeRect(x, y, w, h);
        this.slideContainer.add(g);
        return g;
    }

    // Helper: etiqueta pequeña
    addTag(x, y, label, tintColor) {
        const txt = this.add.text(x + 12, y, label.toUpperCase(), {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '700',
            fontSize: '10px',
            color: '#d4c0a0',
            letterSpacing: 2
        });
        const bg = this.add.graphics();
        bg.fillStyle(tintColor, 0.25);
        bg.lineStyle(1, tintColor, 0.7);
        bg.fillRoundedRect(x, y - 2, txt.width + 24, 18, 4);
        this.slideContainer.add(bg);
        this.slideContainer.add(txt);
    }

    // ------------------------------------------------------------
    // SLIDE 0 - LA GRIETA
    // ------------------------------------------------------------
    buildSlideRift() {
        const bgImg = this.add.image(300, 360, 'egregor')
            .setDisplaySize(480, 520)
            .setAlpha(0.08);
        this.slideContainer.add(bgImg);

        // Marco imagen
        const frame = this.add.graphics();
        frame.fillStyle(0x0a0812, 1);
        frame.fillRect(72, 88, 400, 540);
        frame.lineStyle(1, 0x3a2a40, 0.8);
        frame.strokeRect(72, 88, 400, 540);
        this.slideContainer.add(frame);

        const mainImg = this.add.image(272, 358, 'egregor')
            .setDisplaySize(380, 500)
            .setAlpha(0.9);
        this.slideContainer.add(mainImg);

        this.addTag(540, 100, 'Origen del conflicto', 0x8b1a2f);

        const title = this.add.text(540, 130, 'EL CATACLISMO', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '800',
            fontSize: '42px',
            color: '#f0e8d8',
            letterSpacing: 2
        });
        this.slideContainer.add(title);

        const subtitle = this.add.text(540, 178, 'La Grieta', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '32px',
            color: '#9b4a5a'
        });
        this.slideContainer.add(subtitle);

        const loreText = `Hace cinco siglos, el pacífico reino de Valdris fue devastado por un evento sin nombre: La Grieta. El tejido de la realidad se rasgó desde la Fortaleza de Hierro hasta el Templo de los Susurros, y de las fisuras surgieron horrores imposibles.

Los No-Muertos, los Centinelas de Hierro, y sobre todos ellos, Egregor: un dios exiliado que lleva eones sediento de almas.

Para contener la invasión, una orden secreta forjó tres armas capaces de absorber la esencia primigenia. Con ellas, los Cazadores de Reliquias defendieron Valdris. Pero la orden ha caído. El juramento permanece.`;

        const descText = this.add.text(540, 230, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '400',
            fontSize: '18px',
            color: '#b0a8b8',
            wordWrap: { width: 680, useAdvancedWrap: true },
            lineSpacing: 10
        });
        this.slideContainer.add(descText);
        this.startTypewriter(descText, loreText);

        const quote = this.add.text(540, 620, '“No existe la oscuridad. Solo la ausencia de aquellos que portaron la luz.”', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '14px',
            color: '#5a4555',
            wordWrap: { width: 680 }
        });
        this.slideContainer.add(quote);
    }

    // ------------------------------------------------------------
    // SLIDE 1 - EAMON
    // ------------------------------------------------------------
    buildSlideEamon() {
        const frame = this.add.graphics();
        frame.fillStyle(0x0a0812, 1);
        frame.fillRect(72, 88, 400, 540);
        frame.lineStyle(1, 0x1a2a4a, 0.8);
        frame.strokeRect(72, 88, 400, 540);
        this.slideContainer.add(frame);

        const eamonImg = this.add.image(272, 358, 'eamon-action')
            .setDisplaySize(380, 500)
            .setAlpha(0.95);
        this.slideContainer.add(eamonImg);

        this.addTag(540, 100, 'Protagonista', 0x1a4a8a);

        const name = this.add.text(540, 130, 'EAMON', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '800',
            fontSize: '48px',
            color: '#e8f0f8',
            letterSpacing: 2
        });
        this.slideContainer.add(name);

        const role = this.add.text(540, 185, 'Cazador de Reliquias · Último de su orden', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '18px',
            color: '#4070a0'
        });
        this.slideContainer.add(role);

        // Stats rápidos
        const stats = [
            { label: 'EDAD', value: '20' },
            { label: 'CLASE', value: 'Cazador' },
            { label: 'ESTADO', value: 'El Último' }
        ];
        stats.forEach((s, i) => {
            const x = 540 + i * 210;
            const val = this.add.text(x, 220, s.value, {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '700',
                fontSize: '22px',
                color: '#7aaada'
            });
            const lab = this.add.text(x, 248, s.label, {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '500',
                fontSize: '11px',
                color: '#2a4060',
                letterSpacing: 2
            });
            this.slideContainer.add(val);
            this.slideContainer.add(lab);
        });

        const dossier = `Nació en Aldea Cendra, un villorrio borrado del mapa. A los doce años fue testigo de cómo La Grieta devoraba su hogar. Rescatado por Maren, una Cazadora veterana, aprendió el arte sagrado de canalizar almas.

APARIENCIA · Cabello azul-negro, ojos grises, cicatriz bajo el ojo izquierdo. Armadura de cuero azul oscuro y capa raída.

HABILIDADES
  Reflejo Acrobático — Esquiva rodando.
  Brazalete de Reliquias — Absorbe esencia de enemigos derrotados.

“El dolor no es el enemigo. La parálisis sí.” — Maren`;

        const text = this.add.text(540, 290, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '400',
            fontSize: '17px',
            color: '#a0b8cc',
            wordWrap: { width: 680, useAdvancedWrap: true },
            lineSpacing: 8
        });
        this.slideContainer.add(text);
        this.startTypewriter(text, dossier);
    }

    // ------------------------------------------------------------
    // SLIDE 2 - ARMAS (con hover fix)
    // ------------------------------------------------------------
    buildSlideWeapons() {
        this.addTag(40, 100, 'Arsenal', 0xc09020);
        const title = this.add.text(40, 130, 'ARTEFACTOS DE PODER', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '800',
            fontSize: '38px',
            color: '#f0e8d0',
            letterSpacing: 2
        });
        this.slideContainer.add(title);

        const weaponsData = [
            {
                name: 'La Centella', image: 'centella', type: 'Pistola de energía',
                desc: 'Forjada en plata viva y cristal de alma. Disparos de alta cadencia. Ligera y equilibrada.',
                flavor: '“Rápida, silenciosa, letal.”',
                stats: { Daño: 4, Cadencia: 9, Alcance: 6 },
                color: 0x1a6a9a, colorStr: '#4a9aca'
            },
            {
                name: 'La Rompehuesos', image: 'rompehuesos', type: 'Escopeta pesada',
                desc: 'Hierro oxidado e impregnado de esencia ígnea. Devastadora a corta distancia.',
                flavor: '“No necesita puntería. Solo valor para esperar.”',
                stats: { Daño: 9, Cadencia: 2, Alcance: 3 },
                color: 0xb05010, colorStr: '#e07030'
            },
            {
                name: 'La Perforadora', image: 'perforadora', type: 'Rifle espiritual',
                desc: 'Rifle de dos manos. Ignora blindajes, atraviesa objetivos. Exige mucho al portador.',
                flavor: '“Una bala, una alma sellada.”',
                stats: { Daño: 8, Cadencia: 4, Alcance: 10 },
                color: 0x7a0a3c, colorStr: '#c04070'
            }
        ];

        this.weaponBorders = [];
        this.weaponImages = [];

        // Panel de información grande
        this.addTextPanel(40, 460, 1200, 200, 0x0d0b14);

        const infoName = this.add.text(60, 475, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '700',
            fontSize: '26px',
            color: '#f0e8d0'
        });
        const infoType = this.add.text(60, 510, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '16px',
            color: '#8a7a60'
        });
        const infoDesc = this.add.text(60, 540, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '400',
            fontSize: '16px',
            color: '#b0a8b8',
            wordWrap: { width: 680, useAdvancedWrap: true },
            lineSpacing: 6
        });
        const infoFlavor = this.add.text(60, 620, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '14px',
            color: '#5a4a40'
        });
        this.slideContainer.add(infoName);
        this.slideContainer.add(infoType);
        this.slideContainer.add(infoDesc);
        this.slideContainer.add(infoFlavor);

        // Stats barras
        const statContainer = this.add.container(0, 0);
        this.slideContainer.add(statContainer);

        const updateWeapon = (index) => {
            this.activeWeaponIndex = index;
            const w = weaponsData[index];

            // Actualizar bordes
            this.weaponBorders.forEach((b, i) => {
                b.clear();
                if (i === index) {
                    b.lineStyle(2, w.color, 1);
                    b.fillStyle(0x0d0b14, 0.95);
                } else {
                    b.lineStyle(1, 0x2a2434, 0.8);
                    b.fillStyle(0x0a0812, 0.9);
                }
                b.strokeRect(0, 0, 380, 260);
                b.fillRect(0, 0, 380, 260);
                if (i === index) {
                    b.lineStyle(2, w.color, 1);
                    b.lineBetween(0, 0, 380, 0);
                }
            });

            infoName.setText(w.name).setColor(w.colorStr);
            infoType.setText(w.type);
            infoDesc.setText(w.desc);
            infoFlavor.setText(w.flavor);

            statContainer.removeAll(true);
            const barX = 800, startY = 475;
            const keys = Object.keys(w.stats);
            keys.forEach((key, i) => {
                const val = w.stats[key];
                const y = startY + i * 45;
                const bg = this.add.graphics();
                bg.fillStyle(0x1a1524, 1);
                bg.fillRect(barX, y + 4, 340, 10);
                const fill = this.add.graphics();
                fill.fillStyle(w.color, 0.9);
                fill.fillRect(barX, y + 4, 340 * (val / 10), 10);
                const label = this.add.text(barX - 12, y, key, {
                    fontFamily: '"Montserrat", sans-serif',
                    fontStyle: '600',
                    fontSize: '14px',
                    color: '#b0a0a0',
                    letterSpacing: 1
                }).setOrigin(1, 0);
                const valueTxt = this.add.text(barX + 350, y, val + ' / 10', {
                    fontFamily: '"Montserrat", sans-serif',
                    fontStyle: '700',
                    fontSize: '16px',
                    color: w.colorStr
                });
                statContainer.add([bg, fill, label, valueTxt]);
            });
        };

        weaponsData.forEach((w, idx) => {
            const cardX = 40 + idx * 400;
            const cardY = 180;

            const border = this.add.graphics();
            border.x = cardX;
            border.y = cardY;
            this.slideContainer.add(border);
            this.weaponBorders.push(border);

            const img = this.add.image(cardX + 190, cardY + 140, w.image)
                .setDisplaySize(280, 210)
                .setAlpha(0.95)
                .setInteractive({ useHandCursor: true });
            this.slideContainer.add(img);
            this.weaponImages.push(img);

            const nameLabel = this.add.text(cardX + 190, cardY + 240, w.name, {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '600',
                fontSize: '18px',
                color: '#8a7a60'
            }).setOrigin(0.5);
            this.slideContainer.add(nameLabel);

            // Hover fix: guardamos escala original y usamos tween limpio
            let hoverTween = null;
            img.on('pointerover', () => {
                if (this.activeWeaponIndex !== idx) {
                    if (hoverTween) hoverTween.stop();
                    hoverTween = this.tweens.add({
                        targets: img,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 150,
                        ease: 'Back.Out'
                    });
                    nameLabel.setColor(w.colorStr);
                }
            });
            img.on('pointerout', () => {
                if (this.activeWeaponIndex !== idx) {
                    if (hoverTween) hoverTween.stop();
                    hoverTween = this.tweens.add({
                        targets: img,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 150,
                        ease: 'Back.In'
                    });
                    nameLabel.setColor('#8a7a60');
                }
            });
            img.on('pointerdown', () => {
                updateWeapon(idx);
                // Efecto click breve
                this.tweens.add({
                    targets: img,
                    scaleX: 0.98,
                    scaleY: 0.98,
                    duration: 60,
                    yoyo: true,
                    onComplete: () => {
                        img.setScale(1);
                    }
                });
                nameLabel.setColor(w.colorStr);
                // Aseguramos que cualquier hover residual se resetee
                if (hoverTween) hoverTween.stop();
            });
        });

        updateWeapon(this.activeWeaponIndex);
    }

    // ------------------------------------------------------------
    // SLIDE 3 - ENEMIGOS (con hover fix)
    // ------------------------------------------------------------
    buildSlideEnemies() {
        this.addTag(40, 100, 'Archivo de amenazas', 0x8b1a2f);
        const title = this.add.text(40, 130, 'AMENAZAS DE LA GRIETA', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '800',
            fontSize: '38px',
            color: '#f0e0e0',
            letterSpacing: 2
        });
        this.slideContainer.add(title);

        const enemiesData = [
            {
                name: 'No-Muerto', image: 'zombie', class: 'Infantería de plaga',
                threat: 'Baja · Alta densidad', weakness: 'Escopeta corta distancia',
                desc: 'Restos de los habitantes de Valdris animados por energía primigenia. Lentos pero asfixiantes en horda.',
                flavor: '“Lo más aterrador no es que quieran matarte. Es que no quieren nada.”',
                color: 0x2a6a20, colorStr: '#50a040'
            },
            {
                name: 'Centinela', image: 'iron-sentinel', class: 'Forjado poseído',
                threat: 'Media · Blindaje pesado', weakness: 'Articulaciones expuestas',
                desc: 'Antiguos guardianes mecánicos poseídos por entidades de fuego. Cargan y disparan proyectiles incendiarios.',
                flavor: '“Fueron construidos para proteger. Ya no recuerdan a quién.”',
                color: 0xb06010, colorStr: '#e09040'
            },
            {
                name: 'Egregor', image: 'egregor', class: 'Entidad interdimensional',
                threat: 'Extrema · Jefe final', weakness: 'Las tres reliquias a la vez',
                desc: 'Dios exiliado que abrió La Grieta. Habita el Templo de los Susurros, dobla el espacio y convoca oleadas.',
                flavor: '“No es maldad. Es hambre. Y lleva siglos sin comer.”',
                color: 0x8b1a2f, colorStr: '#c04060'
            }
        ];

        this.enemyBorders = [];
        this.enemyImages = [];

        this.addTextPanel(40, 460, 1200, 200, 0x0d0b14);

        const infoName = this.add.text(60, 475, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '700',
            fontSize: '26px',
            color: '#f0e8e8'
        });
        const infoClass = this.add.text(60, 510, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '16px',
            color: '#7a5a60'
        });
        const infoMeta = this.add.text(700, 475, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '400',
            fontSize: '15px',
            color: '#b0a0a0',
            wordWrap: { width: 500, useAdvancedWrap: true },
            lineSpacing: 8
        });
        const infoDesc = this.add.text(60, 550, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '400',
            fontSize: '15px',
            color: '#c0b0b0',
            wordWrap: { width: 1160, useAdvancedWrap: true },
            lineSpacing: 6
        });
        const infoFlavor = this.add.text(60, 620, '', {
            fontFamily: '"Montserrat", sans-serif',
            fontStyle: '300 italic',
            fontSize: '14px',
            color: '#5a4a40'
        });
        this.slideContainer.add(infoName);
        this.slideContainer.add(infoClass);
        this.slideContainer.add(infoMeta);
        this.slideContainer.add(infoDesc);
        this.slideContainer.add(infoFlavor);

        const updateEnemy = (index) => {
            this.activeEnemyIndex = index;
            const e = enemiesData[index];

            this.enemyBorders.forEach((b, i) => {
                b.clear();
                if (i === index) {
                    b.lineStyle(2, e.color, 1);
                    b.fillStyle(0x0d0b14, 0.95);
                    b.lineStyle(2, e.color, 1);
                    b.lineBetween(0, 0, 380, 0);
                } else {
                    b.lineStyle(1, 0x2a2434, 0.8);
                    b.fillStyle(0x0a0812, 0.9);
                }
                b.strokeRect(0, 0, 380, 260);
                b.fillRect(0, 0, 380, 260);
            });

            infoName.setText(e.name).setColor(e.colorStr);
            infoClass.setText(e.class);
            infoMeta.setText(`Amenaza: ${e.threat}\nDebilidad: ${e.weakness}`);
            infoDesc.setText(e.desc);
            infoFlavor.setText(e.flavor);
        };

        enemiesData.forEach((e, idx) => {
            const cardX = 40 + idx * 400;
            const cardY = 180;

            const border = this.add.graphics();
            border.x = cardX;
            border.y = cardY;
            this.slideContainer.add(border);
            this.enemyBorders.push(border);

            const img = this.add.image(cardX + 190, cardY + 140, e.image)
                .setDisplaySize(280, 210)
                .setAlpha(0.9)
                .setInteractive({ useHandCursor: true });
            this.slideContainer.add(img);
            this.enemyImages.push(img);

            const nameLabel = this.add.text(cardX + 190, cardY + 240, e.name, {
                fontFamily: '"Montserrat", sans-serif',
                fontStyle: '600',
                fontSize: '18px',
                color: '#8a6a70'
            }).setOrigin(0.5);
            this.slideContainer.add(nameLabel);

            let hoverTween = null;
            img.on('pointerover', () => {
                if (this.activeEnemyIndex !== idx) {
                    if (hoverTween) hoverTween.stop();
                    hoverTween = this.tweens.add({
                        targets: img,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 150,
                        ease: 'Back.Out'
                    });
                    nameLabel.setColor(e.colorStr);
                }
            });
            img.on('pointerout', () => {
                if (this.activeEnemyIndex !== idx) {
                    if (hoverTween) hoverTween.stop();
                    hoverTween = this.tweens.add({
                        targets: img,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 150,
                        ease: 'Back.In'
                    });
                    nameLabel.setColor('#8a6a70');
                }
            });
            img.on('pointerdown', () => {
                updateEnemy(idx);
                this.tweens.add({
                    targets: img,
                    scaleX: 0.98,
                    scaleY: 0.98,
                    duration: 60,
                    yoyo: true,
                    onComplete: () => img.setScale(1)
                });
                if (hoverTween) hoverTween.stop();
            });
        });

        updateEnemy(this.activeEnemyIndex);
    }

    // ------------------------------------------------------------
    // Navegación
    // ------------------------------------------------------------
    nextSlide() {
        if (this.currentSlide === this.maxSlides - 1) this.skipPresentation();
        else this.goToSlide(this.currentSlide + 1);
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
            alpha: 0,
            y: -20,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
                this.currentSlide = index;
                this.slideContainer.setPosition(0, 20);
                this.buildSlide();
                this.tweens.add({
                    targets: this.slideContainer,
                    alpha: 1,
                    y: 0,
                    duration: 300,
                    ease: 'Power2',
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
        this.cameras.main.fadeOut(800, 8, 6, 12);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Menu');
        });
    }

    // ------------------------------------------------------------
    // Máquina de escribir mejorada
    // ------------------------------------------------------------
    startTypewriter(textObj, fullString) {
        textObj.setText('');
        let charIndex = 0;
        const event = this.time.addEvent({
            delay: 15,
            callback: () => {
                if (charIndex < fullString.length) {
                    textObj.text += fullString[charIndex];
                    charIndex++;
                } else {
                    event.destroy();
                }
            },
            loop: true
        });
        this.typingEvents.push(event);

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