// ============================================================
//  audio.js — Motor de Audio Procedimental / Sintetizador de Ciencia Ficción
//  Genera música atmosférica inmersiva en tiempo real usando Web Audio API.
//  Completamente libre de problemas de carga de archivos (CORS) y latencia.
// ============================================================

class RelicAudioEngine {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.oscillators = [];
        this.gainNodes = [];
        this.masterGain = null;
        this.melodyInterval = null;
        
        // Volumen inicial de la música
        this.targetMusicVolume = 0.25; 
        
        // Auto-activación con el primer clic del usuario (requerido por políticas del navegador)
        this.unlockAudio();
    }

    unlockAudio() {
        const unlock = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            } else if (!this.ctx && this.isPlaying) {
                this.initContext();
            }
            // Remover listeners una vez activado
            window.removeEventListener('click', unlock);
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    initContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            
            this.ctx = new AudioContext();
            
            // Nodo de ganancia master para control global (incluye silenciado)
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.targetMusicVolume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            
            return true;
        } catch (e) {
            console.error("No se pudo inicializar Web Audio API:", e);
            return false;
        }
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        if (!this.ctx) {
            const success = this.initContext();
            if (!success) return;
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // 1. Iniciar Drones de fondo (Graves, estables, espaciales)
        this.playDrone(55, 0.22, 'sawtooth', 120);   // A1 (Sub-bajo profundo)
        this.playDrone(110, 0.18, 'triangle', 250);  // A2 (Cuerpo armónico)
        this.playDrone(165, 0.08, 'sine', 380);      // E3 (Quinta justa brillante)
        
        // 2. Iniciar Secuenciador de melodías procedimentales suaves (Sensación cósmica)
        this.scheduleNextMelody();
    }

    playDrone(freq, baseVol, type = 'sine', cutoff = 300) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Filtro de paso bajo para suavizar los armónicos y dar sensación de misterio
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
        filter.Q.setValueAtTime(1, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        // Fade in suave para el drone
        gainNode.gain.linearRampToValueAtTime(baseVol, this.ctx.currentTime + 3.0);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start();

        // Modulación lenta de volumen (simula viento cósmico / respiración del universo)
        const modulate = () => {
            if (!this.isPlaying || !this.ctx) return;
            const nextVol = baseVol * (0.65 + Math.random() * 0.5);
            const duration = 5 + Math.random() * 6;
            gainNode.gain.linearRampToValueAtTime(nextVol, this.ctx.currentTime + duration);
            
            this.modTimeout = setTimeout(modulate, duration * 1000);
        };
        setTimeout(modulate, 2000);

        this.oscillators.push(osc);
        this.gainNodes.push(gainNode);
    }

    scheduleNextMelody() {
        if (this.melodyInterval) clearInterval(this.melodyInterval);
        
        // Cada 4 a 7 segundos reproduce un pulso de melodía atmosférica
        this.melodyInterval = setInterval(() => {
            if (this.isPlaying && !this.isMuted) {
                this.playMelodyNote();
            }
        }, 5000 + Math.random() * 3000);
    }

    playMelodyNote() {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        // Escala menor pentatónica de La (A, C, D, E, G) — Siempre suena armónico y místico
        const notes = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const osc = this.ctx.createOscillator();
        const oscGlow = this.ctx.createOscillator(); // Armónico de refuerzo
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();
        
        // Módulo de Eco (Delay)
        const delayNode = this.ctx.createDelay();
        const feedbackNode = this.ctx.createGain();
        const delayFilter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        oscGlow.type = 'sine';
        oscGlow.frequency.setValueAtTime(freq * 1.5, this.ctx.currentTime); // Quinta justa aguda para brillo celestial

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.Q.setValueAtTime(2, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.09, this.ctx.currentTime + 0.15); // Ataque suave
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.5); // Caída prolongada

        // Configuración de Eco tridimensional
        delayNode.delayTime.setValueAtTime(0.45, this.ctx.currentTime); // Retardo medio
        feedbackNode.gain.setValueAtTime(0.4, this.ctx.currentTime);   // Nivel de repetición
        
        delayFilter.type = 'lowpass';
        delayFilter.frequency.setValueAtTime(600, this.ctx.currentTime); // Ecos más oscuros y lejanos

        // Conectar osciladores
        osc.connect(filter);
        oscGlow.connect(filter);
        filter.connect(gainNode);
        
        // Conectar a salida principal
        gainNode.connect(this.masterGain);
        
        // Conectar bucle de Eco
        gainNode.connect(delayNode);
        delayNode.connect(delayFilter);
        delayFilter.connect(feedbackNode);
        feedbackNode.connect(this.masterGain); // Salida del eco
        feedbackNode.connect(delayNode);       // Bucle de realimentación

        // Encendido y apagado
        osc.start();
        oscGlow.start();
        
        osc.stop(this.ctx.currentTime + 4.0);
        oscGlow.stop(this.ctx.currentTime + 4.0);
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (!this.masterGain || !this.ctx) return;
        
        const targetVal = muted ? 0 : this.targetMusicVolume;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        // Transición de volumen ultra fluida al silenciar/activar
        this.masterGain.gain.linearRampToValueAtTime(targetVal, this.ctx.currentTime + 0.5);
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    stop() {
        this.isPlaying = false;
        if (this.melodyInterval) {
            clearInterval(this.melodyInterval);
            this.melodyInterval = null;
        }
        if (this.modTimeout) {
            clearTimeout(this.modTimeout);
        }

        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        
        this.oscillators = [];
        this.gainNodes = [];
        
        if (this.ctx) {
            this.ctx.close().then(() => {
                this.ctx = null;
                this.masterGain = null;
            });
        }
    }
}

// Registrar el motor en el ámbito global para acceso unificado
window.RelicAudio = new RelicAudioEngine();
