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

    update(dt, player) {
        if (this.collected) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Magnetism
        if (distSq < player.pickupRadius * player.pickupRadius || this.magnetized) {
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

class ExperienceManager {
    constructor() {
        this.gems = [];
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

    update(dt, player, onLevelUp) {
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const gem = this.gems[i];
            gem.update(dt, player);
            
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
            // Increase requirement for next level
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
            
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
        this.gems.forEach(gem => gem.draw(ctx, cameraX, cameraY));
    }
}
