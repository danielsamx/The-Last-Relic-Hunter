// ============================================================================
//  gameplay.js — Escena de Gameplay Isométrica 2.5D Avanzada (Phaser 3)
//  Compatible con Phaser 3.60.0 y física Arcade de Cartesian Space
// ============================================================================

class Gameplay extends Phaser.Scene {
    constructor() {
        super({ key: 'Gameplay' });
    }

    init(data) {
        // Índice de nivel: 0 = Cripta, 1 = Forja, 2 = Templo (2 por defecto para acción inmediata con Egregor)
        this.levelIndex = data.levelIndex !== undefined ? data.levelIndex : 2;
        
        // Estados principales del juego
        this.score = 0;
        this.playerHp = 5;
        this.maxPlayerHp = 5;
        this.isGameOver = false;
        this.isVictory = false;
        this.isInvulnerable = false;
        
        // Arma activa (0 = Centella, 1 = Rompehuesos, 2 = Perforadora)
        this.activeWeapon = 0;
        this.lastFired = 0;
        this.isShooting = false;
        
        // Dirección de mirada por defecto en espacio Cartesiano (1, 0 = Sureste)
        this.playerFacingDirection = { x: 1, y: 0 };
        
        // Configuraciones de Nivel
        this.levelConfigs = [
            {
                name: 'Cripta en Ruinas',
                env: 'Bosque Maldito',
                targetScore: 15,
                color: 0x44aa33,
                colorStr: '#44aa33',
                bgTile: 0x141e17,
                gridColor: 0x223526,
                enemyTypes: ['zombie'],
                hasBoss: false
            },
            {
                name: 'Fortaleza de Hierro',
                env: 'Antigua Forja de Guerra',
                targetScore: 15,
                color: 0xff9f1c,
                colorStr: '#ff9f1c',
                bgTile: 0x1f1510,
                gridColor: 0x3d2518,
                enemyTypes: ['zombie', 'sentinel'],
                hasBoss: false
            },
            {
                name: 'Templo de los Susurros',
                env: 'Morada de Egregor',
                targetScore: 25,
                color: 0xb7094c,
                colorStr: '#b7094c',
                bgTile: 0x131019,
                gridColor: 0x2b1b38,
                enemyTypes: ['zombie', 'sentinel'],
                hasBoss: true
            }
        ];

        this.cfg = this.levelConfigs[this.levelIndex];

        // --- Configuración Isométrica 2:1 ---
        this.tileSize = 64; // Tamaño de celda en espacio físico Cartesiano
        this.isoWidth = 64; // Ancho visual de un tile isométrico
        this.isoHeight = 32; // Alto visual de un tile isométrico
        
        // Puntos de origen para centrar el diamante del mapa en pantalla
        this.mapOriginX = 1400;
        this.mapOriginY = 100;
    }

