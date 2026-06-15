class Weapon {
    constructor(player, name, level = 1) {
        this.player = player;
        this.name = name;
        this.level = level;
        this.cooldownTimer = 0;
    }

    update(dt, enemies) {}
    draw(ctx, cameraX, cameraY) {}
    
    upgrade() {
        if (this.level < 5) {
            this.level++;
            this.applyStats();
        }
    }
    
    applyStats() {}
    
    getClosestEnemies(enemies, count = 1, maxDist = Infinity) {
        return enemies
            .map(e => ({ enemy: e, distSq: (e.x - this.player.x)**2 + (e.y - this.player.y)**2 }))
            .filter(item => item.distSq < maxDist * maxDist)
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, count)
            .map(item => item.enemy);
    }
}

// Helper for drawing jagged lightning lines
function drawLightning(ctx, x1, y1, x2, y2, segments = 5, jitter = 20) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const nx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
        const ny = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
        ctx.lineTo(nx, ny);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// ---------------------------------------------------------
// FIRE ELEMENT
// ---------------------------------------------------------

class Fireball extends Weapon {
    constructor(player) {
        super(player, "Fireball");
        this.projectiles = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 15 + (this.level * 5);
        this.cooldown = Math.max(0.3, 1.2 - (this.level * 0.1));
        this.projSpeed = 400 + (this.level * 20);
        this.aoeRadius = 40 + (this.level * 10);
        this.projCount = this.level >= 3 ? 2 : 1;
        if (this.level >= 5) this.aoeRadius *= 1.5;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0 && enemies.length > 0) {
            const targets = this.getClosestEnemies(enemies, 1);
            if (targets.length > 0) {
                const target = targets[0];
                const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                for (let i = 0; i < this.projCount; i++) {
                    const angle = baseAngle + (i * 0.2 - (this.projCount > 1 ? 0.1 : 0));
                    this.projectiles.push({
                        x: this.player.x, y: this.player.y,
                        vx: Math.cos(angle) * this.projSpeed, vy: Math.sin(angle) * this.projSpeed,
                        life: 2, history: []
                    });
                }
                this.cooldownTimer = this.cooldown;
            }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.history.push({x: p.x, y: p.y});
            if (p.history.length > 10) p.history.shift();

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            let hit = false;
            for (const enemy of enemies) {
                const distSq = (enemy.x - p.x)**2 + (enemy.y - p.y)**2;
                if (distSq < (enemy.radius + 10)**2) { hit = true; break; }
            }

            if (hit || p.life <= 0) {
                // AoE Explosion
                if (globalParticleSystem) globalParticleSystem.emit(p.x, p.y, "#ff5722", 20, { speedMult: 2 });
                for (const enemy of enemies) {
                    if ((enemy.x - p.x)**2 + (enemy.y - p.y)**2 < this.aoeRadius**2) {
                        enemy.takeDamage(this.damage);
                        enemy.applyStatus("burn", 3);
                    }
                }
                // LV5 Secondary explosion
                if (this.level >= 5 && hit) {
                    setTimeout(() => {
                        if (globalParticleSystem) globalParticleSystem.emit(p.x, p.y, "#f44336", 30, { speedMult: 3 });
                        for (const enemy of enemies) {
                            if ((enemy.x - p.x)**2 + (enemy.y - p.y)**2 < (this.aoeRadius * 1.2)**2) {
                                enemy.takeDamage(this.damage * 0.5);
                                enemy.applyStatus("burn", 5);
                            }
                        }
                    }, 200);
                }
                this.projectiles.splice(i, 1);
            }
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const p of this.projectiles) {
            if (p.history.length > 1) {
                for (let i = 0; i < p.history.length - 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(p.history[i].x - cameraX, p.history[i].y - cameraY);
                    ctx.lineTo(p.history[i+1].x - cameraX, p.history[i+1].y - cameraY);
                    ctx.strokeStyle = `rgba(255, 87, 34, ${i/p.history.length})`;
                    ctx.lineWidth = 15 * (i/p.history.length);
                    ctx.stroke();
                }
            }
            ctx.fillStyle = "#ffeb3b";
            ctx.beginPath(); ctx.arc(p.x - cameraX, p.y - cameraY, 8, 0, Math.PI*2); ctx.fill();
        }
    }
}

