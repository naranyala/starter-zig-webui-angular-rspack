/**
 * SVG.js Demo Definitions
 * Demo configurations and rendering functions
 */

import SVG from 'svg.js';
import {
  createBouncingAnimation,
  createRotatingAnimation,
  AnimationPresets,
} from './svgjs-demo.animations';

export interface DemoItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface DemoRenderer {
  (draw: any, container: { width: number; height: number }): void;
}

/**
 * Demo icon mapping
 */
export const DEMO_ICONS: Record<string, string> = {
  'basic-shapes': '◼',
  'animations': '◉',
  'gradients': '◐',
  'paths': '✎',
  'text': 'T',
  'interactivity': '⚡',
};

/**
 * Available demos configuration
 */
export const DEMOS: DemoItem[] = [
  { id: 'basic-shapes', name: 'Basic Shapes', description: 'Rectangles, circles, ellipses', icon: DEMO_ICONS['basic-shapes'] },
  { id: 'animations', name: 'Animations', description: 'Move, scale, rotate animations', icon: DEMO_ICONS['animations'] },
  { id: 'gradients', name: 'Gradients', description: 'Linear and radial gradients', icon: DEMO_ICONS['gradients'] },
  { id: 'paths', name: 'Paths', description: 'Custom path drawings', icon: DEMO_ICONS['paths'] },
  { id: 'text', name: 'Text', description: 'Styled text elements', icon: DEMO_ICONS['text'] },
  { id: 'interactivity', name: 'Interactivity', description: 'Click and hover events', icon: DEMO_ICONS['interactivity'] },
];

/**
 * Demo registry mapping demo IDs to render functions
 */
export const DEMO_RENDERERS: Record<string, DemoRenderer> = {
  'basic-shapes': renderBasicShapes,
  'animations': renderAnimations,
  'gradients': renderGradients,
  'paths': renderPaths,
  'text': renderText,
  'interactivity': renderInteractivity,
};

/**
 * Render basic shapes demo
 */
function renderBasicShapes(draw: any, container: { width: number; height: number }): void {
  const centerX = container.width / 2;
  const centerY = container.height / 2;
  const size = 60;

  // Rectangle
  const rect = draw.rect(size, size).move(centerX - size / 2, centerY - size / 2);
  rect.fill('#3b82f6').stroke({ width: 3, color: '#60a5fa' });

  // Circle
  const circle = draw.circle(size).move(centerX - size / 2, centerY + size / 2 + 20);
  circle.fill('#10b981').stroke({ width: 3, color: '#34d399' });

  // Ellipse
  const ellipse = draw.ellipse(size * 1.5, size * 0.8).move(centerX - size * 0.75, centerY - size - 30);
  ellipse.fill('#f59e0b').stroke({ width: 3, color: '#fbbf24' });

  // Polygon (triangle)
  const triangle = draw.polygon(`${size/2},0 ${size},${size} 0,${size}`);
  triangle.move(centerX + size / 2 + 30, centerY - size / 2);
  triangle.fill('#ef4444').stroke({ width: 3, color: '#f87171' });

  // Line
  const line = draw.line(0, 0, size * 2, size * 0.5);
  line.move(centerX - size, centerY + size);
  line.stroke({ width: 4, color: '#8b5cf6', linecap: 'round' });
}

/**
 * Render animations demo
 */
function renderAnimations(draw: any, container: { width: number; height: number }): void {
  const size = 60;

  // Create animated rectangle
  const rect = draw.rect(size, size).move(50, 250);
  rect.fill('#3b82f6').stroke({ width: 2, color: '#60a5fa' });

  // Create animated circle
  const circle = draw.circle(size).move(375, 250);
  circle.fill('#10b981').stroke({ width: 2, color: '#34d399' });

  // Create animated ellipse
  const ellipse = draw.ellipse(size * 1.2, size * 0.7).move(150, 100);
  ellipse.fill('#f59e0b').stroke({ width: 2, color: '#fbbf24' });

  // Start animations
  playAnimation([rect, circle, ellipse]);
}

/**
 * Render gradients demo
 */
function renderGradients(draw: any, container: { width: number; height: number }): void {
  const centerX = container.width / 2;
  const centerY = container.height / 2;
  const size = 90;

  // Linear gradient
  const linearGradient = draw.gradient('linear', (stop: any) => {
    stop.at(0, '#3b82f6');
    stop.at(100, '#8b5cf6');
  });

  const rect1 = draw.rect(size, size * 0.8).move(centerX - size - 20, centerY - size / 2);
  rect1.fill(linearGradient);

  // Radial gradient
  const radialGradient = draw.gradient('radial', (stop: any) => {
    stop.at(0, '#10b981');
    stop.at(100, '#059669');
  });

  const circle = draw.circle(size).move(centerX - size / 2, centerY - size / 2);
  circle.fill(radialGradient);

  // Another linear gradient
  const gradient2 = draw.gradient('linear', (stop: any) => {
    stop.at(0, '#f59e0b');
    stop.at(50, '#ef4444');
    stop.at(100, '#8b5cf6');
  });

  const rect2 = draw.rect(size, size * 0.8).move(centerX + 20, centerY - size / 2);
  rect2.fill(gradient2);
}

