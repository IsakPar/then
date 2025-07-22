// Mobile performance monitoring for investor demo
// Tracks key metrics for mobile optimization validation

export interface PerformanceMetrics {
  touchResponseTime: number;
  frameRate: number;
  memoryUsage: number;
  paintTime: number;
  interactionTime: number;
  seatRenderTime: number;
}

export interface TouchMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  target: string;
}

export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor;
  private metrics: PerformanceMetrics;
  private touchMetrics: TouchMetrics[] = [];
  private frameTimestamps: number[] = [];
  private isMonitoring = false;
  private startTime: number = 0;

  private constructor() {
    this.metrics = {
      touchResponseTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      paintTime: 0,
      interactionTime: 0,
      seatRenderTime: 0
    };
  }

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor();
    }
    return MobilePerformanceMonitor.instance;
  }

  // Start monitoring performance
  startMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    this.isMonitoring = true;
    this.startTime = performance.now();
    
    // Monitor frame rate
    this.monitorFrameRate();
    
    // Monitor touch interactions
    this.monitorTouchInteractions();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor paint performance
    this.monitorPaintPerformance();
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  // Monitor frame rate using requestAnimationFrame
  private monitorFrameRate(): void {
    if (!this.isMonitoring) return;

    const measureFrame = () => {
      const now = performance.now();
      this.frameTimestamps.push(now);
      
      // Keep only last 60 frames for calculation
      if (this.frameTimestamps.length > 60) {
        this.frameTimestamps.shift();
      }
      
      // Calculate FPS
      if (this.frameTimestamps.length >= 2) {
        const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - 
                        this.frameTimestamps[0];
        this.metrics.frameRate = Math.round((this.frameTimestamps.length - 1) / (timeSpan / 1000));
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFrame);
      }
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Monitor touch interaction response times
  private monitorTouchInteractions(): void {
    if (typeof document === 'undefined') return;

    const touchStartHandler = (e: TouchEvent) => {
      const startTime = performance.now();
      const target = (e.target as HTMLElement)?.tagName || 'unknown';
      
      const touchEndHandler = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.touchMetrics.push({
          startTime,
          endTime,
          duration,
          target
        });
        
        // Keep only last 20 touch interactions
        if (this.touchMetrics.length > 20) {
          this.touchMetrics.shift();
        }
        
        // Update average touch response time
        this.updateTouchResponseTime();
        
        document.removeEventListener('touchend', touchEndHandler);
      };
      
      document.addEventListener('touchend', touchEndHandler, { once: true });
    };
    
    document.addEventListener('touchstart', touchStartHandler, { passive: true });
  }

  // Update average touch response time
  private updateTouchResponseTime(): void {
    if (this.touchMetrics.length === 0) return;
    
    const totalTime = this.touchMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    this.metrics.touchResponseTime = Math.round(totalTime / this.touchMetrics.length);
  }

  // Monitor memory usage (if available)
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined') return;
    
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      
      if (this.isMonitoring) {
        setTimeout(updateMemory, 1000); // Update every second
      }
    };
    
    updateMemory();
  }

  // Monitor paint performance
  private monitorPaintPerformance(): void {
    if (typeof window === 'undefined') return;
    
    // Use Performance Observer for paint timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.paintTime = Math.round(entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
    }
  }

  // Measure seat rendering performance
  measureSeatRenderTime(seatCount: number): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      // Wait for next frame to ensure rendering is complete
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        this.metrics.seatRenderTime = Math.round(renderTime);
        
        console.log(`📊 Rendered ${seatCount} seats in ${renderTime.toFixed(2)}ms`);
        resolve(renderTime);
      });
    });
  }

  // Measure interaction time (e.g., seat selection)
  measureInteractionTime<T>(interactionName: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.metrics.interactionTime = Math.round(endTime - startTime);
    
    console.log(`⚡ ${interactionName} completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  }

  // Get current performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance grade (A, B, C, D, F)
  getPerformanceGrade(): string {
    const { touchResponseTime, frameRate, seatRenderTime } = this.metrics;
    
    let score = 0;
    
    // Touch response time scoring (0-30 points)
    if (touchResponseTime < 50) score += 30;
    else if (touchResponseTime < 100) score += 25;
    else if (touchResponseTime < 150) score += 20;
    else if (touchResponseTime < 200) score += 15;
    else score += 10;
    
    // Frame rate scoring (0-40 points)
    if (frameRate >= 55) score += 40;
    else if (frameRate >= 45) score += 35;
    else if (frameRate >= 35) score += 30;
    else if (frameRate >= 25) score += 20;
    else score += 10;
    
    // Render time scoring (0-30 points)
    if (seatRenderTime < 50) score += 30;
    else if (seatRenderTime < 100) score += 25;
    else if (seatRenderTime < 200) score += 20;
    else if (seatRenderTime < 300) score += 15;
    else score += 10;
    
    // Grade conversion
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Get performance status for investor demo
  getPerformanceStatus(): {
    grade: string;
    touchResponse: 'excellent' | 'good' | 'fair' | 'poor';
    frameRate: 'excellent' | 'good' | 'fair' | 'poor';
    overall: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const { touchResponseTime, frameRate } = this.metrics;
    
    const getTouchStatus = (time: number) => {
      if (time < 50) return 'excellent';
      if (time < 100) return 'good';
      if (time < 150) return 'fair';
      return 'poor';
    };
    
    const getFrameStatus = (fps: number) => {
      if (fps >= 55) return 'excellent';
      if (fps >= 45) return 'good';
      if (fps >= 35) return 'fair';
      return 'poor';
    };
    
    const touchStatus = getTouchStatus(touchResponseTime);
    const frameStatus = getFrameStatus(frameRate);
    
    // Overall status based on worst metric
    const overall = touchStatus === 'poor' || frameStatus === 'poor' ? 'poor' :
                   touchStatus === 'fair' || frameStatus === 'fair' ? 'fair' :
                   touchStatus === 'good' || frameStatus === 'good' ? 'good' : 'excellent';
    
    return {
      grade: this.getPerformanceGrade(),
      touchResponse: touchStatus,
      frameRate: frameStatus,
      overall
    };
  }

  // Generate performance report for investor demo
  generateReport(): string {
    const status = this.getPerformanceStatus();
    const { touchResponseTime, frameRate, memoryUsage, seatRenderTime } = this.metrics;
    
    return `
🎭 Mobile Performance Report
========================

📊 Overall Grade: ${status.grade}
🏆 Overall Status: ${status.overall.toUpperCase()}

📱 Touch Response: ${touchResponseTime}ms (${status.touchResponse})
🎮 Frame Rate: ${frameRate}fps (${status.frameRate})
💾 Memory Usage: ${memoryUsage}MB
⚡ Seat Render: ${seatRenderTime}ms

✅ Investor Demo Ready: ${status.overall === 'excellent' || status.overall === 'good' ? 'YES' : 'NEEDS OPTIMIZATION'}
    `.trim();
  }

  // Reset metrics
  reset(): void {
    this.metrics = {
      touchResponseTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      paintTime: 0,
      interactionTime: 0,
      seatRenderTime: 0
    };
    this.touchMetrics = [];
    this.frameTimestamps = [];
  }
}

export const mobilePerformanceMonitor = MobilePerformanceMonitor.getInstance(); 