class FlameStrike extends Weapon {
    constructor(player) {
        super(player, "Flame Strike");
        this.pillars = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 25 + (this.level * 10);
        this.cooldown = Math.max(1.0, 2.5 - (this.level * 0.2));
        this.radius = 60 + (this.level * 15);
        this.pillarCount = this.level >= 3 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0) {
            for(let i=0; i<this.pillarCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 200;
                this.pillars.push({
                    x: this.player.x + Math.cos(angle) * dist,
                    y: this.player.y + Math.sin(angle) * dist,
                    delay: 0.5, life: this.level >= 5 ? 2.0 : 0.3, active: false, tick: 0
                });
            }
            this.cooldownTimer = this.cooldown;
        }

        for (let i = this.pillars.length - 1; i >= 0; i--) {
            const p = this.pillars[i];
            if (p.delay > 0) {
                p.delay -= dt;
                if (p.delay <= 0) p.active = true;
            } else if (p.active) {
                p.life -= dt;
                p.tick -= dt;
                if (p.tick <= 0) {
                    p.tick = 0.3; // tick damage
                    for (const enemy of enemies) {
                        if ((enemy.x - p.x)**2 + (enemy.y - p.y)**2 < this.radius**2) {
                            enemy.takeDamage(this.damage);
                            enemy.applyStatus("burn", 3);
                        }
                    }
                }
                if (p.life <= 0) this.pillars.splice(i, 1);
            }
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const p of this.pillars) {
            if (p.delay > 0) {
                ctx.strokeStyle = "rgba(255, 87, 34, 0.5)";
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(p.x - cameraX, p.y - cameraY, this.radius, 0, Math.PI*2); ctx.stroke();
            } else if (p.active) {
                // LV5 leaves burning ground longer
                const alpha = this.level >= 5 ? Math.min(1, p.life) * 0.5 : p.life / 0.3;
                ctx.fillStyle = `rgba(255, 87, 34, ${alpha})`;
                ctx.beginPath(); ctx.arc(p.x - cameraX, p.y - cameraY, this.radius, 0, Math.PI*2); ctx.fill();
            }
        }
    }
}

class Meteor extends Weapon {
    constructor(player) {
        super(player, "Meteor");
        this.meteors = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 100 + (this.level * 50);
        this.cooldown = Math.max(3.0, 6.0 - (this.level * 0.5));
        this.radius = 150 + (this.level * 30);
        this.meteorCount = this.level >= 3 ? 2 : 1;
        if (this.level >= 5) {
            this.radius *= 1.5;
            this.damage *= 2;
        }
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0) {
            for(let i=0; i<this.meteorCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 300;
                const targetX = this.player.x + Math.cos(angle) * dist;
                const targetY = this.player.y + Math.sin(angle) * dist;
                this.meteors.push({
                    x: targetX - 400 + (i*100), y: targetY - 600 - (i*100),
                    targetX: targetX, targetY: targetY,
                    progress: 0
                });
            }
            this.cooldownTimer = this.cooldown;
        }

        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.progress += dt * 1.5; 
            if (m.progress >= 1) {
                if (globalParticleSystem) globalParticleSystem.emit(m.targetX, m.targetY, "#ff5722", 50, { speedMult: 4 });
                for (const enemy of enemies) {
                    if ((enemy.x - m.targetX)**2 + (enemy.y - m.targetY)**2 < this.radius**2) {
                        enemy.takeDamage(this.damage);
                        enemy.applyStatus("burn", 5);
                    }
                }
                this.meteors.splice(i, 1);
            } else {
                m.x += (m.targetX - m.x) * (dt * 5);
                m.y += (m.targetY - m.y) * (dt * 5);
            }
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const m of this.meteors) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(m.targetX - cameraX, m.targetY - cameraY, this.radius, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = "#ff5722";
            ctx.beginPath(); ctx.arc(m.x - cameraX, m.y - cameraY, 30, 0, Math.PI*2); ctx.fill();
        }
    }
}

