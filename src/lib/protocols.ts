export type Mode = "user" | "previleged" | "config";

export interface SessionState {
  mode: Mode;
}

export type Tone = "normal" | "muted" | "accent" | "error";

export interface OutputLine {
  text: string;
  tone?: Tone;
}

export type TerminalAction =
  | {
      type: "navigate";
      href: string;
    }
  | {
      type: "clear";
    }
  | {
      type: "close";
    }
  | {
      type: "theme";
      value: "light" | "dark";
    };
