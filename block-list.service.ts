import { BehaviorSubject } from 'rxjs';

export class BlockListService {
  blocked: BehaviorSubject<string[]>;

  constructor() {
    this.blocked = new BehaviorSubject(JSON.parse('["991463054707265537"]'));
    this.fetch();
  }

  fetch() {
    return this;
  }

  async sync() {}

  async prune() {}

  async get() {}

  async getList() {
    return this.blocked.getValue();
  }
}