// ---------------------------------------------------------
// ICE ELEMENT
// ---------------------------------------------------------

class IceOrb extends Weapon {
    constructor(player) {
        super(player, "Ice Orb");
        this.angle = 0;
        this.applyStats();
    }
    applyStats() {
        this.damage = 10 + (this.level * 3);
        this.radius = 12 + (this.level * 2);
        this.orbitRadius = 80 + (this.level * 10);
        this.speed = 2 + (this.level * 0.2);
        this.orbCount = this.level >= 3 ? 2 : 1;
        if (this.level >= 5) this.speed *= 1.5; // LV5 Orbs spin incredibly fast
    }
    update(dt, enemies) {
        this.angle += this.speed * dt;
        for (let i = 0; i < this.orbCount; i++) {
            const offsetAngle = this.angle + (i * Math.PI);
            const x = this.player.x + Math.cos(offsetAngle) * this.orbitRadius;
            const y = this.player.y + Math.sin(offsetAngle) * this.orbitRadius;

            for (const enemy of enemies) {
                if ((enemy.x - x)**2 + (enemy.y - y)**2 < (enemy.radius + this.radius)**2) {
                    enemy.takeDamage(this.damage * dt * 5); 
                    enemy.applyStatus("slow", 3);
                }
            }
            if(globalParticleSystem && Math.random() < 0.1) {
                globalParticleSystem.emit(x, y, "#4dd0e1", 1, {speedMult: 0.1});
            }
        }
    }
    draw(ctx, cameraX, cameraY) {
        ctx.fillStyle = "#b2ebf2";
        ctx.shadowBlur = 10; ctx.shadowColor = "#00bcd4";
        for (let i = 0; i < this.orbCount; i++) {
            const offsetAngle = this.angle + (i * Math.PI);
            const x = this.player.x + Math.cos(offsetAngle) * this.orbitRadius - cameraX;
            const y = this.player.y + Math.sin(offsetAngle) * this.orbitRadius - cameraY;
            ctx.beginPath(); ctx.arc(x, y, this.radius, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
}

class FrostNova extends Weapon {
    constructor(player) {
        super(player, "Frost Nova");
        this.novas = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 20 + (this.level * 8);
        this.cooldown = Math.max(1.5, 3.5 - (this.level * 0.3));
        this.maxRadius = 150 + (this.level * 20);
        this.novaCount = this.level >= 3 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0) {
            for(let i=0; i<this.novaCount; i++) {
                setTimeout(() => {
                    this.novas.push({ x: this.player.x, y: this.player.y, radius: 0 });
                }, i * 300); // 300ms delay between double novas
            }
            this.cooldownTimer = this.cooldown;
        }

        for (let i = this.novas.length - 1; i >= 0; i--) {
            const n = this.novas[i];
            const prevRadius = n.radius;
            n.radius += dt * 400;

            for (const enemy of enemies) {
                const dist = Math.sqrt((enemy.x - n.x)**2 + (enemy.y - n.y)**2);
                if (dist > prevRadius && dist <= n.radius) {
                    enemy.takeDamage(this.damage);
                    enemy.applyStatus("slow", 3);
                    if (this.level >= 5) enemy.applyStatus("shock", 1.5); // Deep Freeze
                }
            }
            if (n.radius >= this.maxRadius) this.novas.splice(i, 1);
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const n of this.novas) {
            ctx.strokeStyle = `rgba(178, 235, 242, ${1 - n.radius/this.maxRadius})`;
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(n.x - cameraX, n.y - cameraY, n.radius, 0, Math.PI*2); ctx.stroke();
        }
    }
}

class Blizzard extends Weapon {
    constructor(player) {
        super(player, "Blizzard");
        this.fields = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 5 + (this.level * 2);
        this.cooldown = Math.max(2.0, 4.0 - (this.level * 0.4));
        this.radius = 100 + (this.level * 15);
        this.fieldCount = this.level >= 3 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0) {
            for(let i=0; i<this.fieldCount; i++) {
                this.fields.push({
                    x: this.player.x + (Math.random() - 0.5) * 300,
                    y: this.player.y + (Math.random() - 0.5) * 300,
                    life: this.level >= 5 ? 6.0 : 3.0, 
                    tickTimer: 0
                });
            }
            this.cooldownTimer = this.cooldown;
        }

        for (let i = this.fields.length - 1; i >= 0; i--) {
            const f = this.fields[i];
            f.life -= dt;
            f.tickTimer -= dt;
            if (f.tickTimer <= 0) {
                f.tickTimer = 0.5;
                for (const enemy of enemies) {
                    if ((enemy.x - f.x)**2 + (enemy.y - f.y)**2 < this.radius**2) {
                        enemy.takeDamage(this.damage);
                        enemy.applyStatus("slow", 3);
                    }
                }
                if(globalParticleSystem) globalParticleSystem.emit(f.x, f.y, "#ffffff", 5, {speedMult: 1});
            }
            if (f.life <= 0) this.fields.splice(i, 1);
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const f of this.fields) {
            ctx.fillStyle = "rgba(178, 235, 242, 0.2)";
            ctx.beginPath(); ctx.arc(f.x - cameraX, f.y - cameraY, this.radius, 0, Math.PI*2); ctx.fill();
        }
    }
}

// ---------------------------------------------------------
// LIGHTNING ELEMENT
// ---------------------------------------------------------

class LightningStrike extends Weapon {
    constructor(player) {
        super(player, "Lightning Strike");
        this.strikes = [];
        this.grounds = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 40 + (this.level * 15);
        this.cooldown = Math.max(0.5, 2.0 - (this.level * 0.2));
        this.targetCount = this.level >= 3 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0 && enemies.length > 0) {
            const targets = this.getClosestEnemies(enemies, this.targetCount, 400);
            for (const target of targets) {
                target.takeDamage(this.damage);
                target.applyStatus("shock", 1);
                this.strikes.push({x: target.x, y: target.y, life: 0.2});
                
                if (this.level >= 5) {
                    this.grounds.push({x: target.x, y: target.y, life: 2.0, tick: 0});
                }
                if(globalParticleSystem) globalParticleSystem.emit(target.x, target.y, "#ffeb3b", 10, {speedMult: 2});
            }
            if (targets.length > 0) this.cooldownTimer = this.cooldown;
        }

