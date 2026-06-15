class ExperienceGem {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.radius = 4 + Math.min(amount, 10); // Size based on amount
        
        // Color based on amount
        if (amount < 5) this.color = "#42a5f5"; // Blue
        else if (amount < 15) this.color = "#66bb6a"; // Green
        else this.color = "#e53935"; // Red
        
        this.collected = false;
        this.magnetized = false;
        this.speed = 0;
    }

    update(dt, player, pickupRadius) {
        if (this.collected) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Magnetism
        if (distSq < pickupRadius * pickupRadius || this.magnetized) {
            this.magnetized = true;
            this.speed += 500 * dt; // Accelerate towards player
            const dist = Math.sqrt(distSq);
            
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }

            // Collection
            if (dist < player.radius + this.radius) {
                this.collected = true;
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        
        // Draw diamond shape
        const renderX = this.x - cameraX;
        const renderY = this.y - cameraY;
        
        ctx.moveTo(renderX, renderY - this.radius);
        ctx.lineTo(renderX + this.radius, renderY);
        ctx.lineTo(renderX, renderY + this.radius);
        ctx.lineTo(renderX - this.radius, renderY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class MagnetItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.collected = false;
        this.color = "#9c27b0"; // Purple
    }

    update(dt, player) {
        if (this.collected) return;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Magnet items have a fixed small pickup radius
        if (distSq < (player.basePickupRadius + this.radius)**2) {
            this.collected = true;
            player.magnetBuffTimer = 10; // 10 seconds of massive pickup range
            if (globalParticleSystem) {
                globalParticleSystem.emit(this.x, this.y, this.color, 30, { speedMult: 2 });
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        ctx.save();
        const renderX = this.x - cameraX;
        const renderY = this.y - cameraY;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Draw U-Shape
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(renderX, renderY, 6, Math.PI, 0);
        ctx.lineTo(renderX + 6, renderY + 8);
        ctx.moveTo(renderX - 6, renderY);
        ctx.lineTo(renderX - 6, renderY + 8);
        ctx.stroke();
        
        // Red/Blue tips
        ctx.fillStyle = "#f44336"; ctx.fillRect(renderX + 4, renderY + 8, 4, 4);
        ctx.fillStyle = "#2196f3"; ctx.fillRect(renderX - 8, renderY + 8, 4, 4);
        
        ctx.restore();
    }
}

class ExperienceManager {
    constructor() {
        this.gems = [];
        this.items = [];
        this.currentExp = 0;
        this.level = 1;
        this.expToNextLevel = 10; // Base requirement
        
        // UI Elements
        this.expFill = document.getElementById('exp-bar-fill');
        this.levelText = document.getElementById('level-text');
    }

    spawnGem(x, y, amount) {
        this.gems.push(new ExperienceGem(x, y, amount));
    }

    spawnItem(x, y, type) {
        if (type === "magnet") {
            this.items.push(new MagnetItem(x, y));
        }
    }

    update(dt, player, onLevelUp) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(dt, player);
            if (item.collected) {
                this.items.splice(i, 1);
            }
        }

        const pr = player.getPickupRadius();
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const gem = this.gems[i];
            gem.update(dt, player, pr);
            
            if (gem.collected) {
                this.addExp(gem.amount, onLevelUp);
                this.gems.splice(i, 1);
            }
        }
    }

    addExp(amount, onLevelUp) {
        this.currentExp += amount;
        
        while (this.currentExp >= this.expToNextLevel) {
            this.currentExp -= this.expToNextLevel;
            this.level++;
            // Increase requirement for next level: base + level^1.5 * 5
            this.expToNextLevel = Math.floor(10 + Math.pow(this.level, 1.5) * 5);
            
            this.updateUI();
            if (onLevelUp) onLevelUp(this.level);
        }
        
        this.updateUI();
    }

    updateUI() {
        const percentage = (this.currentExp / this.expToNextLevel) * 100;
        this.expFill.style.width = `${percentage}%`;
        this.levelText.innerText = this.level;
    }

    draw(ctx, cameraX, cameraY) {
        this.items.forEach(item => item.draw(ctx, cameraX, cameraY));
        this.gems.forEach(gem => gem.draw(ctx, cameraX, cameraY));
    }
}
