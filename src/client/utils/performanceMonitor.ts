/**
 * Performance Monitor for Emojirades Game
 * Tracks performance metrics and provides optimization suggestions
 */

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  networkLatency: number;
}

interface PerformanceSettings {
  enableAnimations: boolean;
  enableSounds: boolean;
  enableParticleEffects: boolean;
  renderQuality: 'low' | 'medium' | 'high';
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    networkLatency: 0
  };

  private settings: PerformanceSettings = {
    enableAnimations: true,
    enableSounds: true,
    enableParticleEffects: true,
    renderQuality: 'high'
  };

  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fpsHistory: number[] = [];
  private isMonitoring = false;

  constructor() {
    this.loadSettings();
    this.detectDeviceCapabilities();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('emojirades-performance-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load performance settings:', error);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('emojirades-performance-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save performance settings:', error);
    }
  }

  private detectDeviceCapabilities() {
    // Detect device type and capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = this.isLowEndDevice();

    if (isMobile || isLowEnd) {
      this.settings.renderQuality = 'medium';
      this.settings.enableParticleEffects = false;
    }

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.enableAnimations = false;
    }

    this.saveSettings();
  }

  private isLowEndDevice(): boolean {
    // Simple heuristics to detect low-end devices
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory && memory < 4) return true;
    if (cores && cores < 4) return true;
    
    return false;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorFrame();
    this.monitorMemory();
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  private monitorFrame() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsHistory.push(fps);
      
      // Keep only last 60 frames
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      // Calculate average FPS
      this.metrics.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      
      // Auto-adjust settings based on performance
      this.autoOptimize();
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    requestAnimationFrame(() => this.monitorFrame());
  }

  private monitorMemory() {
    if (!this.isMonitoring) return;

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    setTimeout(() => this.monitorMemory(), 5000); // Check every 5 seconds
  }

  private autoOptimize() {
    const { fps, memoryUsage } = this.metrics;
    
    // If FPS drops below 30, reduce quality
    if (fps < 30 && this.settings.renderQuality === 'high') {
      this.settings.renderQuality = 'medium';
      this.settings.enableParticleEffects = false;
      this.saveSettings();
      this.applySettings();
    }
    
    // If FPS drops below 20, disable animations
    if (fps < 20 && this.settings.enableAnimations) {
      this.settings.enableAnimations = false;
      this.saveSettings();
      this.applySettings();
    }
    
    // If memory usage is high, reduce effects
    if (memoryUsage > 0.8) {
      this.settings.enableParticleEffects = false;
      this.saveSettings();
      this.applySettings();
    }
  }

  private applySettings() {
    // Apply animation settings
    if (this.settings.enableAnimations) {
      document.body.classList.remove('animations-disabled');
    } else {
      document.body.classList.add('animations-disabled');
    }

    // Apply render quality settings
    document.body.classList.remove('render-low', 'render-medium', 'render-high');
    document.body.classList.add(`render-${this.settings.renderQuality}`);

    // Apply particle effects settings
    if (this.settings.enableParticleEffects) {
      document.body.classList.remove('particles-disabled');
    } else {
      document.body.classList.add('particles-disabled');
    }
  }

  // Public API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getSettings(): PerformanceSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<PerformanceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applySettings();
  }

  measureNetworkLatency(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      
      fetch('/api/ping', { method: 'HEAD' })
        .then(() => {
          const latency = performance.now() - start;
          this.metrics.networkLatency = latency;
          resolve(latency);
        })
        .catch(() => {
          resolve(-1); // Network error
        });
    });
  }

  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const { fps, memoryUsage } = this.metrics;

    if (fps < 30) {
      recommendations.push('Consider reducing animation quality for better performance');
    }

    if (memoryUsage > 0.7) {
      recommendations.push('High memory usage detected - consider closing other tabs');
    }

    if (this.metrics.networkLatency > 200) {
      recommendations.push('High network latency detected - check your internet connection');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal!');
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export const usePerformanceMonitor = () => {
  return {
    startMonitoring: performanceMonitor.startMonitoring.bind(performanceMonitor),
    stopMonitoring: performanceMonitor.stopMonitoring.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getSettings: performanceMonitor.getSettings.bind(performanceMonitor),
    updateSettings: performanceMonitor.updateSettings.bind(performanceMonitor),
    measureNetworkLatency: performanceMonitor.measureNetworkLatency.bind(performanceMonitor),
    getRecommendations: performanceMonitor.getPerformanceRecommendations.bind(performanceMonitor)
  };
};
