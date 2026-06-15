class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        
        // Base Stats
        this.speed = 200; // pixels per second
        this.speedMult = 1.0; // Modified by passives
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.radius = 15;
        this.pickupRadius = 60;
        
        // State
        this.weapons = [];
        this.isDead = false;
        
        // Visuals
        this.color = "#bb86fc";
        this.facingRight = true;
        
        // Input
        this.keys = {
            w: false, a: false, s: false, d: false,
            ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
        };
        
        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    addWeapon(WeaponClass) {
        this.weapons.push(new WeaponClass(this));
    }

    hasWeapon(WeaponClass) {
        return this.weapons.some(w => w instanceof WeaponClass);
    }

    getWeapon(WeaponClass) {
        return this.weapons.find(w => w instanceof WeaponClass);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        // Flash effect could be added here
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }
    }

    update(dt, boundaries) {
        if (this.isDead) return;

        // Calculate movement vector
        let moveX = 0;
        let moveY = 0;

        if (this.keys.w || this.keys.ArrowUp) moveY -= 1;
        if (this.keys.s || this.keys.ArrowDown) moveY += 1;
        if (this.keys.a || this.keys.ArrowLeft) moveX -= 1;
        if (this.keys.d || this.keys.ArrowRight) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }

        // Apply movement
        this.x += moveX * this.speed * this.speedMult * dt;
        this.y += moveY * this.speed * this.speedMult * dt;

        // Keep in bounds (optional, or infinite map)
        if (boundaries) {
            this.x = Math.max(-boundaries.width/2, Math.min(boundaries.width/2, this.x));
            this.y = Math.max(-boundaries.height/2, Math.min(boundaries.height/2, this.y));
        }

        if (moveX > 0) this.facingRight = true;
        if (moveX < 0) this.facingRight = false;
    }

    draw(ctx, cameraX, cameraY) {
        if (this.isDead) return;

        const renderX = this.x - cameraX;
        const renderY = this.y - cameraY;

        ctx.save();
        
        // Draw shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(renderX, renderY + 12, this.radius, this.radius/2, 0, 0, Math.PI * 2);
        ctx.fill();

        const isMoving = (this.keys.w || this.keys.a || this.keys.s || this.keys.d || this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight);
        const walkAnim = isMoving ? Math.sin(Date.now() * 0.015) * 6 : 0;

        // Draw flowing cape
        ctx.fillStyle = "#b71c1c"; // Dark red cape
        ctx.beginPath();
        const capeSway = isMoving ? Math.sin(Date.now() * 0.01) * 8 : Math.sin(Date.now() * 0.005) * 3;
        if (this.facingRight) {
            ctx.moveTo(renderX - 4, renderY - 5);
            ctx.lineTo(renderX - 18 - capeSway, renderY + 12);
            ctx.lineTo(renderX - 4, renderY + 12);
        } else {
            ctx.moveTo(renderX + 4, renderY - 5);
            ctx.lineTo(renderX + 18 + capeSway, renderY + 12);
            ctx.lineTo(renderX + 4, renderY + 12);
        }
        ctx.fill();

        // Draw Legs
        ctx.strokeStyle = "#424242"; // Dark pants
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        
        // Back leg
        ctx.beginPath();
        ctx.moveTo(renderX - 3, renderY + 5);
        ctx.lineTo(renderX - 3 + (this.facingRight ? -walkAnim : walkAnim), renderY + 14);
        ctx.stroke();

        // Front leg
        ctx.beginPath();
        ctx.moveTo(renderX + 3, renderY + 5);
        ctx.lineTo(renderX + 3 + (this.facingRight ? walkAnim : -walkAnim), renderY + 14);
        ctx.stroke();

        // Draw Torso
        ctx.fillStyle = this.color;
        ctx.fillRect(renderX - 6, renderY - 5, 12, 12);

        // Draw Arms
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5;
        // Back arm
        ctx.beginPath();
        ctx.moveTo(renderX - 5, renderY - 3);
        ctx.lineTo(renderX - 8 + (this.facingRight ? walkAnim : -walkAnim), renderY + 4);
        ctx.stroke();
        // Front arm
        ctx.beginPath();
        ctx.moveTo(renderX + 5, renderY - 3);
        ctx.lineTo(renderX + 8 + (this.facingRight ? -walkAnim : walkAnim), renderY + 4);
        ctx.stroke();

        // Draw Head
        ctx.fillStyle = "#ffccbc"; // Skin tone
        ctx.beginPath();
        ctx.arc(renderX, renderY - 11, 7, 0, Math.PI * 2);
        ctx.fill();

        // Draw Hair
        ctx.fillStyle = "#3e2723"; // Dark brown hair
        ctx.beginPath();
        ctx.arc(renderX, renderY - 12, 7, Math.PI * 1.1, Math.PI * 2.1);
        ctx.fill();

        // Draw Eyes
        ctx.fillStyle = "#000";
        const eyeOffset = this.facingRight ? 3 : -3;
        ctx.beginPath();
        ctx.arc(renderX + eyeOffset - 2, renderY - 11, 1.5, 0, Math.PI * 2);
        ctx.arc(renderX + eyeOffset + 2, renderY - 11, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
