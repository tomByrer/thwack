// TODO make this extend CustomEvent and use EventTarget some day?
export default class ThwackEvent {
  constructor(type) {
    this.type = type;
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  // eslint-disable-next-line class-methods-use-this
  stopPropagation() {
    this.propagationStopped = true;
  }
}
