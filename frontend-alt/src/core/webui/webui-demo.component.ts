/**
 * WebUI Demo Component
 * 
 * Demonstrates Angular <-> Odin backend communication via WebUI
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebUIService } from './webui.service';

@Component({
  selector: 'app-webui-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="webui-demo">
      <h2>🦉 Odin Backend Integration</h2>
      <p class="subtitle">Bidirectional communication with Odin via WebUI</p>
      
      <!-- Status Indicator -->
      <div class="status-bar" [class.connected]="webuiAvailable">
        <span class="status-indicator"></span>
        <span>{{ webuiAvailable ? 'Odin Backend Connected' : 'Standalone Mode' }}</span>
      </div>
      
      <!-- Greeting Section -->
      <div class="section">
        <label for="nameInput">Send to Odin:</label>
        <div class="input-group">
          <input 
            type="text" 
            id="nameInput" 
            [(ngModel)]="name"
            placeholder="Enter your name..."
            (keyup.enter)="sendGreeting()"
          />
          <button (click)="sendGreeting()" [disabled]="loading">
            {{ loading ? '⏳ Sending...' : '🚀 Send to Odin' }}
          </button>
        </div>
        <div class="result" *ngIf="greetingResponse">
          {{ greetingResponse }}
        </div>
      </div>
      
      <!-- Counter Section -->
      <div class="section counter-section">
        <h3>Counter Example</h3>
        <div class="counter-display">{{ counterValue }}</div>
        <div class="button-group">
          <button (click)="incrementCounter()" class="btn-primary">
            ➕ Increment
          </button>
          <button (click)="resetCounter()" class="btn-secondary">
            🔄 Reset
          </button>
        </div>
      </div>
      
      <!-- Backend Messages Section -->
      <div class="section messages-section">
        <h3>Messages from Odin</h3>
        <div class="messages-container">
          <div *ngFor="let msg of messages" class="message" [class.error]="msg.type === 'error'">
            <span class="message-time">{{ msg.time | date:'HH:mm:ss' }}</span>
            <span class="message-text">{{ msg.text }}</span>
          </div>
          <div *ngIf="messages.length === 0" class="no-messages">
            No messages yet
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .webui-demo {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    h2 {
      color: #1e3c72;
      margin-bottom: 5px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 20px;
    }
    
    .status-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 15px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .status-bar.connected {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #9e9e9e;
    }
    
    .status-bar.connected .status-indicator {
      background: #4caf50;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .section {
      margin-bottom: 25px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    label {
      display: block;
      font-weight: 600;
      color: #555;
      margin-bottom: 10px;
    }
    
    .input-group {
      display: flex;
      gap: 10px;
    }
    
    input[type="text"] {
      flex: 1;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    
    input[type="text"]:focus {
      outline: none;
      border-color: #1e3c72;
    }
    
    button {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    button:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    button:not(:disabled):active {
      transform: translateY(0);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .result {
      margin-top: 15px;
      padding: 15px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
      font-weight: 500;
      text-align: center;
    }
    
    .counter-section {
      text-align: center;
    }
    
    .counter-display {
      font-size: 64px;
      font-weight: bold;
      color: #1e3c72;
      margin: 20px 0;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    
    .messages-section {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .message {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .message.error {
      background: #ffebee;
      color: #c62828;
    }
    
    .message-time {
      font-weight: 600;
      color: #999;
      white-space: nowrap;
    }
    
    .no-messages {
      text-align: center;
      color: #999;
      padding: 20px;
    }
  `],
})
export class WebUIDemoComponent implements OnInit, OnDestroy {
  webuiAvailable = false;
  loading = false;
  name = 'Angular Developer';
  greetingResponse = '';
  counterValue = 0;
  messages: Array<{ time: Date; text: string; type?: 'info' | 'error' }> = [];
  
  private backendUnsubscribe?: () => void;

  constructor(private webuiService: WebUIService) {}

  ngOnInit(): void {
    this.webuiAvailable = this.webuiService.isAvailable();
    
    // Subscribe to backend events
    this.backendUnsubscribe = this.webuiService.on('backend:message', (data) => {
      this.addMessage(data.text || 'Unknown message');
    });
    
    // Listen for counter updates
    this.webuiService.on('backend:counter', (data) => {
      if (typeof data.value === 'number') {
        this.counterValue = data.value;
      }
    });
  }

  ngOnDestroy(): void {
    this.backendUnsubscribe?.();
  }

  async sendGreeting(): Promise<void> {
    if (!this.name.trim()) {
      this.addMessage('Please enter a name', 'error');
      return;
    }
    
    this.loading = true;
    try {
      const response = await this.webuiService.send<string>('greet', this.name);
      if (response.success && response.data) {
        this.greetingResponse = response.data;
        this.addMessage(`Greeting sent: ${this.name}`);
      }
    } catch (error) {
      console.error('Error sending greeting:', error);
      this.greetingResponse = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.addMessage('Failed to send greeting', 'error');
    } finally {
      this.loading = false;
    }
  }

  async incrementCounter(): Promise<void> {
    try {
      const response = await this.webuiService.send<number>('incrementCounter');
      if (response.success && typeof response.data === 'number') {
        this.counterValue = response.data;
      }
    } catch (error) {
      // Simulate increment in standalone mode
      this.counterValue++;
      this.addMessage('Counter incremented (standalone mode)');
    }
  }

  resetCounter(): void {
    this.counterValue = 0;
    this.addMessage('Counter reset');
  }

  private addMessage(text: string, type: 'info' | 'error' = 'info'): void {
    this.messages.unshift({ time: new Date(), text, type });
    // Keep only last 50 messages
    if (this.messages.length > 50) {
      this.messages.pop();
    }
  }
}