        for (let i = this.strikes.length - 1; i >= 0; i--) {
            this.strikes[i].life -= dt;
            if (this.strikes[i].life <= 0) this.strikes.splice(i, 1);
        }
        
        for (let i = this.grounds.length - 1; i >= 0; i--) {
            const g = this.grounds[i];
            g.life -= dt;
            g.tick -= dt;
            if (g.tick <= 0) {
                g.tick = 0.5;
                for (const enemy of enemies) {
                    if ((enemy.x - g.x)**2 + (enemy.y - g.y)**2 < 50**2) {
                        enemy.takeDamage(this.damage * 0.2);
                        enemy.applyStatus("shock", 0.5);
                    }
                }
            }
            if (g.life <= 0) this.grounds.splice(i, 1);
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const g of this.grounds) {
            ctx.fillStyle = `rgba(255, 235, 59, ${g.life * 0.2})`;
            ctx.beginPath(); ctx.arc(g.x - cameraX, g.y - cameraY, 50, 0, Math.PI*2); ctx.fill();
        }
        for (const s of this.strikes) {
            ctx.save();
            ctx.shadowBlur = 15; ctx.shadowColor = "#ffeb3b";
            ctx.strokeStyle = `rgba(255, 255, 255, ${s.life / 0.2})`; ctx.lineWidth = 3;
            drawLightning(ctx, s.x - cameraX, s.y - cameraY - 600, s.x - cameraX, s.y - cameraY, 8, 60);
            ctx.restore();
        }
    }
}

