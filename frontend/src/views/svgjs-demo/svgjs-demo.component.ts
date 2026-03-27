import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal } from '@angular/core';
import SVG from 'svg.js';
import { SvgjsAnimationManager } from './svgjs-demo.animations';
import { DEMOS, DEMO_RENDERERS, playAnimation, getDemoName, getDemoIcon } from './svgjs-demo.demos';

@Component({
  selector: 'app-svgjs-demo',
  standalone: true,
  templateUrl: './svgjs-demo.component.html',
  styleUrl: './svgjs-demo.component.css'
})
export class SvgjsDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;

  demos = DEMOS;
  selectedDemo = signal<string>('basic-shapes');
  isCanvasOpen = signal<boolean>(false);

  private draw: any = null;
  private animationManager: SvgjsAnimationManager;
  private elements: any[] = [];

  constructor() {
    this.animationManager = new SvgjsAnimationManager();
  }

  ngAfterViewInit() {
    this.initCanvas();
  }

  ngOnDestroy() {
    this.clearCanvas();
  }

  initCanvas() {
    const container = document.getElementById('svg-canvas');
    if (container) {
      this.clearCanvas();
      this.draw = SVG('svg-canvas').size('100%', '100%');
      this.renderDemo();
    }
  }

  clearCanvas() {
    if (this.draw) {
      this.draw.clear();
      this.elements = [];
      this.animationManager.stopAll();
    }
  }

  getCurrentDemoName(): string {
    return getDemoName(this.selectedDemo());
  }

  selectDemo(demoId: string) {
    this.selectedDemo.set(demoId);
    this.renderDemo();
    // On mobile, open canvas when demo is selected
    if (window.innerWidth <= 768) {
      this.isCanvasOpen.set(true);
    }
  }

  getDemoIcon(demoId: string): string {
    return getDemoIcon(demoId);
  }

  openCanvas() {
    this.isCanvasOpen.set(true);
    setTimeout(() => this.initCanvas(), 100);
  }

  closeCanvas() {
    this.isCanvasOpen.set(false);
  }

  renderDemo() {
    if (!this.draw) return;

    this.clearCanvas();
    const demoId = this.selectedDemo();

    const renderer = DEMO_RENDERERS[demoId];
    if (renderer) {
      const container = document.getElementById('svg-canvas');
      const dimensions = container 
        ? { width: container.clientWidth, height: container.clientHeight }
        : { width: 800, height: 600 };
      
      renderer(this.draw, dimensions);
    }
  }

  playAnimation() {
    if (this.elements.length === 0) return;
    playAnimation(this.elements);
  }

  pauseAnimation() {
    this.animationManager.stopAll();
  }

  resetAnimation() {
    this.renderDemo();
  }
}
