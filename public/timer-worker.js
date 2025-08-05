class TimerWorker {
  constructor() {
    this.timerId = null;
    this.startTime = 0;
    this.duration = 0;
    this.remainingTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    
    // Drift correction variables
    this.expectedTime = 0;
    this.lastTickTime = 0;
  }

  start(durationSeconds) {
    this.duration = durationSeconds;
    this.remainingTime = durationSeconds;
    this.startTime = performance.now();
    this.expectedTime = this.startTime + 1000;
    this.lastTickTime = this.startTime;
    this.isRunning = true;
    this.isPaused = false;
    
    this.tick();
    
    self.postMessage({
      type: 'timer-started',
      remainingTime: this.remainingTime,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }

  pause() {
    this.isRunning = false;
    this.isPaused = true;
    
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    self.postMessage({
      type: 'timer-paused',
      remainingTime: this.remainingTime,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }

  resume() {
    if (!this.isPaused) return;
    
    this.startTime = performance.now();
    this.expectedTime = this.startTime + 1000;
    this.lastTickTime = this.startTime;
    this.isRunning = true;
    this.isPaused = false;
    
    this.tick();
    
    self.postMessage({
      type: 'timer-resumed',
      remainingTime: this.remainingTime,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.remainingTime = 0;
    
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    self.postMessage({
      type: 'timer-stopped',
      remainingTime: this.remainingTime,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }

  reset(durationSeconds) {
    this.stop();
    this.duration = durationSeconds;
    this.remainingTime = durationSeconds;
    
    self.postMessage({
      type: 'timer-reset',
      remainingTime: this.remainingTime,
      isRunning: false,
      isPaused: false
    });
  }

  tick() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    
    // Calculate drift and adjust
    const drift = currentTime - this.expectedTime;
    const adjustedInterval = Math.max(0, 1000 - drift);
    
    // Update remaining time based on actual elapsed time
    const elapsedSinceLastTick = currentTime - this.lastTickTime;
    if (elapsedSinceLastTick >= 1000) {
      this.remainingTime = Math.max(0, this.remainingTime - 1);
      this.lastTickTime = currentTime;
      
      self.postMessage({
        type: 'timer-tick',
        remainingTime: this.remainingTime,
        isRunning: this.isRunning,
        isPaused: this.isPaused
      });
      
      if (this.remainingTime <= 0) {
        self.postMessage({
          type: 'timer-completed',
          remainingTime: 0,
          isRunning: false,
          isPaused: false
        });
        this.stop();
        return;
      }
    }
    
    // Schedule next tick with drift correction
    this.expectedTime += 1000;
    this.timerId = setTimeout(() => this.tick(), adjustedInterval);
  }
}

const timer = new TimerWorker();

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'start':
      timer.start(payload.duration);
      break;
    case 'pause':
      timer.pause();
      break;
    case 'resume':
      timer.resume();
      break;
    case 'stop':
      timer.stop();
      break;
    case 'reset':
      timer.reset(payload.duration);
      break;
  }
};