class ChainLightning extends Weapon {
    constructor(player) {
        super(player, "Chain Lightning");
        this.chains = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 15 + (this.level * 5);
        this.cooldown = Math.max(0.8, 2.5 - (this.level * 0.2));
        this.bounces = 2 + Math.floor(this.level / 2) + (this.level >= 3 ? 3 : 0);
        this.startTargets = this.level >= 5 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0 && enemies.length > 0) {
            const initialTargets = this.getClosestEnemies(enemies, this.startTargets);
            
            for (let current of initialTargets) {
                const chainPoints = [{x: this.player.x, y: this.player.y}];
                let remainingBounces = this.bounces;
                let hitEnemies = new Set([current]);

                while (current && remainingBounces > 0) {
                    current.takeDamage(this.damage);
                    current.applyStatus("shock", 1);
                    chainPoints.push({x: current.x, y: current.y});
                    remainingBounces--;

                    let next = null;
                    let minDist = 200 * 200; 
                    for (const enemy of enemies) {
                        if (!hitEnemies.has(enemy)) {
                            const distSq = (enemy.x - current.x)**2 + (enemy.y - current.y)**2;
                            if (distSq < minDist) {
                                minDist = distSq;
                                next = enemy;
                            }
                        }
                    }
                    current = next;
                    if(current) hitEnemies.add(current);
                }
                this.chains.push({points: chainPoints, life: 0.3});
            }
            if (initialTargets.length > 0) this.cooldownTimer = this.cooldown;
        }

        for (let i = this.chains.length - 1; i >= 0; i--) {
            this.chains[i].life -= dt;
            if (this.chains[i].life <= 0) this.chains.splice(i, 1);
        }
    }
    draw(ctx, cameraX, cameraY) {
        for (const c of this.chains) {
            ctx.save();
            ctx.shadowBlur = 10; ctx.shadowColor = "#fbc02d";
            ctx.strokeStyle = `rgba(255, 255, 255, ${c.life / 0.3})`; ctx.lineWidth = 2;
            for (let i = 0; i < c.points.length - 1; i++) {
                drawLightning(ctx, 
                    c.points[i].x - cameraX, c.points[i].y - cameraY, 
                    c.points[i+1].x - cameraX, c.points[i+1].y - cameraY, 4, 20);
            }
            ctx.restore();
        }
    }
}

class Thunderstorm extends Weapon {
    constructor(player) {
        super(player, "Thunderstorm");
        this.zaps = [];
        this.applyStats();
    }
    applyStats() {
        this.damage = 10 + (this.level * 4);
        this.radius = 120 + (this.level * 20) * (this.level >= 5 ? 2 : 1);
        this.tickRate = Math.max(0.2, 0.8 - (this.level * 0.1));
        this.zapCount = this.level >= 3 ? 2 : 1;
    }
    update(dt, enemies) {
        this.cooldownTimer -= dt;
        if (this.cooldownTimer <= 0) {
            const inRange = enemies.filter(e => (e.x - this.player.x)**2 + (e.y - this.player.y)**2 < this.radius**2);
            for(let i=0; i<this.zapCount && inRange.length > 0; i++) {
                const idx = Math.floor(Math.random() * inRange.length);
                const target = inRange.splice(idx, 1)[0]; // remove so we don't zap same twice in one tick
                target.takeDamage(this.damage);
                target.applyStatus("shock", 1);
                this.zaps.push({x: target.x, y: target.y, life: 0.2});
            }
            this.cooldownTimer = this.tickRate;
        }

        for (let i = this.zaps.length - 1; i >= 0; i--) {
            this.zaps[i].life -= dt;
            if (this.zaps[i].life <= 0) this.zaps.splice(i, 1);
        }
    }
    draw(ctx, cameraX, cameraY) {
        ctx.strokeStyle = "rgba(255, 235, 59, 0.1)";
        ctx.beginPath(); ctx.arc(this.player.x - cameraX, this.player.y - cameraY, this.radius, 0, Math.PI*2); ctx.stroke();

        ctx.save();
        ctx.shadowBlur = 8; ctx.shadowColor = "#ffeb3b";
        ctx.strokeStyle = `rgba(255, 255, 255, 1)`; ctx.lineWidth = 2;
        for (const z of this.zaps) {
            drawLightning(ctx, this.player.x - cameraX, this.player.y - cameraY, z.x - cameraX, z.y - cameraY, 5, 25);
        }
        ctx.restore();
    }
}