    preload() {
        // Cargar spritesheet de Eamon (5 filas × 5 columnas = 25 frames, 128x128 píxeles)
        this.load.spritesheet('eamon-spritesheet', 'assets/eamon/eamon-spritesheet.png', {
            frameWidth: 128,
            frameHeight: 128
        });

        // Cargar Tileset de Suelo y Muros Isométricos
        this.load.image('isometric-tileset', 'assets/tilesets/the-crack-tileset.png');
        
        // Cargar Tileset como spritesheet para instanciar obstáculos individuales
        this.load.spritesheet('isometric-tiles', 'assets/tilesets/the-crack-tileset.png', {
            frameWidth: 64,
            frameHeight: 32
        });

        // Cargar mapa JSON (contiene metadatos e información de capas)
        this.load.tilemapTiledJSON('isometric-map', 'assets/tilemaps/the-crack.json');

        // Fail-safes de assets (precarga si no están cargados por la escena anterior)
        this.load.image('eamon-portrait', 'assets/eamon/eamon.png');
        this.load.image('egregor',        'assets/egregor/egregor.png');
        this.load.image('centella',       'assets/guns/centella/centella.png');
        this.load.image('perforadora',    'assets/guns/perforadora/perforadora.png');
        this.load.image('rompehuesos',    'assets/guns/rompehuesos/rompe-huesos.png');
        this.load.image('zombie',         'assets/zombie/zombie.png');
        this.load.image('iron-sentinel',  'assets/iron-sentinel/iron-sentinel.png');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // --- 1. FÓRMULAS DE CONVERSIÓN COORDENADAS ---
        // Convierte coordenadas de Mundo Cartesiano (x, y) a Isometric Screen (screenX, screenY)
        this.cartesianToIsometric = (x, y) => {
            const screenX = (x - y) * 0.5 + this.mapOriginX;
            const screenY = (x + y) * 0.25 + this.mapOriginY;
            return { x: screenX, y: screenY };
        };

        // Convierte coordenadas Isometric Screen (screenX, screenY) a Mundo Cartesiano (x, y)
        this.isometricToCartesian = (screenX, screenY) => {
            const relativeX = screenX - this.mapOriginX;
            const relativeY = screenY - this.mapOriginY;
            const x = relativeX + 2 * relativeY;
            const y = 2 * relativeY - relativeX;
            return { x: x, y: y };
        };

        // Convierte celda de rejilla (col, row) a centro de celda en Mundo Cartesiano (x, y)
        this.tileToCartesian = (col, row) => {
            const x = col * this.tileSize + this.tileSize / 2;
            const y = row * this.tileSize + this.tileSize / 2;
            return { x: x, y: y };
        };

        // Convierte celda de rejilla (col, row) a coordenadas de pantalla isométricas (screenX, screenY)
        this.tileToIsometric = (col, row) => {
            const cart = this.tileToCartesian(col, row);
            return this.cartesianToIsometric(cart.x, cart.y);
        };

        // --- 2. ANÁLISIS AUTOMÁTICO DE FRAMES DEL SPRITESHEET ---
        const texture = this.textures.get('eamon-spritesheet');
        // El primer frame suele ser '__BASE', por lo que restamos 1 para obtener los frames del grid real
        const totalFrames = texture.frameTotal - 1;
        const cols = 5;
        const rows = Math.ceil(totalFrames / cols);
        console.log(`%c[Eamon Frame Analyzer] Spritesheet detectado: ${totalFrames} frames totales (${cols} columnas x ${rows} filas)`, 'color: #00f0ff; font-weight: bold;');

        // --- 3. CREACIÓN DE ANIMACIONES DINÁMICAS (5 FILAS) ---
        // Fila 0 (frames 0-4): Idle (reposo)
        this.anims.create({
            key: 'eamon_idle',
            frames: this.anims.generateFrameNumbers('eamon-spritesheet', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });

        // Fila 1 (frames 5-9): Running (caminar/correr)
        this.anims.create({
            key: 'eamon_run',
            frames: this.anims.generateFrameNumbers('eamon-spritesheet', { start: 5, end: 9 }),
            frameRate: 12,
            repeat: -1
        });

        // Fila 2 (frames 10-14): Strafe (movimiento lateral izquierda/derecha)
        this.anims.create({
            key: 'eamon_strafe',
            frames: this.anims.generateFrameNumbers('eamon-spritesheet', { start: 10, end: 14 }),
            frameRate: 12,
            repeat: -1
        });

        // Fila 3 (frames 15-19): Shooting (disparo)
        this.anims.create({
            key: 'eamon_shoot',
            frames: this.anims.generateFrameNumbers('eamon-spritesheet', { start: 15, end: 19 }),
            frameRate: 15,
            repeat: 0
        });

        // Fila 4 (frames 20-24): Dying (muerte)
        this.anims.create({
            key: 'eamon_die',
            frames: this.anims.generateFrameNumbers('eamon-spritesheet', { start: 20, end: 24 }),
            frameRate: 8,
            repeat: 0
        });

        // --- 4. TILEMAP ISOMÉTRICO Y SUELO ---
        // Dimensiones físicas del mapa en espacio Cartesiano (30 celdas x 64px = 1920px)
        this.mapWidth = 30 * this.tileSize;
        this.mapHeight = 30 * this.tileSize;

        // Establecer límites del mundo físico en espacio cartesiano
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Crear la estructura de Tilemap
        const map = this.make.tilemap({ key: 'isometric-map' });
        const tileset = map.addTilesetImage('valdris_corrupted_isometric', 'isometric-tileset');
        
        // Crear capa de suelo isométrico nativa en Phaser
        this.sueloLayer = map.createLayer('Suelo_Corrupto', tileset);
        this.sueloLayer.setPosition(this.mapOriginX, this.mapOriginY);
        this.sueloLayer.setDepth(0); // El suelo siempre va al fondo

        // Rellenar dinámicamente la capa con patrones enriquecidos de suelo
        for (let col = 0; col < 30; col++) {
            for (let row = 0; row < 30; row++) {
                // Alternar entre varios tiles de suelo del tileset para lograr riqueza estética
                const index = 1 + ((col * 3 + row * 7) % 6);
                map.putTileAt(index, col, row, false, 'Suelo_Corrupto');
            }
        }

        // --- 5. GRUPOS FÍSICOS EN ESPACIO CARTESIANO ---
        // Rejilla de obstáculos físicos (Cartesiano AABB 2D)
        this.obstacles = this.physics.add.staticGroup();
        this.obstacleSprites = []; // Referencias de renderizado isométrico de obstáculos

        // Generar bordes de colisión isométricos (celdas 0 y 29) e instanciación de pilares neón
        for (let col = 0; col < 30; col++) {
            for (let row = 0; row < 30; row++) {
                const isBorder = (col === 0 || col === 29 || row === 0 || row === 29);
                const isInnerPillar = (col % 6 === 0 && row % 6 === 0 && col > 2 && col < 27 && row > 2 && row < 27);

                if (isBorder || isInnerPillar) {
                    const cart = this.tileToCartesian(col, row);
                    
                    // Cuerpo estático Cartesian
                    const obsBody = this.obstacles.create(cart.x, cart.y, null);
                    obsBody.setSize(this.tileSize, this.tileSize);
                    obsBody.setVisible(false);
                    obsBody.refreshBody();
                    
                    // Sprite Isométrico visible para Depth Sorting
                    const isoPos = this.cartesianToIsometric(cart.x, cart.y);
                    // Selección de frame de pilar/muro del tileset
                    const frameIdx = isInnerPillar ? 18 : 17;
                    const obsSprite = this.add.sprite(isoPos.x, isoPos.y - 12, 'isometric-tiles', frameIdx);
                    obsSprite.setOrigin(0.5, 0.5);
                    obsSprite.depth = cart.x + cart.y; // Profundidad dinámica inicial

                    // Brillo y tono neón inicial de acuerdo al nivel
                    obsSprite.setTint(this.cfg.color);
                    this.obstacleSprites.push(obsSprite);
                }
            }
        }

        // Oscilación de brillo pulsante en los muros neón (efecto visual premium)
        this.tweens.add({
            targets: this.obstacleSprites,
            alpha: { start: 0.7, end: 1 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Grupos de combate Cartesian
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.souls = this.physics.add.group();

        // --- 6. CONFIGURACIÓN DEL JUGADOR (EAMON) ---
        // Cuerpo físico en el plano Cartesiano (invisible)
        const spawnCart = this.tileToCartesian(15, 15); // Spawn en el centro exacto
        this.playerBody = this.physics.add.sprite(spawnCart.x, spawnCart.y, 'spark');
        this.playerBody.setVisible(false);
        this.playerBody.setCollideWorldBounds(true);
        this.playerBody.body.setSize(30, 30); // Cuerpo de colisión apretado para mover entre pilares

        // Sprite visible de Eamon en perspectiva isométrica
        const playerIso = this.cartesianToIsometric(spawnCart.x, spawnCart.y);
        this.player = this.add.sprite(playerIso.x, playerIso.y, 'eamon-spritesheet');
        this.player.setOrigin(0.5, 0.75); // Ajustar origen en los pies del personaje
        this.player.play('eamon_idle');

        // Sombra elíptica 2:1 bajo Eamon
        this.playerShadow = this.add.graphics();

        // Arma visible adjunta a las manos de Eamon
        this.weaponSprite = this.add.image(this.player.x, this.player.y, 'centella');
        this.weaponSprite.setOrigin(0.15, 0.5);
        this.updateWeaponDisplayScale();

        // --- 7. CÁMARA Y SEGUIMIENTO ---
        // Límites diagonales de la cámara isométrica
        this.cameras.main.setBounds(this.mapOriginX - 1050, 0, 2100, 1200);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // --- 8. COLISIONES DE FÍSICA ARCADE (CARTESIAN) ---
        this.physics.add.collider(this.playerBody, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.collider(this.enemyBullets, this.obstacles, this.hitObstacle, null, this);

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.enemies, this.playerBody, this.hitPlayer, null, this);
        this.physics.add.overlap(this.enemyBullets, this.playerBody, this.hitPlayerByBullet, null, this);
        this.physics.add.overlap(this.souls, this.playerBody, this.absorbSoul, null, this);

        // --- 9. CONFIGURACIÓN DEL TECLADO ---
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
            downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
            leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
            rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            k: Phaser.Input.Keyboard.KeyCodes.K // Simulación de muerte rápida
        });

        // --- 10. BUCLE DE SPAWN DE ENEMIGOS ---
        this.spawnTimer = this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // --- 11. SISTEMAS DE PARTÍCULAS ---
        this.deathParticles = this.add.particles(0, 0, 'spark', {
            lifespan: 800,
            speed: { min: 50, max: 150 },
            scale: { start: 1.5, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        this.shotParticles = this.add.particles(0, 0, 'spark', {
            lifespan: 350,
            speed: { min: 100, max: 200 },
            scale: { start: 1.2, end: 0.2 },
            alpha: { start: 0.7, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        // Polvo energético al correr (Premium Micro-animations)
        this.dustParticles = this.add.particles(0, 0, 'spark', {
            lifespan: 400,
            speed: { min: 20, max: 60 },
            scale: { start: 0.8, end: 0.1 },
            alpha: { start: 0.4, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        // --- 12. SISTEMA DE MUZZLE FLASH ---
        this.muzzleFlash = this.add.graphics();
        this.muzzleFlash.setVisible(false);

        // Rastreo de Boss
        this.bossSpawned = false;
        this.bossInstance = null;

        // --- 13. HUD OVERLAY ---
        this.createHUD();

        // Música y fade in de pantalla
        if (window.RelicAudio) {
            window.RelicAudio.start();
        }
        this.cameras.main.fadeIn(500, 16, 14, 23);
        
        // Spawnear al Boss Egregor y enemigos inmediatamente
        this.spawnEnemy();
    }

    update(time) {
        if (this.isGameOver || this.isVictory) return;

        // Salir a menú con Esc
        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this.quitToMenu();
            return;
        }

        // Simulación rápida de muerte con la tecla K
        if (Phaser.Input.Keyboard.JustDown(this.keys.k)) {
            this.takeDamage(this.playerHp);
            return;
        }

        // --- MOVIMIENTO DE CONTROLES FLUIDO (CARTESIANO) ---
        let vx = 0;
        let vy = 0;
        let baseSpeed = 150;
        let isRunning = this.keys.shift.isDown;
        let isStrafing = this.keys.q.isDown || this.keys.e.isDown;
        
        // Multiplicador de velocidad de carrera (x1.8)
        let currentSpeed = baseSpeed * (isRunning ? 1.8 : 1.0);

        // Control Strafe Q/E (Movimiento lateral en pantalla, que son diagonales en Cartesiano)
        if (this.keys.q.isDown) {
            // Strafe izquierda en pantalla: diagonal suroeste-noroeste => vx = -speed, vy = speed
            vx = -currentSpeed;
            vy = currentSpeed;
        } else if (this.keys.e.isDown) {
            // Strafe derecha en pantalla: diagonal noreste-sureste => vx = currentSpeed, vy = -currentSpeed
            vx = currentSpeed;
            vy = -currentSpeed;
        } else {
            // Movimiento normal WASD / Flechas mapeado isométricamente:
            // W / Flecha arriba => Noroeste => vx = -speed
            if (this.keys.up.isDown || this.keys.upArrow.isDown) vx = -currentSpeed;
            // S / Flecha abajo => Sureste => vx = speed
            if (this.keys.down.isDown || this.keys.downArrow.isDown) vx = currentSpeed;
            // A / Flecha izquierda => Suroeste => vy = speed
            if (this.keys.left.isDown || this.keys.leftArrow.isDown) vy = currentSpeed;
            // D / Flecha derecha => Noreste => vy = -currentSpeed
            if (this.keys.right.isDown || this.keys.rightArrow.isDown) vy = -currentSpeed;
        }

        // Normalizar velocidad diagonal
        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }

        // Aplicar velocidad al cuerpo físico en espacio Cartesiano
        this.playerBody.setVelocity(vx, vy);

        // --- ACTUALIZACIÓN DE COORDENADAS VISUALES E ISOMÉTRICAS ---
        const playerIso = this.cartesianToIsometric(this.playerBody.x, this.playerBody.y);
        this.player.x = playerIso.x;
        this.player.y = playerIso.y;
        
        // Depth Sorting continuo basado en Y Cartesiana
        this.player.depth = this.playerBody.x + this.playerBody.y;

        // --- ACTUALIZACIÓN DE SOMBRA ---
        this.playerShadow.clear();
        this.playerShadow.fillStyle(0x000000, 0.35);
        this.playerShadow.fillEllipse(this.player.x, this.player.y + 2, 40, 20); // Elipse 2:1 isométrica
        this.playerShadow.depth = this.player.depth - 1;

        // --- PARTÍCULAS DE POLVO EN CARRERA ---
        const isMoving = (vx !== 0 || vy !== 0);
        if (isMoving && isRunning && time % 6 === 0) {
            this.dustParticles.emitParticleAt(this.player.x, this.player.y + 2, 1);
        }

        // --- DIRECCIÓN Y FLIP EN MÁQUINA DE ESTADOS ---
        if (!this.isShooting) {
            if (isMoving) {
                if (isStrafing) {
                    // Strafe: Mirar siempre al Sureste (flipX = false), play strafe anim
                    this.player.setFlipX(false);
                    this.player.play('eamon_strafe', true);
                    this.playerFacingDirection = { x: 1, y: 0 };
                } else {
                    // Movimiento normal: Mirar en sentido de pantalla horizontal
                    const screenVx = (vx - vy) * 0.5;
                    if (screenVx < 0) {
                        this.player.setFlipX(true); // Mirar a la izquierda
                    } else if (screenVx > 0) {
                        this.player.setFlipX(false); // Mirar a la derecha
                    }

                    // Establecer vector de dirección Cartesiana
                    if (vx > 0) this.playerFacingDirection = { x: 1, y: 0 };       // Sureste
                    else if (vx < 0) this.playerFacingDirection = { x: -1, y: 0 };  // Noroeste
                    else if (vy > 0) this.playerFacingDirection = { x: 0, y: 1 };   // Suroeste
                    else if (vy < 0) this.playerFacingDirection = { x: 0, y: -1 };  // Noreste

                    this.player.play('eamon_run', true);
                    // Ajustar velocidad de la animación: rápido al correr, moderado al caminar
                    this.player.anims.timeScale = isRunning ? 1.35 : 0.85;
                }
            } else {
                this.player.play('eamon_idle', true);
                this.player.anims.timeScale = 1.0;
            }
        }

        // --- POSICIÓN Y ROTACIÓN DEL ARMA ---
        const faceRight = !this.player.flipX;
        
        // Colocar el arma en las manos del personaje de forma isométrica
        this.weaponSprite.x = this.player.x + (faceRight ? 10 : -10);
        this.weaponSprite.y = this.player.y - 18;
        this.weaponSprite.depth = this.player.depth + 1;
        
        // Rotar arma ligeramente de acuerdo a la dirección (cyber-look)
        if (this.keys.q.isDown || this.keys.e.isDown) {
            this.weaponSprite.setRotation(0);
        } else {
            // Invertir visualmente el arma si mira a la izquierda
            this.weaponSprite.setFlipY(!faceRight);
            if (faceRight) {
                if (vy > 0) this.weaponSprite.setRotation(0.3); // Apuntando abajo
                else if (vy < 0) this.weaponSprite.setRotation(-0.3); // Apuntando arriba
                else this.weaponSprite.setRotation(0);
            } else {
                if (vy > 0) this.weaponSprite.setRotation(-0.3); // Apuntando abajo
                else if (vy < 0) this.weaponSprite.setRotation(0.3); // Apuntando arriba
                else this.weaponSprite.setRotation(0);
            }
        }

        // --- SISTEMA DE DISPARO ---
        const isTriggered = Phaser.Input.Keyboard.JustDown(this.keys.space) || this.input.activePointer.isDown;
        if (isTriggered && time > this.lastFired) {
            this.shootWeapon(time);
        }

        // --- ACTUALIZACIÓN DE ENEMIGOS E IA ---
        this.enemies.getChildren().forEach((enemy) => {
            if (!enemy.active || !enemy.sprite) return;

            // IA sigue al jugador en plano Cartesiano
            const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerBody.x, this.playerBody.y);
            
            if (enemy.enemyType === 'zombie') {
                this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);
            } 
            else if (enemy.enemyType === 'sentinel') {
                if (!enemy.isCasting) {
                    this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);
                    
                    if (time > enemy.nextShootTime) {
                        enemy.isCasting = true;
                        enemy.setVelocity(0, 0);
                        enemy.sprite.setTint(0xff5522); // Calor de fuego
                        
                        this.time.delayedCall(400, () => {
                            if (enemy.active) {
                                this.fireEnemyBullet(enemy, angleToPlayer);
                                enemy.sprite.clearTint();
                                enemy.isCasting = false;
                                enemy.nextShootTime = time + Phaser.Math.Between(2500, 4500);
                            }
                        });
                    }
                }
            } 
            else if (enemy.enemyType === 'boss') {
                this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);

                if (time > enemy.nextAttackTime) {
                    enemy.nextAttackTime = time + 4000;
                    this.triggerBossAttack(enemy);
                }
            }

            // Actualizar sprite visible isométrico del enemigo
            const enemyIso = this.cartesianToIsometric(enemy.x, enemy.y);
            enemy.sprite.x = enemyIso.x;
            enemy.sprite.y = enemyIso.y;
            enemy.sprite.depth = enemy.x + enemy.y;
            enemy.sprite.setFlipX(this.playerBody.x < enemy.x);
        });

        // --- ACTUALIZACIÓN DE PROYECTILES Y SOULS ISOMÉTRICOS ---
        this.bullets.getChildren().forEach((b) => {
            if (b.x < 0 || b.x > this.mapWidth || b.y < 0 || b.y > this.mapHeight) {
                if (b.sprite) b.sprite.destroy();
                b.destroy();
                return;
            }
            const iso = this.cartesianToIsometric(b.x, b.y);
            b.sprite.x = iso.x;
            b.sprite.y = iso.y;
            b.sprite.depth = b.x + b.y + 10; // Dibujar balas sobre los pilares
        });

        this.enemyBullets.getChildren().forEach((b) => {
            if (b.x < 0 || b.x > this.mapWidth || b.y < 0 || b.y > this.mapHeight) {
                if (b.sprite) b.sprite.destroy();
                b.destroy();
                return;
            }
            const iso = this.cartesianToIsometric(b.x, b.y);
            b.sprite.x = iso.x;
            b.sprite.y = iso.y;
            b.sprite.depth = b.x + b.y + 10;
        });

        this.souls.getChildren().forEach((soul) => {
            const iso = this.cartesianToIsometric(soul.x, soul.y);
            soul.sprite.x = iso.x;
            soul.sprite.y = iso.y;
            soul.sprite.depth = soul.x + soul.y;
        });
    }

    // --- DISPARAR ARMAS ISOMÉTRICAS ---
    shootWeapon(time) {
        const weapons = [
            { key: 'centella', delay: 200, speed: 650, count: 1, damage: 1, color: 0x00f0ff, size: 6 },
            { key: 'rompehuesos', delay: 800, speed: 450, count: 5, damage: 1.5, color: 0xff9f1c, size: 5, spread: 0.28 },
            { key: 'perforadora', delay: 1100, speed: 1100, count: 1, damage: 5, color: 0xb7094c, size: 8 }
        ];

        const w = weapons[this.activeWeapon];
        this.lastFired = time + w.delay;

        // Entrar en modo visual de disparo (play shoot anim)
        this.isShooting = true;
        this.player.play('eamon_shoot', true);
        
        // Finalizar modo animación de disparo tras 300ms
        this.time.delayedCall(300, () => {
            this.isShooting = false;
        });

        // Posición del cañón del arma
        const faceRight = !this.player.flipX;
        const muzzleX = this.player.x + (faceRight ? 35 : -35);
        const muzzleY = this.player.y - 12;

        // Destello visual (Muzzle Flash)
        this.muzzleFlash.clear();
        this.muzzleFlash.fillStyle(w.color, 0.95);
        this.muzzleFlash.fillCircle(muzzleX, muzzleY, 15);
        this.muzzleFlash.depth = this.player.depth + 5;
        this.muzzleFlash.setVisible(true);
        this.time.delayedCall(50, () => this.muzzleFlash.setVisible(false));

        // Partículas en el disparo
        this.shotParticles.setTint(w.color);
        this.shotParticles.emitParticleAt(muzzleX, muzzleY, 5);

        // Vector dirección base Cartesian
        const dir = this.playerFacingDirection;

        if (w.key === 'rompehuesos') {
            // Escopeta: Cono de dispersión
            for (let i = 0; i < w.count; i++) {
                const spreadAngle = (i - (w.count - 1) / 2) * 0.15;
                // Rotar vector de dirección por el spread
                const rotatedDir = {
                    x: dir.x * Math.cos(spreadAngle) - dir.y * Math.sin(spreadAngle),
                    y: dir.x * Math.sin(spreadAngle) + dir.y * Math.cos(spreadAngle)
                };
                this.createBullet(this.playerBody.x, this.playerBody.y, rotatedDir, w);
            }
        } else {
            // Pistola / Rifle: Disparo lineal directo
            this.createBullet(this.playerBody.x, this.playerBody.y, dir, w);
        }

        // Sacudida de cámara por retroceso
        this.cameras.main.shake(100, 0.003 * (this.activeWeapon + 1));
    }

    createBullet(cartX, cartY, dir, config) {
        // Crear cuerpo físico Cartesian
        const bullet = this.physics.add.sprite(cartX, cartY, null);
        bullet.setSize(10, 10);
        bullet.setVisible(false);
        this.bullets.add(bullet);

        bullet.damageValue = config.damage;
        bullet.weaponIndex = this.activeWeapon;

        // Aplicar velocidad física Cartesian
        bullet.setVelocity(dir.x * config.speed, dir.y * config.speed);

        // Crear sprite de renderizado visible
        const iso = this.cartesianToIsometric(cartX, cartY);
        const bulletGraphic = this.add.graphics();
        bulletGraphic.fillStyle(config.color, 1);
        
        if (config.key === 'perforadora') {
            // Proyectil cilíndrico alargado
            bulletGraphic.fillRect(-10, -3, 20, 6);
        } else {
            bulletGraphic.fillCircle(0, 0, config.size);
        }
        
        const key = `bullet_${config.key}_${Phaser.Math.Between(0, 100000)}`;
        this.textures.addCanvas(key, bulletGraphic.canvas);
        bulletGraphic.destroy();

        bullet.sprite = this.add.image(iso.x, iso.y, key);
        // Alinear visualmente el sprite de la bala con su dirección
        bullet.sprite.setRotation(Math.atan2(dir.y, dir.x) * 0.5); 
    }

    // --- DISPAROS Y ATAQUES DE ENEMIGOS ---
    fireEnemyBullet(enemy, angle) {
        const bullet = this.physics.add.sprite(enemy.x, enemy.y, null);
        bullet.setSize(10, 10);
        bullet.setVisible(false);
        this.enemyBullets.add(bullet);

        const speed = 250;
        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const iso = this.cartesianToIsometric(enemy.x, enemy.y);
        bullet.sprite = this.add.image(iso.x, iso.y, 'spark');
        bullet.sprite.setDisplaySize(14, 14);
        bullet.sprite.setTint(0xff5522);
    }

    triggerBossAttack(boss) {
        // Tinte de parpadeo neón del boss antes de atacar
        this.tweens.add({
            targets: boss.sprite,
            tint: 0xb7094c,
            yoyo: true,
            duration: 150,
            repeat: 4
        });

        const attackType = Phaser.Math.Between(0, 2);

        // Ataque 1: Anillo de fuego circular
        if (attackType === 0) {
            for (let deg = 0; deg < 360; deg += 45) {
                const rad = Phaser.Math.DegToRad(deg);
                this.fireEnemyBullet(boss, rad);
            }
        } 
        // Ataque 2: Ráfaga cónica apuntada
        else if (attackType === 1) {
            const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.playerBody.x, this.playerBody.y);
            for (let i = -2; i <= 2; i++) {
                this.fireEnemyBullet(boss, angle + i * 0.15);
            }
        }
        // Ataque 3: Invocar zombis guardianes
        else {
            for (let i = 0; i < 2; i++) {
                const rx = boss.x + Phaser.Math.Between(-150, 150);
                const ry = boss.y + Phaser.Math.Between(-150, 150);
                this.spawnEnemyAt(rx, ry, 'zombie');
            }
        }
    }

    // --- ENEMY SPAWN Y COMPORTAMIENTO ---
    spawnEnemy() {
        if (this.isGameOver || this.isVictory) return;
        if (this.enemies.countActive(true) >= 15) return;

        // Spawning de Boss Egregor en el Nivel 3 de inmediato si no se ha generado
        if (this.cfg.hasBoss && !this.bossSpawned) {
            this.spawnBoss();
            return;
        }

        // Spawn fuera de cámara
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = 450;
        const ex = Phaser.Math.Clamp(this.playerBody.x + Math.cos(angle) * distance, 120, this.mapWidth - 120);
        const ey = Phaser.Math.Clamp(this.playerBody.y + Math.sin(angle) * distance, 120, this.mapHeight - 120);

        const type = this.cfg.enemyTypes[Phaser.Math.Between(0, this.cfg.enemyTypes.length - 1)];
        this.spawnEnemyAt(ex, ey, type);
    }

    spawnEnemyAt(x, y, type) {
        const enemy = this.physics.add.sprite(x, y, null);
        enemy.setCollideWorldBounds(true);
        this.enemies.add(enemy);

        enemy.enemyType = type;

        // Configurar atributos específicos del enemigo
        if (type === 'zombie') {
            enemy.setSize(30, 30);
            enemy.maxHp = 2;
            enemy.hp = 2;
            enemy.baseSpeed = 75 + Phaser.Math.Between(0, 30);
            enemy.damage = 1;
            
            // Sprite visible isométrico
            const iso = this.cartesianToIsometric(x, y);
            enemy.sprite = this.add.sprite(iso.x, iso.y, 'zombie');
            enemy.sprite.setDisplaySize(50, 56);
            enemy.sprite.setOrigin(0.5, 0.75);
        } else if (type === 'sentinel') {
            enemy.setSize(35, 35);
            enemy.maxHp = 5;
            enemy.hp = 5;
            enemy.baseSpeed = 110;
            enemy.damage = 1;
            enemy.isCasting = false;
            enemy.nextShootTime = this.time.now + Phaser.Math.Between(1500, 3500);

            const iso = this.cartesianToIsometric(x, y);
            enemy.sprite = this.add.sprite(iso.x, iso.y, 'iron-sentinel');
            enemy.sprite.setDisplaySize(60, 68);
            enemy.sprite.setOrigin(0.5, 0.75);
        }

        // Sombra elíptica asociada al enemigo
        enemy.shadow = this.add.graphics();

        // Efecto visual de entrada neón
        const iso = this.cartesianToIsometric(x, y);
        const glow = this.add.graphics();
        glow.fillStyle(this.cfg.color, 0.5);
        glow.fillCircle(iso.x, iso.y, 35);
        glow.depth = enemy.sprite.depth - 2;
        this.tweens.add({
            targets: glow,
            alpha: 0,
            scaleX: 1.6,
            scaleY: 1.6,
            duration: 450,
            onComplete: () => glow.destroy()
        });
    }

    spawnBoss() {
        this.bossSpawned = true;

        const bx = this.playerBody.x + (Phaser.Math.Between(0, 1) === 0 ? -250 : 250);
        const by = this.playerBody.y + (Phaser.Math.Between(0, 1) === 0 ? -250 : 250);

        this.bossInstance = this.physics.add.sprite(bx, by, null);
        this.bossInstance.setSize(60, 60);
        this.bossInstance.setCollideWorldBounds(true);
        this.enemies.add(this.bossInstance);

        this.bossInstance.enemyType = 'boss';
        this.bossInstance.maxHp = 60;
        this.bossInstance.hp = 60;
        this.bossInstance.baseSpeed = 55;
        this.bossInstance.damage = 2;
        this.bossInstance.nextAttackTime = this.time.now + 2000;

        // Sprite visible isométrico de Egregor
        const iso = this.cartesianToIsometric(bx, by);
        this.bossInstance.sprite = this.add.sprite(iso.x, iso.y, 'egregor');
        this.bossInstance.sprite.setDisplaySize(110, 150);
        this.bossInstance.sprite.setOrigin(0.5, 0.8);

        this.bossInstance.shadow = this.add.graphics();

        // Sacudida dramática de pantalla
        this.cameras.main.shake(500, 0.015);
        this.cameras.main.flash(450, 183, 9, 76);

        // Alerta de Boss neón flotante
        const alertTxt = this.add.text(640, 180, 'ALERTA: EGREGOR HA DESPERTADO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: '#ff3300',
            letterSpacing: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: alertTxt,
            scale: 1.25,
            duration: 350,
            yoyo: true,
            repeat: 3,
            onComplete: () => alertTxt.destroy()
        });

        this.bossHpContainer.setVisible(true);
        this.updateBossHpBar();
    }

    // --- GESTIÓN DE COLISIONES Y DAÑO ---
    hitObstacle(bullet, obstacle) {
        if (bullet.sprite) bullet.sprite.destroy();
        bullet.destroy();
    }

    hitEnemy(bullet, enemy) {
        if (bullet.sprite) bullet.sprite.destroy();
        bullet.destroy();

        enemy.hp -= bullet.damageValue;

        // Flash blanco en el impacto
        enemy.sprite.setTint(0xffffff);
        this.time.delayedCall(70, () => {
            if (enemy.active && enemy.sprite) {
                enemy.sprite.clearTint();
            }
        });

        this.shotParticles.setTint(this.cfg.color);
        this.shotParticles.emitParticleAt(enemy.sprite.x, enemy.sprite.y - 15, 3);

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }

        if (enemy.enemyType === 'boss') {
            this.updateBossHpBar();
        }
    }

    killEnemy(enemy) {
        // Eliminar sombra y sprite visual
        if (enemy.shadow) enemy.shadow.destroy();
        if (enemy.sprite) enemy.sprite.destroy();
        enemy.destroy();

        // Partículas de muerte neón
        this.deathParticles.setTint(enemy.enemyType === 'boss' ? 0xb7094c : this.cfg.color);
        this.deathParticles.emitParticleAt(enemy.sprite.x, enemy.sprite.y - 12, enemy.enemyType === 'boss' ? 50 : 15);

        // Instanciar Alma recolectable en el plano cartesiano
        const soul = this.physics.add.sprite(enemy.x, enemy.y, null);
        soul.setSize(20, 20);
        soul.setVisible(false);
        this.souls.add(soul);

        // Sprite visible isométrica de alma
        const iso = this.cartesianToIsometric(enemy.x, enemy.y);
        soul.sprite = this.add.image(iso.x, iso.y, 'spark');
        soul.sprite.setDisplaySize(20, 20);
        soul.sprite.setTint(enemy.enemyType === 'boss' ? 0xffd700 : this.cfg.color);

        // Flotación sutil del alma neón
        this.tweens.add({
            targets: soul.sprite,
            y: soul.sprite.y - 12,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Actualizar contador
        if (!this.cfg.hasBoss) {
            this.score++;
            this.hudScoreText.setText(`ALMAS: ${this.score}/${this.cfg.targetScore}`);
            if (this.score >= this.cfg.targetScore) {
                this.triggerVictory();
            }
        } else {
            if (enemy.enemyType === 'boss') {
                this.bossHpContainer.setVisible(false);
                this.triggerVictory();
            } else {
                this.score++;
                this.hudScoreText.setText(`ALMAS: ${this.score}/${this.cfg.targetScore}`);
            }
        }
    }

    hitPlayer(playerBody, enemy) {
        if (this.isInvulnerable) return;
        this.takeDamage(enemy.damage);
    }

    hitPlayerByBullet(playerBody, bullet) {
        if (bullet.sprite) bullet.sprite.destroy();
        bullet.destroy();
        if (this.isInvulnerable) return;
        this.takeDamage(1);
    }

    takeDamage(amount) {
        this.playerHp -= amount;
        this.updateHpDisplay();

        if (this.playerHp <= 0) {
            this.triggerGameOver();
            return;
        }

        // Cámara flash e invulnerabilidad temporal
        this.isInvulnerable = true;
        this.cameras.main.flash(150, 180, 0, 0);

        this.tweens.add({
            targets: this.player,
            alpha: 0.2,
            yoyo: true,
            duration: 100,
            repeat: 8,
            onComplete: () => {
                if (this.player) {
                    this.player.setAlpha(1);
                    this.isInvulnerable = false;
                }
            }
        });
    }

    // --- RECOGER ALMA Y CAMBIO DE ARMA ---
    absorbSoul(playerBody, soul) {
        if (soul.sprite) soul.sprite.destroy();
        soul.destroy();

        // Efectos destellos
        this.shotParticles.setTint(0xffffff);
        this.shotParticles.emitParticleAt(this.player.x, this.player.y - 12, 10);

        // Ciclar el arma activa (Upgrade de Reliquias)
        this.activeWeapon = (this.activeWeapon + 1) % 3;
        
        const weaponKeys = ['centella', 'rompehuesos', 'perforadora'];
        this.weaponSprite.setTexture(weaponKeys[this.activeWeapon]);
        this.hudWeaponIcon.setTexture(weaponKeys[this.activeWeapon]);
        this.hudWeaponText.setText(`ARMA: ${weaponKeys[this.activeWeapon].toUpperCase()}`);
        this.updateWeaponDisplayScale();

        // Mensaje emergente estilo ciber-sistema
        const labels = ['LA CENTELLA', 'LA ROMPEHUESOS', 'LA PERFORADORA'];
        const colors = ['#00f0ff', '#ff9f1c', '#b7094c'];

        const popText = this.add.text(this.player.x, this.player.y - 45, `${labels[this.activeWeapon]} ADQUIRIDA`, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: colors[this.activeWeapon],
            letterSpacing: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popText,
            y: this.player.y - 85,
            alpha: 0,
            duration: 1200,
            onComplete: () => popText.destroy()
        });
    }

    updateWeaponDisplayScale() {
        if (this.activeWeapon === 0) this.weaponSprite.setDisplaySize(48, 48); // Centella
        else if (this.activeWeapon === 1) this.weaponSprite.setDisplaySize(54, 46); // Rompehuesos
        else if (this.activeWeapon === 2) this.weaponSprite.setDisplaySize(68, 38); // Perforadora
    }

    // --- DISEÑO DE HUD Y OVERLAYS ---
    createHUD() {
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0);

        // Barra superior translúcida
        const topBar = this.add.graphics();
        topBar.fillStyle(0x0c0b11, 0.85);
        topBar.lineStyle(2, this.cfg.color, 0.4);
        topBar.fillRect(0, 0, 1280, 50);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 50, 1280, 50));
        this.hudContainer.add(topBar);

        // Nombre de Nivel
        const lvlName = this.add.text(30, 16, `${this.cfg.name.toUpperCase()} // ${this.cfg.env.toUpperCase()}`, {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '13px',
            color: '#ffffff',
            letterSpacing: 2
        });
        this.hudContainer.add(lvlName);

        // Marcador Almas
        this.hudScoreText = this.add.text(640, 16, `ALMAS ADQUIRIDAS: 0 / ${this.cfg.targetScore}`, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: '700',
            fontSize: '14px',
            color: '#9d4edd',
            letterSpacing: 2
        }).setOrigin(0.5, 0);
        this.hudContainer.add(this.hudScoreText);

