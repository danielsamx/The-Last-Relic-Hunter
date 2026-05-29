window.onload = function () {
    // Wait for Google Fonts to be ready before initializing the Phaser Game
    document.fonts.ready.then(() => {
        const config = {
            type: Phaser.AUTO,

            scale: {
                mode: Phaser.Scale.STRETCH,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 1280,
                height: 720,
                parent: 'game-container',
                expandParent: true,
                fullscreenTarget: 'game-container'
            },

            backgroundColor: '#08070d',

            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            
            // Modern, realistic anti-aliased rendering (no retro pixel art filtering)
            pixelArt: false,
            antialias: true,
            roundPixels: false,

            scene: [ Menu, Presentation, Gameplay ]
        };

        new Phaser.Game(config);
    });
};