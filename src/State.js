module.exports = class State {
  constructor() {
    this.state = {};
  }

  update(key, newState) {
    this.state[key] = newState;
  }

  get(key) {
    return this.state[key];
  }
}