        // Botón Mute interactivo
        const isMuted = window.RelicAudio ? window.RelicAudio.isMuted : false;
        const volText = isMuted ? '🔊 ACTIVAR AUDIO' : '🔇 SILENCIAR';
        const volBtn = this.add.text(1090, 18, volText, {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '600',
            fontSize: '10px',
            color: '#aaaaaa',
            letterSpacing: 2
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        this.hudContainer.add(volBtn);

        volBtn.on('pointerover', () => volBtn.setColor('#9d4edd'));
        volBtn.on('pointerout', () => volBtn.setColor('#aaaaaa'));
        volBtn.on('pointerdown', () => {
            if (window.RelicAudio) {
                const muted = window.RelicAudio.toggleMute();
                volBtn.setText(muted ? '🔊 ACTIVAR AUDIO' : '🔇 SILENCIAR');
            }
        });

        // Esc salir indicación
        const escPrompt = this.add.text(1250, 18, '[ ESC ] MENU', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '11px',
            color: '#888888',
            letterSpacing: 2
        }).setOrigin(1, 0);
        this.hudContainer.add(escPrompt);

        // Contenedor de corazones de vida (neon cyan)
        this.heartContainer = this.add.container(40, 680).setScrollFactor(0);
        this.updateHpDisplay();

        // Contenedor panel del arma activa
        this.weaponContainer = this.add.container(1240, 670).setScrollFactor(0);
        
        const wBox = this.add.graphics();
        wBox.fillStyle(0x0c0b11, 0.8);
        wBox.lineStyle(2, 0x9d4edd, 0.5);
        wBox.fillRoundedRect(-240, -50, 240, 60, 6);
        wBox.strokeRoundedRect(-240, -50, 240, 60, 6);
        this.weaponContainer.add(wBox);

        this.hudWeaponIcon = this.add.image(-200, -20, 'centella').setDisplaySize(48, 48);
        this.weaponContainer.add(this.hudWeaponIcon);

        this.hudWeaponText = this.add.text(-150, -32, 'SISTEMA DE ARMA: CENTELLA', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '10px',
            color: '#ffffff',
            letterSpacing: 1
        });
        const wControlText = this.add.text(-150, -14, 'CAMBIO CICLO POR ALMA ADQUIRIDA', {
            fontFamily: '"Inter", sans-serif',
            fontWeight: '500',
            fontSize: '9px',
            color: '#888888',
            letterSpacing: 1
        });
        this.weaponContainer.add([this.hudWeaponText, wControlText]);

