class Menu extends Phaser.Scene {
    constructor() {
        super({ key: 'Menu' });
    }

    preload() {
        // Preload Menu Background
        this.load.image('menu-bg', 'assets/init/scene.png');
        
        // Ensure spark texture is available (in case presentation wasn't run)
        if (!this.textures.exists('spark')) {
            const canvas = this.textures.createCanvas('spark', 8, 8);
            const ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 8, 8);
            canvas.refresh();
        }
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Background image (Cover fit)
        const bg = this.add.image(width / 2, height / 2, 'menu-bg');
        bg.setDisplaySize(width, height).setAlpha(0.85);

        // Dark Vignette/Shadow Overlay for text readability
        const vignette = this.add.graphics();
        vignette.fillStyle(0x0a090e, 0.55);
        vignette.fillRect(0, 0, width, height);

        // Golden Frame around screen edges for premium feel
        const frame = this.add.graphics();
        frame.lineStyle(4, 0xffd700, 0.4);
        frame.strokeRect(10, 10, width - 20, height - 20);
        frame.lineStyle(1.5, 0x00f0ff, 0.3);
        frame.strokeRect(15, 15, width - 30, height - 30);

        // Retro CRT Scanlines
        const scanlines = this.add.graphics();
        scanlines.lineStyle(1, 0x000000, 0.15);
        for (let y = 0; y < height; y += 4) {
            scanlines.strokeLineShape(new Phaser.Geom.Line(0, y, width, y));
        }

        // Particle Emitter for glowing embers floating up
        this.sparkEmitter = this.add.particles(0, 0, 'spark', {
            x: { min: 20, max: width - 20 },
            y: height + 10,
            lifespan: { min: 4000, max: 7000 },
            speedY: { min: -15, max: -45 },
            speedX: { min: -10, max: 10 },
            scale: { start: 1.5, end: 0.1 },
            alpha: { start: 0.5, end: 0 },
            tint: [0xff9f1c, 0x00f0ff, 0xb7094c], // Ember colors (Orange, Cyan, Purple)
            frequency: 100
        });

        // 2. Title Text with float animation
        this.titleContainer = this.add.container(width / 2, 200);

