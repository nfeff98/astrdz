import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js'

class BulletHandler {
    constructor(scene, camera) {
        this.scene = scene
        this.camera = camera
        this.bullets = []
        this.bulletModel = null
        this.gltfLoader = new GLTFLoader()
        this.isLoaded = false
        
        // Bullet properties
        this.bulletSpeed = 0.2
        this.maxBullets = 50
        this.bulletLifetime = 1000 // 3 seconds in milliseconds
        
        // Load the bullet model
        this.loadBulletModel()
    }
    
    loadBulletModel() {
        this.gltfLoader.load(
            './static/beam1.glb',
            (gltf) => {
                this.bulletModel = gltf.scene
                this.isLoaded = true

                this.bulletModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material = new THREE.MeshLambertMaterial({ 
                            color: 0x33a3ff,
                            transparent: false,
                            opacity: 1
                        })
                    }
                })
                console.log('Bullet model loaded successfully!')
            },
            (progress) => {
                console.log('Loading bullet progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
                console.error('Error loading bullet model:', error)
            }
        )

    }
    
    createBullet(startPosition, direction, parentVelocity) {
        if (!this.isLoaded || this.bullets.length >= this.maxBullets) {
            return null
        }
        
        // Clone the bullet model
        const bullet = this.bulletModel.clone()
        
        // Set position and scale
        bullet.position.copy({x:startPosition.x, y:startPosition.y, z:startPosition.z})

        const offset = -0.2
        bullet.position.x += offset * direction.x
        bullet.position.y += offset * direction.y
        bullet.position.z += offset * direction.z

        bullet.scale.set(1, 1,1)
        
        // Calculate rotation to face the direction
        const angle = Math.atan2(direction.y, direction.x)
        bullet.rotation.z = angle + Math.PI/2
        
        // Add to scene
        this.scene.add(bullet)
        
        // Create bullet data
        const bulletData = {
            mesh: bullet,
            velocity: {
                x: direction.x * this.bulletSpeed + parentVelocity.x,
                y: direction.y * this.bulletSpeed + parentVelocity.y,
                z: 0
            },
            startTime: Date.now(),
            isActive: true
        }
        
        this.bullets.push(bulletData)
        return bulletData
    }
    
    updateBullets() {
        const currentTime = Date.now()
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i]
            
            if (!bullet.isActive) {
                continue
            }
            
            // Check if bullet has exceeded lifetime
            if (currentTime - bullet.startTime > this.bulletLifetime) {
                this.removeBullet(i)
                continue
            }
            
            // Update position
            bullet.mesh.position.x += bullet.velocity.x
            bullet.mesh.position.y += bullet.velocity.y
            bullet.mesh.position.z += bullet.velocity.z
            
           // console.log("Bullet position:", bullet.mesh.position)
            // Check if bullet is too far from camera (cleanup)
            const distanceFromCamera = bullet.mesh.position.distanceTo(this.camera.position)
            if (distanceFromCamera > 100) {
                this.removeBullet(i)
                continue
            }
        }
    }
    
    removeBullet(index) {
        const bullet = this.bullets[index]
        
        // Remove from scene
        this.scene.remove(bullet.mesh)
        
        // Dispose of geometry and materials to prevent memory leaks
        bullet.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose()
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            }
        })
        
        // Remove from bullets array
        this.bullets.splice(index, 1)
    }
    
    clearAllBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.removeBullet(i)
        }
    }

    getBullets() {
        return this.bullets
    }
    
    getBulletCount() {
        return this.bullets.length
    }
    
    // Method to shoot bullet from rocket position and direction
    shootFromRocket(rocketPosition, rocketRotation, parentVelocity) {
        if (!this.isLoaded) {
            return
        }
        
        // Calculate forward direction based on rocket rotation
        const forwardX = Math.sin(rocketRotation)
        const forwardY = Math.cos(rocketRotation)
        
        // Offset bullet start position slightly in front of rocket
        const offsetDistance = 0.5
        const startPosition = new THREE.Vector3(
            rocketPosition.x + forwardX * offsetDistance,
            rocketPosition.y + forwardY * offsetDistance,
            rocketPosition.z
        )
        
        const direction = new THREE.Vector3(forwardX, forwardY, 0)
        
        return this.createBullet(startPosition, direction,  parentVelocity)
    }
}

export default BulletHandler