/**
 * Fixed-capacity pool. Live entries occupy a prefix of the array and dead ones are
 * swapped to the tail, so iteration stays contiguous and release is O(1).
 */
export class Pool {
  constructor(capacity, factory) {
    this.items = Array.from({ length: capacity }, factory);
    this.capacity = capacity;
    this.alive = 0;
  }

  spawn() {
    return this.alive >= this.capacity ? null : this.items[this.alive++];
  }

  /** Call while iterating forwards; returns the index to re-examine. */
  releaseAt(i) {
    this.alive--;
    const tmp = this.items[i];
    this.items[i] = this.items[this.alive];
    this.items[this.alive] = tmp;
    return i - 1;
  }

  clear() {
    this.alive = 0;
  }
}