        const mainTitleShadow = this.add.text(2, 2, 'EL ÚLTIMO CAZADOR\nDE RELIQUIAS', {
            font: '34px "Montserrat"',
            fill: '#000000',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        const mainTitle = this.add.text(0, 0, 'EL ÚLTIMO CAZADOR\nDE RELIQUIAS', {
            font: '34px "Montserrat"',
            fill: '#ffd700',
            align: 'center',
            lineSpacing: 10,
            stroke: '#100e17',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.titleContainer.add([mainTitleShadow, mainTitle]);

        // Floating tween on the title
        this.tweens.add({
            targets: this.titleContainer,
            y: 185,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle/Tagline
        const subTitle = this.add.text(width / 2, 290, '— RECONSTRUYE TU ARSENAL. SELLA LA GRIETA. —', {
            font: '12px "Montserrat"',
            fill: '#a0a0ff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // 3. Menu UI Buttons Container
        this.buttonsContainer = this.add.container(0, 0);

        // Button 1: Iniciar Juego
        this.createMenuButton(width / 2, 400, 'INICIAR AVENTURA', () => {
            this.showLevelSelect();
        });

        // Button 2: Historia y Reliquias
        this.createMenuButton(width / 2, 480, 'HISTORIA Y LORE', () => {
            this.cameras.main.fadeOut(500, 16, 14, 23);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('Presentation');
            });
        });

        // 4. Modal and Layer placeholders
        this.modalContainer = null;
        this.levelSelectContainer = null;

        // Camera Fade In
        this.cameras.main.fadeIn(600, 16, 14, 23);
    }

    createMenuButton(x, y, text, callback) {
        const btnText = this.add.text(x, y, text, {
            font: '18px "Montserrat"',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Left and Right Arrow Indicators
        const leftArr = this.add.text(x - 200, y - 2, '◆', {
            font: '18px "Montserrat"',
            fill: '#00f0ff'
        }).setOrigin(0.5).setAlpha(0);

        const rightArr = this.add.text(x + 200, y - 2, '◆', {
            font: '18px "Montserrat"',
            fill: '#00f0ff'
        }).setOrigin(0.5).setAlpha(0);

        this.buttonsContainer.add([btnText, leftArr, rightArr]);

        btnText.on('pointerover', () => {
            if (this.modalContainer || this.levelSelectContainer) return;
            
            btnText.setStyle({ fill: '#00f0ff' });
            
            this.tweens.add({
                targets: btnText,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 120
            });

            // Slide arrows in closer to text
            const textHalfW = btnText.width / 2;
            this.tweens.add({
                targets: leftArr,
                x: x - textHalfW - 25,
                alpha: 1,
                duration: 150,
                ease: 'Power1.easeOut'
            });
            this.tweens.add({
                targets: rightArr,
                x: x + textHalfW + 25,
                alpha: 1,
                duration: 150,
                ease: 'Power1.easeOut'
            });

            // Small spark emitter burst
            this.sparkEmitter.emitParticleAt(x, y, 6);
        });

        btnText.on('pointerout', () => {
            btnText.setStyle({ fill: '#ffffff' });
            
            this.tweens.add({
                targets: btnText,
                scaleX: 1,
                scaleY: 1,
                duration: 120
            });

            this.tweens.add({
                targets: [leftArr, rightArr],
                alpha: 0,
                x: (target) => target === leftArr ? x - 200 : x + 200,
                duration: 150
            });
        });

        btnText.on('pointerdown', () => {
            if (this.modalContainer || this.levelSelectContainer) return;
            callback();
        });
    }

    // --- LEVEL SELECT POPUP ---
    showLevelSelect() {
        if (this.levelSelectContainer) return;

        // Hide main buttons
        this.tweens.add({
            targets: this.buttonsContainer,
            alpha: 0,
            y: 50,
            duration: 250,
            onComplete: () => {
                this.buttonsContainer.setVisible(false);
            }
        });

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.levelSelectContainer = this.add.container(0, 0);

        // Semi-transparent background panel
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x0c0b11, 0.95);
        panelBg.lineStyle(3, 0xffd700, 0.7);
        panelBg.fillRoundedRect(120, 80, 1040, 560, 12);
        panelBg.strokeRoundedRect(120, 80, 1040, 560, 12);
        this.levelSelectContainer.add(panelBg);

        // Header Title
        const header = this.add.text(640, 120, 'SELECCIÓN DE NIVEL', {
            font: '24px "Montserrat"',
            fill: '#ffd700'
        }).setOrigin(0.5);
        this.levelSelectContainer.add(header);

        // Level Details Data
        const levels = [
            {
                num: 'NIVEL 1',
                name: 'Cripta en Ruinas',
                env: 'Bosque Maldito',
                danger: 'Fácil (Invasión Inicial)',
                weapon: 'La Centella (Pistola de Energía)',
                boss: 'No-Muertos Corrompidos',
                bossKey: 'zombie',
                desc: 'Las catacumbas ancestrales de Valdris han colapsado bajo una niebla púrpura. Eamon debe adentrarse en las ruinas plagadas de no-muertos para recuperar la legendaria pistola Centella y canalizar sus primeras almas.',
                color: 0x44aa33,
                colorStr: '#44aa33'
            },
            {
                num: 'NIVEL 2',
                name: 'Fortaleza de Hierro',
                env: 'Antigua Forja de Guerra',
                danger: 'Medio (Defensores de Fuego)',
                weapon: 'La Rompehuesos (Escopeta Oxidada)',
                boss: 'Centinela de Hierro',
                bossKey: 'iron-sentinel',
                desc: 'La gigantesca forja mecánica de la fortaleza bombea magma y cenizas. Soldados poseídos por entidades elementales patrullan las compuertas. Aquí descansa la Rompehuesos, capaz de barrer escuadrones completos.',
                color: 0xff9f1c,
                colorStr: '#ff9f1c'
            },
            {
                num: 'NIVEL 3',
                name: 'Templo de los Susurros',
                env: 'Morada de Egregor',
                danger: 'Pesadilla (Combate de Dios)',
                weapon: 'La Perforadora (Rifle de Precisión)',
                boss: 'Egregor (El Dios entre Planos)',
                bossKey: 'egregor',
                desc: 'La grieta espacial es total. En el templo flotante entre dimensiones, el dios Egregor acumula energía para devorar Valdris. Eamon debe usar la Perforadora para asestar el golpe final al núcleo de Egregor.',
                color: 0xb7094c,
                colorStr: '#b7094c'
            }
        ];

        this.selectedLevelIndex = 0;
        this.levelButtons = [];
        this.levelBorders = [];

        // Right side - Detail Card panel
        const detailBox = this.add.graphics();
        this.levelSelectContainer.add(detailBox);

        // Detail elements
        const lvlNumText = this.add.text(540, 185, '', { font: '14px "Montserrat"', fill: '#00f0ff' });
        const lvlNameText = this.add.text(540, 215, '', { font: '24px "Montserrat"', fill: '#ffffff', style: 'bold' });
        const lvlInfoText = this.add.text(540, 260, '', {
            font: '19px "VT323"',
            fill: '#e0e0e0',
            wordWrap: { width: 560, useAdvancedWrap: true },
            lineSpacing: 5
        });
        this.levelSelectContainer.add([lvlNumText, lvlNameText, lvlInfoText]);

        // Boss profile inside details panel
        const bossFrame = this.add.graphics();
        const bossImg = this.add.image(960, 480, 'zombie').setDisplaySize(200, 200).setOrigin(0.5);
        this.levelSelectContainer.add([bossFrame, bossImg]);

        const updateLevelDetails = (index) => {
            this.selectedLevelIndex = index;
            const lvl = levels[index];

            // Update button border graphics
            this.levelBorders.forEach((b, idx) => {
                b.clear();
                if (idx === index) {
                    b.lineStyle(3, lvl.color, 1);
                    b.fillStyle(0x1a162b, 0.4);
                } else {
                    b.lineStyle(1.5, 0x444444, 0.5);
                    b.fillStyle(0x100e17, 0.6);
                }
                b.strokeRoundedRect(0, 0, 340, 95, 6);
                b.fillRoundedRect(0, 0, 340, 95, 6);
            });

            // Update details panel background
            detailBox.clear();
            detailBox.fillStyle(0x100e17, 0.85);
            detailBox.lineStyle(2, lvl.color, 0.4);
            detailBox.fillRoundedRect(510, 170, 610, 380, 8);
            detailBox.strokeRoundedRect(510, 170, 610, 380, 8);

            // Set texts
            lvlNumText.setText(`${lvl.num} - ${lvl.env.toUpperCase()}`).setColor(lvl.colorStr);
            lvlNameText.setText(lvl.name);
            lvlInfoText.setText(
`PELIGRO: ${lvl.danger}
RELIQUIA: ${lvl.weapon}
AMENAZA CLAVE: ${lvl.boss}

SINOPSIS:
${lvl.desc}`
            );

            // Update Boss Image
            bossImg.setTexture(lvl.bossKey);
            // Egregor is taller, others square-ish
            if (lvl.bossKey === 'egregor') {
                bossImg.setDisplaySize(160, 220).setY(450);
            } else {
                bossImg.setDisplaySize(180, 180).setY(460);
            }

            // Draw Boss frame
            bossFrame.clear();
            bossFrame.lineStyle(2, lvl.color, 0.6);
            bossFrame.fillStyle(0x000000, 0.3);
            if (lvl.bossKey === 'egregor') {
                bossFrame.strokeRect(870, 330, 180, 240);
                bossFrame.fillRect(870, 330, 180, 240);
            } else {
                bossFrame.strokeRect(860, 360, 200, 200);
                bossFrame.fillRect(860, 360, 200, 200);
            }
        };

        // Render Left Buttons for Level List
        levels.forEach((lvl, idx) => {
            const btnX = 150;
            const btnY = 180 + idx * 125;

            // Border graphics
            const border = this.add.graphics();
            border.x = btnX;
            border.y = btnY;
            this.levelSelectContainer.add(border);
            this.levelBorders.push(border);

            // Container for text layers inside card
            const numText = this.add.text(btnX + 20, btnY + 15, lvl.num, {
                font: '11px "Montserrat"',
                fill: '#888888'
            });
            const nameText = this.add.text(btnX + 20, btnY + 35, lvl.name, {
                font: '20px "Montserrat"',
                fill: '#ffffff',
                style: 'bold'
            });
            const envText = this.add.text(btnX + 20, btnY + 65, lvl.env, {
                font: '14px "VT323"',
                fill: '#00f0ff'
            });

            this.levelSelectContainer.add([numText, nameText, envText]);

            // Invisible interactive overlay block
            const hitZone = this.add.zone(btnX + 170, btnY + 47, 340, 95)
                .setInteractive({ useHandCursor: true });
            this.levelSelectContainer.add(hitZone);

            hitZone.on('pointerover', () => {
                if (this.selectedLevelIndex !== idx) {
                    border.clear();
                    border.lineStyle(3, lvl.color, 0.7);
                    border.fillStyle(0x1a162b, 0.2);
                    border.strokeRoundedRect(0, 0, 340, 95, 6);
                    border.fillRoundedRect(0, 0, 340, 95, 6);
                    envText.setStyle({ fill: '#ffffff' });
                }
            });

            hitZone.on('pointerout', () => {
                if (this.selectedLevelIndex !== idx) {
                    border.clear();
                    border.lineStyle(1.5, 0x444444, 0.5);
                    border.fillStyle(0x100e17, 0.6);
                    border.strokeRoundedRect(0, 0, 340, 95, 6);
                    border.fillRoundedRect(0, 0, 340, 95, 6);
                    envText.setStyle({ fill: '#00f0ff' });
                }
            });

            hitZone.on('pointerdown', () => {
                updateLevelDetails(idx);
            });
        });

        // JUGAR / COMENZAR Button
        const playBtnBg = this.add.graphics();
        this.levelSelectContainer.add(playBtnBg);

        const playText = this.add.text(640, 595, 'COMENZAR RETO', {
            font: '14px "Montserrat"',
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.levelSelectContainer.add(playText);

        const redrawPlayBtn = (hover) => {
            const currentLvl = levels[this.selectedLevelIndex];
            playBtnBg.clear();
            if (hover) {
                playBtnBg.fillStyle(currentLvl.color, 0.85);
                playBtnBg.lineStyle(2, 0xffffff, 1);
                playText.setStyle({ fill: '#ffffff' });
            } else {
                playBtnBg.fillStyle(0x100e17, 0.9);
                playBtnBg.lineStyle(2, currentLvl.color, 0.8);
                playText.setStyle({ fill: currentLvl.colorStr });
            }
            playBtnBg.fillRoundedRect(440, 570, 400, 50, 6);
            playBtnBg.strokeRoundedRect(440, 570, 400, 50, 6);
        };

        playText.on('pointerover', () => {
            redrawPlayBtn(true);
            this.tweens.add({ targets: playText, scaleX: 1.05, scaleY: 1.05, duration: 100 });
        });
        playText.on('pointerout', () => {
            redrawPlayBtn(false);
            this.tweens.add({ targets: playText, scaleX: 1, scaleY: 1, duration: 100 });
        });
        playText.on('pointerdown', () => {
            this.startLevelDemo(this.selectedLevelIndex);
        });

        // Close Level Select Button
        const closeBtn = this.add.text(1135, 95, '✕', {
            font: '24px "Montserrat"',
            fill: '#a0a0a0'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.levelSelectContainer.add(closeBtn);

        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#ff4444' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#a0a0a0' }));
        closeBtn.on('pointerdown', () => {
            // Fade out Level Select and restore main menu
            this.tweens.add({
                targets: this.levelSelectContainer,
                alpha: 0,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 200,
                onComplete: () => {
                    this.levelSelectContainer.destroy();
                    this.levelSelectContainer = null;
                    
                    this.buttonsContainer.setVisible(true);
                    this.tweens.add({
                        targets: this.buttonsContainer,
                        alpha: 1,
                        y: 0,
                        duration: 200
                    });
                }
            });
        });

        // Init details
        updateLevelDetails(0);
        redrawPlayBtn(false);

        // Slide Level Select Up animation
        this.levelSelectContainer.setAlpha(0).setScale(0.95);
        this.levelSelectContainer.x = width * 0.025; // slightly offset for scaling origin
        this.levelSelectContainer.y = height * 0.025;
        this.tweens.add({
            targets: this.levelSelectContainer,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
            duration: 250,
            ease: 'Back.easeOut'
        });
    }



    // --- GAMEPLAY DEMO TRIGGER ---
    startLevelDemo(levelIndex) {
        // Fade out menu
        this.cameras.main.fadeOut(800, 10, 9, 15);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Check if gameplay scene exists. If so, start it, passing levelIndex!
            if (this.scene.get('Gameplay')) {
                this.scene.start('Gameplay', { levelIndex: levelIndex });
            } else {
                // Fail-safe: restart Menu if no scene is loaded yet
                this.scene.start('Menu');
            }
        });
    }
}