        // Contenedor barra vida del Boss Egregor
        this.bossHpContainer = this.add.container(640, 90).setScrollFactor(0).setVisible(false);
        
        const bBarBg = this.add.graphics();
        bBarBg.fillStyle(0x000000, 0.8);
        bBarBg.lineStyle(2, 0xb7094c, 0.7);
        bBarBg.strokeRect(-250, -12, 500, 24);
        bBarBg.fillRect(-250, -12, 500, 24);
        this.bossHpContainer.add(bBarBg);

        this.bossHpBarGraphic = this.add.graphics();
        this.bossHpContainer.add(this.bossHpBarGraphic);

        const bossLabel = this.add.text(0, -32, 'ENTIDAD SUPREMA: EGREGOR // AMENAZA NÚCLEO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '12px',
            color: '#ff3300',
            letterSpacing: 3
        }).setOrigin(0.5);
        this.bossHpContainer.add(bossLabel);
    }

    updateHpDisplay() {
        this.heartContainer.removeAll(true);
        const barWidth = 35, barHeight = 8, spacing = 42;

        for (let i = 0; i < this.maxPlayerHp; i++) {
            const h = this.add.graphics();
            h.x = i * spacing;
            h.y = 0;
            this.heartContainer.add(h);

            if (i < this.playerHp) {
                // Brillo cian neón activo
                h.fillStyle(0x00f0ff, 0.95);
                h.lineStyle(1.5, 0xffffff, 0.9);
                h.fillStyle(0x00f0ff, 0.25);
                h.fillRoundedRect(-1, -3, barWidth + 2, barHeight + 6, 2);
                h.fillStyle(0x00f0ff, 0.95);
            } else {
                // Barra inactiva vacía
                h.fillStyle(0x22222a, 0.6);
                h.lineStyle(1, 0x44444c, 0.7);
            }
            h.fillRoundedRect(0, 0, barWidth, barHeight, 2);
            h.strokeRoundedRect(0, 0, barWidth, barHeight, 2);
        }
    }

    updateBossHpBar() {
        if (!this.bossInstance || !this.bossInstance.active) return;
        const pct = Math.max(0, this.bossInstance.hp / this.bossInstance.maxHp);
        
        this.bossHpBarGraphic.clear();
        this.bossHpBarGraphic.fillStyle(0xb7094c, 0.9);
        this.bossHpBarGraphic.fillRect(-246, -8, 492 * pct, 16);
    }

    // --- SONIDO PROCEDIMENTAL SINTETIZADO (WEB AUDIO API) ---
    playDeathSound() {
        if (window.RelicAudio && window.RelicAudio.ctx) {
            const ctx = window.RelicAudio.ctx;
            window.RelicAudio.stop(); // Parar música procedural normal

            // Sonido de fracaso dramático descendente
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, ctx.currentTime); // La2
            osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 3.0); // Caída a subbajo

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);

            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 3.0);
        }
    }

    playVictorySound() {
        if (window.RelicAudio && window.RelicAudio.ctx) {
            const ctx = window.RelicAudio.ctx;
            window.RelicAudio.stop();

            // Melodía celestial armónica ascendente en escala de La Mayor
            const notes = [220.00, 277.18, 329.63, 440.00, 554.37, 659.25, 880.00];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

                gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.15);
                gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.15 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 1.0);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + idx * 0.15);
                osc.stop(ctx.currentTime + idx * 0.15 + 1.0);
            });
        }
    }

    // --- PANTALLAS DE VICTORIA Y DERROTA ---
    triggerVictory() {
        this.isVictory = true;
        this.playerBody.setVelocity(0, 0);
        this.enemies.setVelocityX(0);
        this.enemies.setVelocityY(0);
        this.spawnTimer.destroy();

        // Reproducir sonido celestial de victoria
        this.playVictorySound();

        this.tweens.add({
            targets: this.cameras.main,
            zoom: 1.25,
            duration: 2000
        });

        const overlay = this.add.container(0, 0).setScrollFactor(0).setAlpha(0);

        const screenBg = this.add.graphics();
        screenBg.fillStyle(0x0c0b11, 0.9);
        screenBg.lineStyle(4, 0xffd700, 0.8);
        screenBg.fillRect(0, 0, 1280, 720);
        screenBg.strokeRect(30, 30, 1220, 660);
        overlay.add(screenBg);

        const title = this.add.text(640, 230, 'MISIÓN COMPLETADA', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '36px',
            color: '#9d4edd',
            letterSpacing: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        }).setOrigin(0.5);

        const details = this.add.text(640, 320, `La Grieta de Valdris ha sido sellada y la corrupción contenida con éxito.\nLas almas cosechadas descansan finalmente en paz.`, {
            fontFamily: '"Inter", sans-serif',
            fontWeight: '400',
            fontSize: '15px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8,
            letterSpacing: 1
        }).setOrigin(0.5);

        overlay.add([title, details]);

        // BOTÓN REPLAY
        const replayBtn = this.add.text(480, 480, 'REINICIAR RETO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const rBox = this.add.graphics();
        rBox.lineStyle(2, 0x9d4edd, 0.6);
        rBox.fillStyle(0x08070d, 0.96);
        rBox.fillRoundedRect(330, 450, 300, 60, 6);
        rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        overlay.add([rBox, replayBtn]);

        // BOTÓN MENU
        const menuBtn = this.add.text(800, 480, 'MENU PRINCIPAL', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const mBox = this.add.graphics();
        mBox.lineStyle(2, 0x9d4edd, 0.6);
        mBox.fillStyle(0x08070d, 0.96);
        mBox.fillRoundedRect(650, 450, 300, 60, 6);
        mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        overlay.add([mBox, menuBtn]);

        // Interacciones Botones
        replayBtn.on('pointerover', () => {
            replayBtn.setStyle({ fill: '#9d4edd' });
            rBox.fillStyle(0x9d4edd, 0.15);
            rBox.fillRoundedRect(330, 450, 300, 60, 6);
            rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        });
        replayBtn.on('pointerout', () => {
            replayBtn.setStyle({ fill: '#ffffff' });
            rBox.fillStyle(0x08070d, 0.96);
            rBox.fillRoundedRect(330, 450, 300, 60, 6);
            rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        });
        replayBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 16, 14, 23);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.restart();
            });
        });

        menuBtn.on('pointerover', () => {
            menuBtn.setStyle({ fill: '#9d4edd' });
            mBox.fillStyle(0x9d4edd, 0.15);
            mBox.fillRoundedRect(650, 450, 300, 60, 6);
            mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        });
        menuBtn.on('pointerout', () => {
            menuBtn.setStyle({ fill: '#ffffff' });
            mBox.fillStyle(0x08070d, 0.96);
            mBox.fillRoundedRect(650, 450, 300, 60, 6);
            mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        });
        menuBtn.on('pointerdown', () => this.quitToMenu());

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 800,
            delay: 1000
        });
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.playerBody.setVelocity(0, 0);
        this.enemies.setVelocityX(0);
        this.enemies.setVelocityY(0);
        this.spawnTimer.destroy();

        // Detener controles y reproducir animación de muerte
        this.player.play('eamon_die', true);
        this.player.setAlpha(0.65);
        this.weaponSprite.setVisible(false);

        // Sonido procedural de terror de muerte
        this.playDeathSound();

        this.tweens.add({
            targets: this.cameras.main,
            zoom: 0.9,
            duration: 2000
        });

        const overlay = this.add.container(0, 0).setScrollFactor(0).setAlpha(0);

        const screenBg = this.add.graphics();
        screenBg.fillStyle(0x130a0d, 0.9);
        screenBg.lineStyle(4, 0xb7094c, 0.8);
        screenBg.fillRect(0, 0, 1280, 720);
        screenBg.strokeRect(30, 30, 1220, 660);
        overlay.add(screenBg);

        const title = this.add.text(640, 230, 'CONEXIÓN PERDIDA // FALLO DE MISIÓN', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '32px',
            color: '#ff3300',
            letterSpacing: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        }).setOrigin(0.5);

        const details = this.add.text(640, 320, `El cazador Eamon ha caído en combate. La Grieta vuelve a abrirse...\nValdris ha sido devorado por la influencia destructora de Egregor.`, {
            fontFamily: '"Inter", sans-serif',
            fontWeight: '400',
            fontSize: '15px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8,
            letterSpacing: 1
        }).setOrigin(0.5);

        overlay.add([title, details]);

        // BOTÓN REPLAY
        const replayBtn = this.add.text(480, 480, 'REINICIAR RETO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const rBox = this.add.graphics();
        rBox.lineStyle(2, 0xff3300, 0.6);
        rBox.fillStyle(0x08070d, 0.96);
        rBox.fillRoundedRect(330, 450, 300, 60, 6);
        rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        overlay.add([rBox, replayBtn]);

        // BOTÓN MENU
        const menuBtn = this.add.text(800, 480, 'MENU PRINCIPAL', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const mBox = this.add.graphics();
        mBox.lineStyle(2, 0xff3300, 0.6);
        mBox.fillStyle(0x08070d, 0.96);
        mBox.fillRoundedRect(650, 450, 300, 60, 6);
        mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        overlay.add([mBox, menuBtn]);

        // Interacciones Botones
        replayBtn.on('pointerover', () => {
            replayBtn.setStyle({ fill: '#b7094c' });
            rBox.fillStyle(0xb7094c, 0.15);
            rBox.fillRoundedRect(330, 450, 300, 60, 6);
            rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        });
        replayBtn.on('pointerout', () => {
            replayBtn.setStyle({ fill: '#ffffff' });
            rBox.fillStyle(0x100e17, 0.9);
            rBox.fillRoundedRect(330, 450, 300, 60, 6);
            rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        });
        replayBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 16, 14, 23);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.restart();
            });
        });

        menuBtn.on('pointerover', () => {
            menuBtn.setStyle({ fill: '#b7094c' });
            mBox.fillStyle(0xb7094c, 0.15);
            mBox.fillRoundedRect(650, 450, 300, 60, 6);
            mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        });
        menuBtn.on('pointerout', () => {
            menuBtn.setStyle({ fill: '#ffffff' });
            mBox.fillStyle(0x100e17, 0.9);
            mBox.fillRoundedRect(650, 450, 300, 60, 6);
            mBox.strokeRoundedRect(650, 450, 300, 60, 6);
        });
        menuBtn.on('pointerdown', () => this.quitToMenu());

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 800,
            delay: 1000
        });
    }

    quitToMenu() {
        this.cameras.main.fadeOut(500, 16, 14, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Menu');
        });
    }
}
