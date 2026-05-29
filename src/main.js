window.onload = function () {
    // Wait for Google Fonts to be ready before initializing the Phaser Game
    document.fonts.ready.then(() => {
        const config = {
            type: Phaser.AUTO,

            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 1280,
                height: 720
            },

            backgroundColor: '#100e17',

            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: [ Menu, Presentation, Gameplay ],
            pixelArt: true
        };

        new Phaser.Game(config);
    });
};