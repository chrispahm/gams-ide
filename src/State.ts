export type StateRecord = Record<string, unknown>;

export default class State {
  private state: StateRecord;

  constructor() {
    this.state = {};
  }

  update<T = unknown>(key: string, newState: T): void {
    this.state[key] = newState as unknown;
  }

  get<T = unknown>(key: string): T | undefined {
    return this.state[key] as T | undefined;
  }
}