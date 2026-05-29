class Gameplay extends Phaser.Scene {
    constructor() {
        super({ key: 'Gameplay' });
    }

    init(data) {
        // Level index: 0 = Cripta, 1 = Forja, 2 = Templo
        this.levelIndex = data.levelIndex !== undefined ? data.levelIndex : 0;
        
        // Game States
        this.score = 0;
        this.playerHp = 5;
        this.maxPlayerHp = 5;
        this.isGameOver = false;
        this.isVictory = false;
        this.isInvulnerable = false;
        
        // Active weapon (0 = Centella, 1 = Rompehuesos, 2 = Perforadora)
        this.activeWeapon = 0;
        this.lastFired = 0;
        
        // Level Configurations
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
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Set Map Size
        this.mapWidth = 2000;
        this.mapHeight = 2000;
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // 1. Draw tiled background arena
        this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, this.cfg.bgTile).setOrigin(0);
        this.add.grid(this.mapWidth/2, this.mapHeight/2, this.mapWidth, this.mapHeight, 64, 64, 0x000000, 0, this.cfg.gridColor, 0.4);

        // Draw boundaries (ancient walls outline)
        const walls = this.add.graphics();
        walls.lineStyle(8, this.cfg.color, 0.8);
        walls.strokeRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Draw secondary ruins details
        walls.fillStyle(0x000000, 0.2);
        for(let i=0; i<8; i++){
            // Add some random pillar block visuals in the arena
            let px = 200 + (i * 220) % (this.mapWidth - 400);
            let py = 200 + (i * 240) % (this.mapHeight - 400);
            walls.fillRect(px, py, 80, 80);
            walls.strokeRect(px, py, 80, 80);
        }

        // 2. Physics Groups
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.souls = this.physics.add.group();

        // 3. Player (Eamon) Setup
        this.player = this.physics.add.sprite(this.mapWidth / 2, this.mapHeight / 2, 'eamon-portrait');
        this.player.setDisplaySize(55, 62);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);

        // Weapon sprite attached to player
        this.weaponSprite = this.add.image(this.player.x, this.player.y, 'centella');
        this.weaponSprite.setDisplaySize(48, 48);
        this.weaponSprite.setOrigin(0.15, 0.5);

        // 4. Camera Settings
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 5. Collisions & Overlaps
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.enemies, this.player, this.hitPlayer, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayerByBullet, null, this);
        this.physics.add.overlap(this.souls, this.player, this.absorbSoul, null, this);

        // 6. Keyboard inputs
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
            downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
            leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
            rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        // 7. Enemy Spawning Loop
        this.spawnTimer = this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // 8. Custom particles system for shots and deaths
        this.deathParticles = this.add.particles(0, 0, 'spark', {
            lifespan: 800,
            speed: { min: 50, max: 150 },
            scale: { start: 1.5, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        this.shotParticles = this.add.particles(0, 0, 'spark', {
            lifespan: 300,
            speed: { min: 100, max: 200 },
            scale: { start: 1.2, end: 0.2 },
            alpha: { start: 0.7, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        // 9. Boss spawns state tracker
        this.bossSpawned = false;
        this.bossInstance = null;

        // 10. HUD Overlay
        this.createHUD();

        // Screen Fade In
        this.cameras.main.fadeIn(500, 16, 14, 23);
    }

    update(time) {
        if (this.isGameOver || this.isVictory) return;

        // Exit gameplay via Esc
        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this.quitToMenu();
            return;
        }

        // --- Player Movement ---
        let vx = 0;
        let vy = 0;
        const speed = 250;

        if (this.keys.left.isDown || this.keys.leftArrow.isDown) vx = -speed;
        if (this.keys.right.isDown || this.keys.rightArrow.isDown) vx = speed;
        if (this.keys.up.isDown || this.keys.upArrow.isDown) vy = -speed;
        if (this.keys.down.isDown || this.keys.downArrow.isDown) vy = speed;

        // Normalize speed diagonally
        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }

        this.player.setVelocity(vx, vy);

        // --- Rotate Weapon & Flip Player towards Cursor ---
        const worldPointerX = this.input.activePointer.x + this.cameras.main.scrollX;
        const worldPointerY = this.input.activePointer.y + this.cameras.main.scrollY;
        
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPointerX, worldPointerY);
        
        this.player.setFlipX(worldPointerX < this.player.x);

        // Position weapon on player and rotate it
        this.weaponSprite.x = this.player.x;
        this.weaponSprite.y = this.player.y + 12;
        this.weaponSprite.rotation = angle;
        
        // Flip weapon vertically if pointing to the left
        this.weaponSprite.setFlipY(worldPointerX < this.player.x);

        // --- Handle Shooting ---
        if (this.input.activePointer.isDown) {
            this.shootWeapon(time, angle);
        }

        // --- Enemy AI Tracking ---
        this.enemies.getChildren().forEach((enemy) => {
            if (!enemy.active) return;
            
            // Basic tracking AI
            const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            
            if (enemy.enemyType === 'zombie') {
                // Zombies walk towards player
                this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);
                enemy.setFlipX(this.player.x < enemy.x);
            } 
            else if (enemy.enemyType === 'sentinel') {
                // Sentinels follow player, but stop and shoot every few seconds
                if (!enemy.isCasting) {
                    this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);
                    enemy.setFlipX(this.player.x < enemy.x);
                    
                    // Random shooting trigger
                    if (time > enemy.nextShootTime) {
                        enemy.isCasting = true;
                        enemy.setVelocity(0, 0);
                        enemy.setTint(0xff5522); // Turn hot orange when shooting
                        
                        this.time.delayedCall(400, () => {
                            if (enemy.active) {
                                this.fireEnemyBullet(enemy, angleToPlayer);
                                enemy.clearTint();
                                enemy.isCasting = false;
                                enemy.nextShootTime = time + Phaser.Math.Between(2500, 4500);
                            }
                        });
                    }
                }
            } 
            else if (enemy.enemyType === 'boss') {
                // Egregor movement
                this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), enemy.baseSpeed, enemy.body.velocity);
                enemy.setFlipX(this.player.x < enemy.x);

                // Boss attack routines
                if (time > enemy.nextAttackTime) {
                    enemy.nextAttackTime = time + 4000;
                    this.triggerBossAttack(enemy);
                }
            }
        });

        // --- Clean up bullets out of bounds ---
        this.bullets.getChildren().forEach((b) => {
            if (b.x < 0 || b.x > this.mapWidth || b.y < 0 || b.y > this.mapHeight) {
                b.destroy();
            }
        });
        this.enemyBullets.getChildren().forEach((b) => {
            if (b.x < 0 || b.x > this.mapWidth || b.y < 0 || b.y > this.mapHeight) {
                b.destroy();
            }
        });
    }

    // --- SHOOT SYSTEM ---
    shootWeapon(time, angle) {
        // Weapon attributes
        const weapons = [
            { key: 'centella', delay: 200, speed: 600, spread: 0, count: 1, damage: 1, color: 0x00f0ff, size: 7 },     // Centella
            { key: 'rompehuesos', delay: 800, speed: 450, spread: 0.28, count: 5, damage: 1.5, color: 0xff9f1c, size: 6 }, // Rompehuesos
            { key: 'perforadora', delay: 1100, speed: 1100, spread: 0, count: 1, damage: 5, color: 0xb7094c, size: 10 } // Perforadora
        ];

        const w = weapons[this.activeWeapon];

        if (time < this.lastFired + w.delay) return;
        this.lastFired = time;

        // Weapon muzzle position (approx)
        const muzzleX = this.player.x + Math.cos(angle) * 35;
        const muzzleY = this.player.y + 12 + Math.sin(angle) * 35;

        // Shot particles tint
        this.shotParticles.setTint(w.color);
        this.shotParticles.emitParticleAt(muzzleX, muzzleY, 4);

        // Flash muzzle visual effect
        const flash = this.add.graphics();
        flash.fillStyle(w.color, 0.8);
        flash.fillCircle(muzzleX, muzzleY, 14);
        this.time.delayedCall(40, () => flash.destroy());

        // Spawn bullet(s)
        if (w.key === 'rompehuesos') {
            // Shotgun Spread Cone
            for (let i = 0; i < w.count; i++) {
                // Spread offsets from center angle
                const spreadAngle = angle + (i - (w.count - 1) / 2) * (w.spread / (w.count - 1));
                this.createBullet(muzzleX, muzzleY, spreadAngle, w);
            }
        } else {
            // Standard Single Shots (Centella, Perforadora)
            this.createBullet(muzzleX, muzzleY, angle, w);
        }

        // Mini recoil on camera
        this.cameras.main.shake(100, 0.003 * (this.activeWeapon + 1));
    }

    createBullet(x, y, angle, config) {
        // Draw simple bullet texture dynamically
        const bGraphics = this.add.graphics();
        bGraphics.fillStyle(config.color, 1);
        bGraphics.lineStyle(1, 0xffffff, 0.7);
        if (config.key === 'perforadora') {
            bGraphics.fillRect(-15, -4, 30, 8);
            bGraphics.strokeRect(-15, -4, 30, 8);
        } else {
            bGraphics.fillCircle(0, 0, config.size);
            bGraphics.strokeCircle(0, 0, config.size);
        }

        const bTextureKey = `bullet_${config.key}_${Phaser.Math.Between(0, 100000)}`;
        this.textures.addCanvas(bTextureKey, bGraphics.canvas);
        bGraphics.destroy();

        const bullet = this.physics.add.sprite(x, y, bTextureKey);
        this.bullets.add(bullet);

        bullet.damageValue = config.damage;
        bullet.weaponIndex = this.activeWeapon;
        bullet.rotation = angle;

        this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), config.speed, bullet.body.velocity);
    }

    // --- ENEMY AI COMBAT ACTIONS ---
    fireEnemyBullet(enemy, angle) {
        const bullet = this.physics.add.sprite(enemy.x, enemy.y, 'spark');
        bullet.setDisplaySize(14, 14);
        bullet.setTint(0xff5522);
        this.enemyBullets.add(bullet);

        this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), 300, bullet.body.velocity);
    }

    triggerBossAttack(boss) {
        const attackType = Phaser.Math.Between(0, 2);

        // Boss animation tint
        this.tweens.add({
            targets: boss,
            tint: 0xb7094c,
            yoyo: true,
            duration: 200,
            repeat: 3
        });

        // Attack 1: Spiral Rings
        if (attackType === 0) {
            for (let angleDeg = 0; angleDeg < 360; angleDeg += 30) {
                const angleRad = Phaser.Math.DegToRad(angleDeg);
                const b = this.physics.add.sprite(boss.x, boss.y, 'spark');
                b.setDisplaySize(16, 16);
                b.setTint(0xb7094c);
                this.enemyBullets.add(b);
                this.physics.velocityFromAngle(angleDeg, 200, b.body.velocity);
            }
        } 
        // Attack 2: Target Shotgun Burst
        else if (attackType === 1) {
            const angleToPlayer = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
            for (let i = -2; i <= 2; i++) {
                const spread = angleToPlayer + i * 0.15;
                const b = this.physics.add.sprite(boss.x, boss.y, 'spark');
                b.setDisplaySize(16, 16);
                b.setTint(0xda00ff);
                this.enemyBullets.add(b);
                this.physics.velocityFromAngle(Phaser.Math.RadToDeg(spread), 350, b.body.velocity);
            }
        }
        // Attack 3: Summon Minions
        else {
            for (let i = 0; i < 2; i++) {
                const spawnX = boss.x + Phaser.Math.Between(-150, 150);
                const spawnY = boss.y + Phaser.Math.Between(-150, 150);
                this.spawnEnemyAt(spawnX, spawnY, 'zombie');
            }
        }
    }

    // --- ENEMY SPAWNING ---
    spawnEnemy() {
        if (this.isGameOver || this.isVictory) return;
        
        // Count active enemies
        if (this.enemies.countActive(true) >= 18) return;

        // If level 3 and score threshold reached, spawn Egregor
        if (this.cfg.hasBoss && this.score >= 10 && !this.bossSpawned) {
            this.spawnBoss();
            return;
        }

        // Select random spawn location around player but off-screen
        const distance = 500;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const spawnX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 100, this.mapWidth - 100);
        const spawnY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 100, this.mapHeight - 100);

        // Select enemy type
        const typeIndex = Phaser.Math.Between(0, this.cfg.enemyTypes.length - 1);
        const type = this.cfg.enemyTypes[typeIndex];

        this.spawnEnemyAt(spawnX, spawnY, type);
    }

    spawnEnemyAt(x, y, type) {
        let enemy;
        if (type === 'zombie') {
            enemy = this.physics.add.sprite(x, y, 'zombie');
            enemy.setDisplaySize(50, 56);
            enemy.enemyType = 'zombie';
            enemy.maxHp = 2;
            enemy.hp = 2;
            enemy.baseSpeed = 90 + Phaser.Math.Between(0, 30);
            enemy.damage = 1;
        } else if (type === 'sentinel') {
            enemy = this.physics.add.sprite(x, y, 'iron-sentinel');
            enemy.setDisplaySize(60, 68);
            enemy.enemyType = 'sentinel';
            enemy.maxHp = 5;
            enemy.hp = 5;
            enemy.baseSpeed = 140;
            enemy.damage = 1;
            enemy.isCasting = false;
            enemy.nextShootTime = this.time.now + Phaser.Math.Between(1500, 3500);
        }

        this.enemies.add(enemy);
        enemy.setCollideWorldBounds(true);
        enemy.body.setSize(enemy.width * 0.7, enemy.height * 0.7);

        // Spawn effect (smoke/glow)
        const spawnGlow = this.add.graphics();
        spawnGlow.fillStyle(this.cfg.color, 0.4);
        spawnGlow.fillCircle(x, y, 35);
        this.tweens.add({
            targets: spawnGlow,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            onComplete: () => spawnGlow.destroy()
        });
    }

    spawnBoss() {
        this.bossSpawned = true;
        
        // Spawn boss Egregor in center or near player
        const spawnX = this.player.x + (Phaser.Math.Between(0, 1) === 0 ? -300 : 300);
        const spawnY = this.player.y + (Phaser.Math.Between(0, 1) === 0 ? -300 : 300);

        this.bossInstance = this.physics.add.sprite(spawnX, spawnY, 'egregor');
        this.bossInstance.setDisplaySize(110, 150);
        this.bossInstance.enemyType = 'boss';
        this.bossInstance.maxHp = 60;
        this.bossInstance.hp = 60;
        this.bossInstance.baseSpeed = 60;
        this.bossInstance.damage = 2;
        this.bossInstance.nextAttackTime = this.time.now + 2000;

        this.enemies.add(this.bossInstance);
        this.bossInstance.setCollideWorldBounds(true);
        this.bossInstance.body.setSize(this.bossInstance.width * 0.8, this.bossInstance.height * 0.8);

        // Camera dramatic shake
        this.cameras.main.shake(500, 0.015);
        this.cameras.main.flash(400, 183, 9, 76);

        // Flash message (Modern high-tech emergency alert)
        const bossText = this.add.text(640, 180, 'ALERTA: EGREGOR HA DESPERTADO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: '#ff3300',
            letterSpacing: 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6 }
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: bossText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 3,
            onComplete: () => bossText.destroy()
        });

        // Initialize boss HP bar
        this.bossHpContainer.setVisible(true);
        this.updateBossHpBar();
    }

    // --- DAMAGE / HIT COLLISIONS ---
    hitEnemy(bullet, enemy) {
        bullet.destroy();

        enemy.hp -= bullet.damageValue;
        
        // Flash enemy white on hit
        enemy.setTint(0xffffff);
        this.time.delayedCall(80, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });

        // Spawn hit blood/sparks particles
        this.shotParticles.setTint(this.cfg.color);
        this.shotParticles.emitParticleAt(bullet.x, bullet.y, 3);

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }

        if (enemy.enemyType === 'boss') {
            this.updateBossHpBar();
        }
    }

    killEnemy(enemy) {
        enemy.destroy();

        // Death explosion particles
        this.deathParticles.setTint(enemy.enemyType === 'boss' ? 0xb7094c : this.cfg.color);
        this.deathParticles.emitParticleAt(enemy.x, enemy.y, enemy.enemyType === 'boss' ? 50 : 15);

        // Spawn Soul Object
        const soul = this.physics.add.sprite(enemy.x, enemy.y, 'spark');
        soul.setDisplaySize(20, 20);
        soul.setTint(enemy.enemyType === 'boss' ? 0xffd700 : this.cfg.color);
        this.souls.add(soul);

        // Float up and down animation on soul
        this.tweens.add({
            targets: soul,
            y: soul.y - 12,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Check level victory thresholds for normal levels
        if (!this.cfg.hasBoss) {
            this.score++;
            this.hudScoreText.setText(`ALMAS: ${this.score}/${this.cfg.targetScore}`);
            
            if (this.score >= this.cfg.targetScore) {
                this.triggerVictory();
            }
        } else {
            // Boss level victory triggers on boss death
            if (enemy.enemyType === 'boss') {
                this.bossHpContainer.setVisible(false);
                this.triggerVictory();
            } else {
                this.score++;
                this.hudScoreText.setText(`ALMAS: ${this.score}/${this.cfg.targetScore}`);
            }
        }
    }

    hitPlayer(player, enemy) {
        if (this.isInvulnerable) return;
        this.takeDamage(enemy.damage);
    }

    hitPlayerByBullet(player, bullet) {
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

        // Trigger Invulnerability & Flashing
        this.isInvulnerable = true;
        this.cameras.main.flash(150, 180, 0, 0);

        this.tweens.add({
            targets: this.player,
            alpha: 0.2,
            yoyo: true,
            duration: 100,
            repeat: 8,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvulnerable = false;
            }
        });
    }

    // --- SOUL INTERACT / WEAPON SWITCH ---
    absorbSoul(player, soul) {
        soul.destroy();

        // Play particle attraction effect
        this.shotParticles.setTint(0xffffff);
        this.shotParticles.emitParticleAt(player.x, player.y, 8);

        // Flash player bracelet
        const flash = this.add.graphics();
        flash.fillStyle(0x00f0ff, 0.4);
        flash.fillCircle(player.x, player.y, 45);
        this.tweens.add({
            targets: flash,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 250,
            onComplete: () => flash.destroy()
        });

        // Upgrade/Switch Weapon cyclically
        // Cycle active weapon
        const oldWeapon = this.activeWeapon;
        this.activeWeapon = (this.activeWeapon + 1) % 3;
        
        // Update weapon texture
        const weaponKeys = ['centella', 'rompehuesos', 'perforadora'];
        this.weaponSprite.setTexture(weaponKeys[this.activeWeapon]);
        this.hudWeaponIcon.setTexture(weaponKeys[this.activeWeapon]);
        this.hudWeaponText.setText(`ARMA: ${weaponKeys[this.activeWeapon].toUpperCase()}`);

        // Set visual scales for weapon sprites in hands
        if (this.activeWeapon === 0) this.weaponSprite.setDisplaySize(48, 48); // Centella
        else if (this.activeWeapon === 1) this.weaponSprite.setDisplaySize(54, 46); // Rompehuesos
        else if (this.activeWeapon === 2) this.weaponSprite.setDisplaySize(68, 38); // Perforadora

        // Display Floating Text Message
        const weaponsLabels = ['LA CENTELLA', 'LA ROMPEHUESOS', 'LA PERFORADORA'];
        const weaponColors = ['#00f0ff', '#ff9f1c', '#b7094c'];

        const popupText = this.add.text(player.x, player.y - 40, `${weaponsLabels[this.activeWeapon]} ADQUIRIDA`, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: weaponColors[this.activeWeapon],
            letterSpacing: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popupText,
            y: player.y - 90,
            alpha: 0,
            duration: 1200,
            onComplete: () => popupText.destroy()
        });
    }

    // --- HUD AND OVERLAYS ---
    createHUD() {
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0);

        // Dark HUD top bar
        const topBar = this.add.graphics();
        topBar.fillStyle(0x0c0b11, 0.85);
        topBar.lineStyle(2, this.cfg.color, 0.4);
        topBar.fillRect(0, 0, 1280, 50);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 50, 1280, 50));
        this.hudContainer.add(topBar);

        // Level name
        // Level name (Futuristic system style)
        const lvlName = this.add.text(30, 16, `${this.cfg.name.toUpperCase()} // ${this.cfg.env.toUpperCase()}`, {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '13px',
            color: '#ffffff',
            letterSpacing: 2
        });
        this.hudContainer.add(lvlName);

        // Score tracker (Glowing cyber-counter)
        this.hudScoreText = this.add.text(640, 16, `ALMAS ADQUIRIDAS: 0 / ${this.cfg.targetScore}`, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: '700',
            fontSize: '14px',
            color: '#9d4edd',
            letterSpacing: 2
        }).setOrigin(0.5, 0);
        this.hudContainer.add(this.hudScoreText);

        // Interactive volume mute button next to ESC
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

        // Esc menu prompt (Futuristic modern label)
        const escPrompt = this.add.text(1250, 18, '[ ESC ] ABANDONAR', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '500',
            fontSize: '11px',
            color: '#888888',
            letterSpacing: 2
        }).setOrigin(1, 0);
        this.hudContainer.add(escPrompt);

        // Health Hearts in bottom left
        this.heartContainer = this.add.container(40, 680).setScrollFactor(0);
        this.updateHpDisplay();

        // Weapon Display bottom right
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

        // Boss Health Bar (Hidden initially)
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

        const barWidth = 35;
        const barHeight = 8;
        const spacing = 42;

        for (let i = 0; i < this.maxPlayerHp; i++) {
            const h = this.add.graphics();
            h.x = i * spacing;
            h.y = 0;
            this.heartContainer.add(h);

            if (i < this.playerHp) {
                // High-tech glowing cyan/neon energy tick
                h.fillStyle(0x00f0ff, 0.95);
                h.lineStyle(1.5, 0xffffff, 0.9);
                // Outer glow
                h.fillStyle(0x00f0ff, 0.25);
                h.fillRoundedRect(-1, -3, barWidth + 2, barHeight + 6, 2);
                h.fillStyle(0x00f0ff, 0.95);
            } else {
                // De-energized empty energy slot
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

    // --- GAME END SCREENS ---
    triggerVictory() {
        this.isVictory = true;
        this.player.setVelocity(0,0);
        this.enemies.setVelocityX(0);
        this.enemies.setVelocityY(0);
        this.spawnTimer.destroy();

        // Slow motion camera zoom
        this.tweens.add({
            targets: this.cameras.main,
            zoom: 1.25,
            duration: 2000
        });

        // Overlay Screen container
        const overlay = this.add.container(0, 0).setScrollFactor(0);
        overlay.setAlpha(0);

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

        // REPLAY BUTTON
        const replayBtn = this.add.text(480, 480, 'REINICIAR RETO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const rBox = this.add.graphics();
        rBox.lineStyle(2, 0x9d4edd, 0.6); // Violet border
        rBox.fillStyle(0x08070d, 0.96);
        rBox.fillRoundedRect(330, 450, 300, 60, 6);
        rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        overlay.add([rBox, replayBtn]);

        // MENU BUTTON
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

        // Buttons interaction
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

        // Fade in victory screen
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 800,
            delay: 1000
        });
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.player.setVelocity(0,0);
        this.player.setAlpha(0.5);
        this.enemies.setVelocityX(0);
        this.enemies.setVelocityY(0);
        this.spawnTimer.destroy();

        // Slow motion camera zoom
        this.tweens.add({
            targets: this.cameras.main,
            zoom: 0.9,
            duration: 2000
        });

        // Overlay Screen container
        const overlay = this.add.container(0, 0).setScrollFactor(0);
        overlay.setAlpha(0);

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

        // REPLAY BUTTON
        const replayBtn = this.add.text(480, 480, 'REINICIAR RETO', {
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const rBox = this.add.graphics();
        rBox.lineStyle(2, 0xff3300, 0.6); // Red emergency border
        rBox.fillStyle(0x08070d, 0.96);
        rBox.fillRoundedRect(330, 450, 300, 60, 6);
        rBox.strokeRoundedRect(330, 450, 300, 60, 6);
        overlay.add([rBox, replayBtn]);

        // MENU BUTTON
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

        // Buttons interaction
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

        // Fade in game over screen
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
