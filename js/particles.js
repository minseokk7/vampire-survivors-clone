class Particle {
    constructor(x, y, color, size, speedX, speedY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = life;
        this.maxLife = life;
        this.alpha = 1;
    }

    update(dt) {
        this.x += this.speedX * dt * 60;
        this.y += this.speedY * dt * 60;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
        this.size *= 0.95; // Shrink over time
    }

    draw(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - cameraX, this.y - cameraY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 2 + 1) * (options.speedMult || 1);
            const size = Math.random() * 3 + 2;
            const life = Math.random() * 0.5 + 0.2;
            
            this.particles.push(new Particle(
                x, y,
                color,
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                life
            ));
        }
    }
    
    emitDamageText(x, y, damage) {
        // We can treat floating text as a special particle, 
        // but for simplicity, we'll implement it directly or just rely on hit sparks.
        // Let's create a specialized text particle.
        this.particles.push(new TextParticle(x, y, damage.toString(), "#fff", 0.5));
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0 || this.particles[i].size < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        this.particles.forEach(p => p.draw(ctx, cameraX, cameraY));
    }
}

class TextParticle {
    constructor(x, y, text, color, life) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.speedY = -50; // pixels per second upwards
        this.alpha = 1;
    }

    update(dt) {
        this.y += this.speedY * dt;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    draw(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        // Dark outline for visibility
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x - cameraX, this.y - cameraY);
        ctx.fillText(this.text, this.x - cameraX, this.y - cameraY);
        ctx.restore();
    }
}