class WindBoots extends Weapon {
    constructor(player) {
        super(player, "Wind Boots");
        this.applyStats();
    }
    applyStats() {
        this.player.speedMult = 1.0 + (this.level * 0.15);
    }
    update(dt, enemies) {} 
    draw(ctx, cameraX, cameraY) {} 
}

const WEAPON_TYPES = [
    { 
        id: "fireball", name: "Fireball", class: Fireball, iconBg: "#d84315", iconText: "🔥", 
        description: "Shoots exploding fireball. Applies Burn.",
        perk3: "Fires 2 projectiles simultaneously.", perk5: "Creates a secondary explosion."
    },
    { 
        id: "flamestrike", name: "Flame Strike", class: FlameStrike, iconBg: "#bf360c", iconText: "🌋", 
        description: "Erupts fire pillars nearby. Applies Burn.",
        perk3: "Erupts 2 pillars at once.", perk5: "Pillars leave burning ground."
    },
    { 
        id: "meteor", name: "Meteor", class: Meteor, iconBg: "#3e2723", iconText: "☄️", 
        description: "Drops massive meteor. Applies Burn.",
        perk3: "Drops 2 meteors.", perk5: "Explosion radius and damage massively increased."
    },
    { 
        id: "iceorb", name: "Ice Orb", class: IceOrb, iconBg: "#00838f", iconText: "❄️", 
        description: "Orbits player, piercing enemies. Applies Slow.",
        perk3: "Two orbs orbit the player.", perk5: "Orbit speed vastly increased."
    },
    { 
        id: "frostnova", name: "Frost Nova", class: FrostNova, iconBg: "#006064", iconText: "💠", 
        description: "Emits freezing ring. Applies Slow.",
        perk3: "Emits a double nova.", perk5: "Deep Freeze: Also applies Shock (Stun)."
    },
    { 
        id: "blizzard", name: "Blizzard", class: Blizzard, iconBg: "#e0f7fa", iconText: "🌨️", 
        description: "Creates a snowy field. Applies Slow.",
        perk3: "Spawns 2 fields at once.", perk5: "Fields last twice as long."
    },
    { 
        id: "lightningstrike", name: "Lightning Strike", class: LightningStrike, iconBg: "#fbc02d", iconText: "⚡", 
        description: "Strikes random enemy. Applies Shock.",
        perk3: "Strikes 2 enemies at once.", perk5: "Leaves electrified ground."
    },
    { 
        id: "chainlightning", name: "Chain Lightning", class: ChainLightning, iconBg: "#f57f17", iconText: "🌩️", 
        description: "Bounces between enemies. Applies Shock.",
        perk3: "+3 additional bounces.", perk5: "Fires 2 chains at once."
    },
    { 
        id: "thunderstorm", name: "Thunderstorm", class: Thunderstorm, iconBg: "#afb42b", iconText: "⛈️", 
        description: "Zaps nearby enemies. Applies Shock.",
        perk3: "Zaps 2 enemies per tick.", perk5: "Aura radius doubled."
    },
    { 
        id: "windboots", name: "Wind Boots", class: WindBoots, iconBg: "#4caf50", iconText: "👢", 
        description: "Increases movement speed by 15%.",
        perk3: "+15% speed.", perk5: "+15% speed."
    }
];
