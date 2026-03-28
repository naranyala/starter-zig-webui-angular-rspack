/**
 * SVG.js Demo Animations
 * Animation definitions and utilities for SVG.js demos
 */

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
  iterations?: number;
}

export interface AnimatedElement {
  element: any;
  animation?: any;
  type: string;
}

export class SvgjsAnimationManager {
  private animations: Map<string, any> = new Map();

  /**
   * Create a move animation for an SVG element
   */
  animateMove(
    element: any,
    targetX: number,
    targetY: number,
    config: AnimationConfig = { duration: 2000 }
  ): any {
    const { duration = 2000, delay = 0, easing = '<>' } = config;
    
    return element.animate(duration, delay).ease(easing).move(targetX, targetY);
  }

  /**
   * Create a bounce animation (move back and forth)
   */
  animateBounce(
    element: any,
    startX: number,
    endX: number,
    y: number,
    config: AnimationConfig = { duration: 2000 }
  ): any {
    const { duration = 2000, delay = 0, easing = '<>' } = config;
    
    const forward = element.animate(duration, delay).ease(easing).move(endX, y);
    const backward = element.animate(duration, delay + duration).ease(easing).move(startX, y);
    
    return { forward, backward };
  }

  /**
   * Create a rotation animation
   */
  animateRotation(
    element: any,
    degrees: number = 360,
    centerX?: number,
    centerY?: number,
    config: AnimationConfig = { duration: 2000 }
  ): any {
    const { duration = 2000, delay = 0, easing = '<>' } = config;
    
    if (centerX !== undefined && centerY !== undefined) {
      return element.animate(duration, delay).ease(easing).rotate(degrees, centerX, centerY);
    }
    return element.animate(duration, delay).ease(easing).rotate(degrees);
  }

  /**
   * Create a scale animation
   */
  animateScale(
    element: any,
    scale: number = 1.5,
    config: AnimationConfig = { duration: 500 }
  ): any {
    const { duration = 500, delay = 0, easing = '<>' } = config;
    
    return element.animate(duration, delay).ease(easing).scale(scale);
  }

  /**
   * Create a color transition animation
   */
  animateColor(
    element: any,
    targetColor: string,
    config: AnimationConfig = { duration: 500 }
  ): any {
    const { duration = 500, delay = 0 } = config;
    
    return element.animate(duration, delay).fill(targetColor);
  }

  /**
   * Create a fade animation
   */
  animateFade(
    element: any,
    targetOpacity: number = 0,
    config: AnimationConfig = { duration: 500 }
  ): any {
    const { duration = 500, delay = 0 } = config;
    
    return element.animate(duration, delay).opacity(targetOpacity);
  }

  /**
   * Create a combined animation (move + rotate + scale)
   */
  animateCombined(
    element: any,
    targetX: number,
    targetY: number,
    rotation: number = 0,
    scale: number = 1,
    config: AnimationConfig = { duration: 2000 }
  ): any {
    const { duration = 2000, delay = 0, easing = '<>' } = config;
    const animation = element.animate(duration, delay).ease(easing);
    
    animation.move(targetX, targetY);
    if (rotation !== 0) {
      animation.rotate(rotation);
    }
    if (scale !== 1) {
      animation.scale(scale);
    }
    
    return animation;
  }

  /**
   * Create a sequential animation chain
   */
  animateSequence(
    element: any,
    steps: Array<{
      action: string;
      params: any[];
      duration: number;
      delay?: number;
    }>
  ): any[] {
    const animations: any[] = [];
    let cumulativeDelay = 0;
    
    for (const step of steps) {
      const { action, params, duration, delay = 0 } = step;
      cumulativeDelay += delay;
      
      const animation = element.animate(duration, cumulativeDelay);
      animations.push(animation);
      
      // Apply the action
      if (animation[action]) {
        animation[action](...params);
      }
      
      cumulativeDelay += duration;
    }
    
    return animations;
  }

  /**
   * Pause an animation
   */
  pauseAnimation(animation: any): void {
    if (animation && animation.pause) {
      animation.pause();
    }
  }

  /**
   * Resume an animation
   */
  resumeAnimation(animation: any): void {
    if (animation && animation.resume) {
      animation.resume();
    }
  }

  /**
   * Stop an animation
   */
  stopAnimation(animation: any): void {
    if (animation && animation.stop) {
      animation.stop();
    }
  }

  /**
   * Stop all tracked animations
   */
  stopAll(): void {
    this.animations.forEach(animation => {
      if (animation.stop) {
        animation.stop();
      }
    });
    this.animations.clear();
  }

  /**
   * Track an animation for later management
   */
  track(id: string, animation: any): void {
    this.animations.set(id, animation);
  }

  /**
   * Remove a tracked animation
   */
  untrack(id: string): void {
    this.animations.delete(id);
  }
}

/**
 * Preset animation configurations
 */
export const AnimationPresets = {
  quick: { duration: 300, easing: '<>' },
  normal: { duration: 1000, easing: '<>' },
  slow: { duration: 2000, easing: '<>' },
  bounce: { duration: 1500, easing: '<>' },
  elastic: { duration: 2000, easing: '<>' },
};

/**
 * Create a bouncing animation for demo elements
 */
export function createBouncingAnimation(
  element: any,
  startX: number,
  endX: number,
  y: number,
  duration: number = 2000
): void {
  element.animate(duration, 0).ease('<>').move(endX, y);
  element.animate(duration, duration).ease('<>').move(startX, y);
}

/**
 * Create a rotating animation for demo elements
 */
export function createRotatingAnimation(
  element: any,
  rotations: number = 1,
  duration: number = 2000
): void {
  element.animate(duration, 0).ease('<>').rotate(360 * rotations);
}

/**
 * Create a pulsing animation (scale up and down)
 */
export function createPulsingAnimation(
  element: any,
  scale: number = 1.2,
  duration: number = 1000
): void {
  element.animate(duration / 2, 0).ease('<>').scale(scale);
  element.animate(duration / 2, duration / 2).ease('<>').scale(1);
}
