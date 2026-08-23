import EventEmitter from 'events';

export class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  publish(eventName, payload) {
    this.emitter.emit(eventName, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  on(eventName, handler) {
    this.emitter.on(eventName, handler);
    return () => this.emitter.off(eventName, handler);
  }

  once(eventName, handler) {
    this.emitter.once(eventName, handler);
  }

  off(eventName, handler) {
    this.emitter.off(eventName, handler);
  }
}

export const defaultEventBus = new EventBus();
export default defaultEventBus;