/**
 * Render paths demo
 */
function renderPaths(draw: any, container: { width: number; height: number }): void {
  const centerX = container.width / 2;
  const centerY = container.height / 2;

  // Heart path
  const heartPath = draw.path('M 200,300 C 100,200 50,150 50,100 A 50,50 0 0,1 150,50 C 200,100 250,50 300,50 A 50,50 0 0,1 400,100 C 400,150 350,200 250,300 Q 200,350 200,300 Z');
  heartPath.move(centerX - 150, centerY - 150);
  heartPath.fill('#ef4444').stroke({ width: 3, color: '#f87171' });

  // Star path
  const starPath = draw.path('M 50,0 L 61,35 L 98,35 L 68,57 L 79,91 L 50,70 L 21,91 L 32,57 L 2,35 L 39,35 Z');
  starPath.move(centerX + 50, centerY - 100);
  starPath.fill('#f59e0b').stroke({ width: 3, color: '#fbbf24' });

  // Curve path
  const curvePath = draw.path('M 100,350 C 150,250 250,350 300,250 S 450,250 500,350');
  curvePath.move(centerX - 250, centerY);
  curvePath.fill('none').stroke({ width: 4, color: '#3b82f6', linecap: 'round' });
}

/**
 * Render text demo
 */
function renderText(draw: any, container: { width: number; height: number }): void {
  const centerX = container.width / 2;
  const centerY = container.height / 2;

  // Main title
  const title = draw.text('SVG.js');
  title.move(centerX - 80, centerY - 50);
  title.fill('#3b82f6');
  title.font({ size: 48, weight: 'bold', family: 'system-ui' });

  // Subtitle
  const subtitle = draw.text('JavaScript SVG Library');
  subtitle.move(centerX - 100, centerY + 20);
  subtitle.fill('#94a3b8');
  subtitle.font({ size: 18, family: 'system-ui' });

  // Styled text with opacity
  const styled = draw.text('Create • Animate • Style');
  styled.move(centerX - 110, centerY + 60);
  styled.fill('#10b981');
  styled.font({ size: 16, family: 'system-ui' });
  styled.opacity(0.8);
}

/**
 * Render interactivity demo
 */
function renderInteractivity(draw: any, container: { width: number; height: number }): void {
  const centerX = container.width / 2;
  const centerY = container.height / 2;
  const size = 80;

  // Interactive circle
  const circle = draw.circle(size).move(centerX - size / 2, centerY - size / 2);
  circle.fill('#3b82f6').stroke({ width: 3, color: '#60a5fa' });
  circle.style('cursor', 'pointer');

  circle.click(() => {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    circle.fill(randomColor);
  });

  circle.mouseover(() => {
    circle.scale(1.1);
  });

  circle.mouseout(() => {
    circle.scale(1);
  });

  // Interactive rectangle
  const rect = draw.rect(size, size * 0.8).move(centerX - size / 2, centerY + size / 2);
  rect.fill('#10b981').stroke({ width: 3, color: '#34d399' });
  rect.style('cursor', 'pointer');

  rect.click(() => {
    rect.animate(500).rotate(360, centerX, centerY + size * 0.4);
  });

  rect.mouseover(() => {
    rect.fill('#059669');
  });

  rect.mouseout(() => {
    rect.fill('#10b981');
  });

  // Click hint text
  const hint = draw.text('Click shapes to interact!');
  hint.move(centerX - 90, centerY - size - 30);
  hint.fill('#94a3b8');
  hint.font({ size: 14, family: 'system-ui' });
}

/**
 * Play animation for a list of elements
 */
export function playAnimation(elements: any[]): void {
  const duration = 2000;

  elements.forEach((el, index) => {
    if (el.type === 'rect' || el.type === 'circle' || el.type === 'ellipse') {
      const delay = index * 200;
      const bbox = el.bbox();
      const startY = bbox.y;

      el.animate(duration, delay).ease('<>').move(600 - bbox.width / 2, startY);
      el.animate(duration, delay + duration).ease('<>').move(50, startY);

      // Add rotation for variety
      if (el.type === 'rect') {
        el.animate(duration * 2, delay).ease('<>').rotate(360);
      }
    }
  });
}

/**
 * Get demo by ID
 */
export function getDemoById(demoId: string): DemoItem | undefined {
  return DEMOS.find(d => d.id === demoId);
}

/**
 * Get demo name by ID
 */
export function getDemoName(demoId: string): string {
  return getDemoById(demoId)?.name || 'SVG.js Demo';
}

/**
 * Get demo icon by ID
 */
export function getDemoIcon(demoId: string): string {
  return DEMO_ICONS[demoId] || '•';
}
