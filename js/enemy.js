class Enemy {
    constructor(x, y, type = "bat", timeScaling = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isDead = false;
        this.damageFlashTimer = 0;
        this.isBoss = false;
        
        // Status Effects
        this.status = {
            burnTimer: 0,
            burnTickTimer: 0,
            slowTimer: 0,
            shockTimer: 0
        };

        this.applyStats(timeScaling);
    }

    applyStats(timeScaling) {
        const hpScale = 1 + (timeScaling * 0.5);
        const speedScale = 1 + (timeScaling * 0.1);

        switch (this.type) {
            case "bat":
                this.maxHealth = 10 * hpScale;
                this.speed = (100 + Math.random() * 20) * speedScale;
                this.damage = 5;
                this.radius = 12;
                this.color = "#4e342e";
                this.expReward = 1;
                break;
            case "zombie":
                this.maxHealth = 30 * hpScale;
                this.speed = (50 + Math.random() * 10) * speedScale;
                this.damage = 10;
                this.radius = 15;
                this.color = "#33691e";
                this.expReward = 2;
                break;
            case "skeleton":
                this.maxHealth = 20 * hpScale;
                this.speed = (80 + Math.random() * 15) * speedScale;
                this.damage = 8;
                this.radius = 13;
                this.color = "#eeeeee";
                this.expReward = 3;
                break;
        }
        this.expReward = Math.max(1, Math.floor(this.expReward * hpScale));
        this.health = this.maxHealth;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.damageFlashTimer = 0.1;
        
        if (globalParticleSystem) {
            globalParticleSystem.emitDamageText(this.x, this.y - this.radius, Math.floor(amount));
            globalParticleSystem.emit(this.x, this.y, this.color, 3, { speedMult: 0.5 });
        }

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            if (this.isBoss) this.onDeath();
        }
    }

    onDeath() {} // Hook for boss

    applyStatus(effect, duration) {
        if (effect === "burn") this.status.burnTimer = duration;
        if (effect === "slow") this.status.slowTimer = duration;
        if (effect === "shock") this.status.shockTimer = duration;
    }

    update(dt, player, enemyManager) {
        if (this.isDead) return;

        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

        if (this.status.shockTimer > 0) {
            this.status.shockTimer -= dt;
            if (Math.random() < 0.1 && globalParticleSystem) {
                globalParticleSystem.emit(this.x, this.y, "#ffeb3b", 1, { speedMult: 2 });
            }
            return; 
        }

        let currentSpeed = this.speed;
        if (this.status.slowTimer > 0) {
            this.status.slowTimer -= dt;
            currentSpeed *= 0.5;
            if (Math.random() < 0.05 && globalParticleSystem) {
                globalParticleSystem.emit(this.x, this.y, "#81d4fa", 1, { speedMult: 0.2 });
            }
        }

        if (this.status.burnTimer > 0) {
            this.status.burnTimer -= dt;
            this.status.burnTickTimer -= dt;
            if (this.status.burnTickTimer <= 0) {
                this.takeDamage(5);
                this.status.burnTickTimer = 0.5;
                if (globalParticleSystem) {
                    globalParticleSystem.emit(this.x, this.y, "#ff5722", 2, { speedMult: 1 });
                }
            }
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * currentSpeed * dt;
            this.y += (dy / dist) * currentSpeed * dt;
        }

        if (dist < this.radius + player.radius) {
            player.takeDamage(this.damage * dt);
        }
    }

    draw(ctx, cameraX, cameraY) {
        if (this.isDead) return;

        const renderX = this.x - cameraX;
        const renderY = this.y - cameraY;

        ctx.save();
        
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(renderX, renderY + this.radius, this.radius, this.radius/2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.damageFlashTimer > 0) {
            ctx.fillStyle = "#fff";
        } else if (this.status.burnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = "#ff5722";
        } else if (this.status.slowTimer > 0) {
            ctx.fillStyle = "#4dd0e1";
        } else if (this.status.shockTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.fillStyle = "#fff59d";
        } else {
            ctx.fillStyle = this.color;
        }
        
        const bounce = Math.sin(this.x * 0.1) * 2;
        const dx = player.x - this.x; 
        
        if (this.type === "bat") {
            const flap = Math.sin(Date.now() * 0.02 + this.x) * 10;
            ctx.beginPath(); ctx.arc(renderX, renderY + bounce, 6, 0, Math.PI * 2); ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(renderX - 4, renderY + bounce);
            ctx.lineTo(renderX - 15, renderY - flap + bounce);
            ctx.lineTo(renderX - 20, renderY + 5 - flap + bounce);
            ctx.lineTo(renderX - 4, renderY + 5 + bounce);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(renderX + 4, renderY + bounce);
            ctx.lineTo(renderX + 15, renderY - flap + bounce);
            ctx.lineTo(renderX + 20, renderY + 5 - flap + bounce);
            ctx.lineTo(renderX + 4, renderY + 5 + bounce);
            ctx.fill();

            ctx.fillStyle = "#f44336";
            ctx.beginPath();
            ctx.arc(renderX - 2, renderY - 1 + bounce, 1, 0, Math.PI * 2);
            ctx.arc(renderX + 2, renderY - 1 + bounce, 1, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === "zombie") {
            ctx.beginPath(); ctx.arc(renderX, renderY + bounce, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(renderX - 8, renderY + bounce + 6, 16, 12);

            ctx.fillStyle = "#2e7d32";
            ctx.fillRect(renderX + (dx > 0 ? 5 : -15), renderY + bounce + 8, 10, 4);
            ctx.fillRect(renderX + (dx > 0 ? -10 : 0), renderY + bounce + 10, 10, 4);
            
            ctx.fillStyle = "#000";
            const dir = dx > 0 ? 2 : -2;
            ctx.beginPath();
            ctx.arc(renderX + dir - 2, renderY + bounce - 2, 1.5, 0, Math.PI * 2);
            ctx.arc(renderX + dir + 2, renderY + bounce - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === "skeleton") {
            ctx.beginPath(); ctx.arc(renderX, renderY + bounce - 4, 8, 0, Math.PI * 2); ctx.fill();
            
            ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(renderX, renderY + bounce + 4); ctx.lineTo(renderX, renderY + bounce + 14); ctx.stroke();
            
            ctx.beginPath(); ctx.moveTo(renderX - 6, renderY + bounce + 6); ctx.lineTo(renderX + 6, renderY + bounce + 6);
            ctx.moveTo(renderX - 5, renderY + bounce + 10); ctx.lineTo(renderX + 5, renderY + bounce + 10); ctx.stroke();
            
            ctx.fillStyle = "#000";
            const dir = dx > 0 ? 2 : -2;
            ctx.beginPath();
            ctx.arc(renderX + dir - 3, renderY + bounce - 5, 2, 0, Math.PI*2);
            ctx.arc(renderX + dir + 3, renderY + bounce - 5, 2, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class VampireLord extends Enemy {
    constructor(x, y, timeScaling) {
        super(x, y, "vampire_lord", timeScaling);
        this.isBoss = true;
        this.maxHealth = 3000 + (timeScaling * 500);
        this.health = this.maxHealth;
        this.radius = 35;
        this.speed = 90;
        this.damage = 30;
        this.expReward = 200;
        this.color = "#111";
        
        this.phase = "chase";
        this.phaseTimer = 5;
        
        document.getElementById('boss-ui').style.display = 'flex';
        this.hpFill = document.getElementById('boss-hp-fill');
    }
    
    update(dt, player, enemyManager) {
        super.update(dt, player, enemyManager);
        
        if (this.hpFill && !this.isDead) {
            this.hpFill.style.width = `${Math.max(0, (this.health / this.maxHealth) * 100)}%`;
        }

        if (this.status.shockTimer > 0) return; // Stun stops patterns

        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
            if (this.phase === "chase") {
                this.phase = "dash";
                this.phaseTimer = 1.0;
                this.speed = 350;
            } else if (this.phase === "dash") {
                this.phase = "summon";
                this.phaseTimer = 1.5;
                this.speed = 0;
                // Summon 8 bats in a circle
                for(let i=0; i<8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    enemyManager.enemies.push(new Enemy(this.x + Math.cos(angle)*60, this.y + Math.sin(angle)*60, "bat", enemyManager.gameMinutes));
                }
            } else {
                this.phase = "chase";
                this.phaseTimer = 5.0;
                this.speed = 90;
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        if (this.isDead) return;
        
        const renderX = this.x - cameraX;
        const renderY = this.y - cameraY;

        ctx.save();
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(renderX, renderY + this.radius, this.radius, this.radius/2, 0, 0, Math.PI * 2); ctx.fill();

        if (this.damageFlashTimer > 0) ctx.fillStyle = "#fff";
        else ctx.fillStyle = this.color;
        
        const bounce = Math.sin(this.x * 0.05) * 3;
        
        // Cape
        ctx.fillStyle = "#b71c1c";
        ctx.beginPath();
        ctx.moveTo(renderX - 10, renderY - 10 + bounce);
        ctx.lineTo(renderX - 40, renderY + 40 + bounce);
        ctx.lineTo(renderX + 40, renderY + 40 + bounce);
        ctx.lineTo(renderX + 10, renderY - 10 + bounce);
        ctx.fill();

        // Body
        ctx.fillStyle = this.damageFlashTimer > 0 ? "#fff" : "#212121";
        ctx.fillRect(renderX - 15, renderY - 5 + bounce, 30, 35);
        
        // Head
        ctx.fillStyle = "#ffccbc";
        ctx.beginPath(); ctx.arc(renderX, renderY - 15 + bounce, 12, 0, Math.PI * 2); ctx.fill();
        
        // Eyes
        ctx.fillStyle = "#f44336";
        const dx = player.x - this.x;
        const dir = dx > 0 ? 4 : -4;
        ctx.beginPath();
        ctx.arc(renderX + dir - 4, renderY - 16 + bounce, 2, 0, Math.PI*2);
        ctx.arc(renderX + dir + 4, renderY - 16 + bounce, 2, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    onDeath() {
        document.getElementById('boss-ui').style.display = 'none';
        // Massive explosion
        if (globalParticleSystem) {
            globalParticleSystem.emit(this.x, this.y, "#f44336", 100, { speedMult: 5 });
            globalParticleSystem.emit(this.x, this.y, "#ffeb3b", 50, { speedMult: 8 });
        }
        // Big heal drop handled manually here for simplicity
        player.health = player.maxHealth;
    }
}

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.gameMinutes = 0;
        this.bossSpawned = false;
        this.killCount = 0;
    }

    update(dt, player, expManager) {
        this.gameMinutes += dt / 60;
        
        if (this.gameMinutes >= 2.0 && !this.bossSpawned) {
            this.bossSpawned = true;
            // Spawn Boss far away
            this.enemies.push(new VampireLord(player.x, player.y - 600, this.gameMinutes));
        }

        const spawnRate = Math.max(0.1, 1.0 - (this.gameMinutes * 0.15));
        const spawnCount = 1 + Math.floor(this.gameMinutes * 2);

        this.spawnTimer -= dt;

        if (this.spawnTimer <= 0) {
            this.spawnTimer = spawnRate;
            for (let i = 0; i < spawnCount; i++) {
                this.spawnEnemy(player);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player, this);

            if (enemy.isDead) {
                expManager.spawnGem(enemy.x, enemy.y, enemy.expReward);
                this.killCount++;
                
                // Guaranteed drop every 25 kills OR 3% random chance
                if (this.killCount % 25 === 0 || Math.random() < 0.03) {
                    expManager.spawnItem(enemy.x, enemy.y + 20, "magnet");
                }
                
                if (globalParticleSystem) {
                    globalParticleSystem.emit(enemy.x, enemy.y, enemy.color, 15, { speedMult: 1.5 });
                }
                this.enemies.splice(i, 1);
            }
        }
        
        this.resolveCollisions();
    }
    
    resolveCollisions() {
        for (let i = 0; i < this.enemies.length; i++) {
            for (let j = i + 1; j < this.enemies.length; j++) {
                const e1 = this.enemies[i];
                const e2 = this.enemies[j];
                
                const dx = e2.x - e1.x;
                const dy = e2.y - e1.y;
                const distSq = dx * dx + dy * dy;
                const minRadius = e1.radius + e2.radius;
                
                if (distSq < minRadius * minRadius && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minRadius - dist;
                    const pushX = (dx / dist) * overlap * 0.5;
                    const pushY = (dy / dist) * overlap * 0.5;
                    
                    if (!e1.status.shockTimer && !e1.isBoss) { e1.x -= pushX; e1.y -= pushY; }
                    if (!e2.status.shockTimer && !e2.isBoss) { e2.x += pushX; e2.y += pushY; }
                }
            }
        }
    }

    spawnEnemy(player) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(window.innerWidth, window.innerHeight) / 2 + 100;
        
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        let type = "bat";
        const rand = Math.random();
        if (this.gameMinutes > 0.5 && rand < 0.4) type = "zombie";
        if (this.gameMinutes > 1.5 && rand < 0.7 && rand >= 0.3) type = "skeleton";

        this.enemies.push(new Enemy(x, y, type, this.gameMinutes));
    }

    draw(ctx, cameraX, cameraY) {
        this.enemies.forEach(enemy => enemy.draw(ctx, cameraX, cameraY));
    }
}
