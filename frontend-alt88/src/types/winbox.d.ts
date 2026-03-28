interface Window {
  WinBox: {
    new (options?: {
      title?: string;
      background?: string;
      width?: string | number;
      height?: string | number;
      x?: string | number;
      y?: string | number;
      html?: string;
      onfocus?: () => void;
      onblur?: () => void;
      onclose?: () => void;
      onresize?: () => void;
      onmaximize?: () => void;
      onminimize?: () => void;
      onrestore?: () => void;
      id?: string;
      class?: string;
      index?: number;
      mount?: HTMLElement;
    }): {
      setTitle(title: string): this;
      setBackground(background: string): this;
      setUrl(url: string): this;
      focus(): this;
      blur(): this;
      close(force?: boolean): this;
      maximize(): this;
      minimize(): this;
      restore(): this;
      resize(width: number, height: number): this;
      move(x: number, y: number): this;
      hide(): this;
      show(): this;
      body: HTMLElement;
    };
  };
}
