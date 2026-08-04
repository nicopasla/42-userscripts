export interface ButtonState {
  loading: boolean;
  success: boolean;
  error: boolean;
  text: string;
}

export interface AccountState {
  login: string | null;
  token: string;
  activeSessions: number;
  needsReconnect: boolean;
  restrictActivation: boolean;
  buttons: {
    push: ButtonState;
    pull: ButtonState;
  };
}

export function createInitialState(): AccountState {
  return {
    login: null,
    token: "",
    activeSessions: 0,
    needsReconnect: false,
    restrictActivation: true,
    buttons: {
      push: {
        loading: false,
        success: false,
        error: false,
        text: "Push Settings",
      },
      pull: {
        loading: false,
        success: false,
        error: false,
        text: "Pull Settings",
      },
    },
  };
}

export function resetButtonState(
  state: AccountState,
  button: "push" | "pull",
  text: string,
) {
  state.buttons[button] = {
    loading: false,
    success: false,
    error: false,
    text,
  };
}
