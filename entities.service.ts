import { BehaviorSubject, Observable, of } from 'rxjs';
import { first, catchError } from 'rxjs/operators';
import { BlockListService } from './block-list.service';

type EntityObservable = BehaviorSubject<Object>;
type EntityObservables = Map<string, EntityObservable>;

export class EntitiesService {
  entities: EntityObservables = new Map<string, EntityObservable>();
  castToActivites: boolean = false;

  constructor(
    protected blockListService: BlockListService
  ) {}

  async getFromFeed(feed): Promise<EntityObservable[]> {
    if (!feed || !feed.length) {
      return [];
    }

    const blockedGuids = await this.blockListService.blocked.pipe(first()).toPromise();
    const urnsToFetch = [];
    const urnsToResync = [];
    const entities = [];

    for (const feedItem of feed) {
      if (feedItem.entity) {
        this.addEntity(feedItem.entity);
      }
      if (!this.entities.has(feedItem.urn)) {
        urnsToFetch.push(feedItem.urn);
      }
      if (
        this.entities.has(feedItem.urn) &&
        !feedItem.entity &&
        feed.length < 20
      ) {
        urnsToResync.push(feedItem.urn);
      }
    }

    for (const feedItem of feed) {
      if (
        this.entities.has(feedItem.urn) &&
        (!blockedGuids || blockedGuids.indexOf(feedItem.owner_guid) < 0)
      ) {
        const entity = this.entities.get(feedItem.urn);
        try {
          if (await entity.pipe(first()).toPromise()) {
            entities.push(entity);
          }
        } catch (err) {}
      }
    }

    return entities;
  }

  /**
   * Cast to activities or not
   * @param cast boolean
   * @return EntitiesService
   */
  setCastToActivities(cast: boolean): EntitiesService {
    this.castToActivites = cast;
    return this;
  }

  /**
   * Add or resync an entity
   * @param entity
   * @return void
   */
  addEntity(entity): void {
    if (this.entities.has(entity.urn)) {
      this.entities.get(entity.urn).next(entity);
    } else {
      this.entities.set(entity.urn, new BehaviorSubject(entity));
    }
  }

  /**
   * Register a urn as not found
   * @param urn string
   * @return void
   */
  addNotFoundEntity(urn): void {
    if (!this.entities.has(urn)) {
      this.entities.set(urn, new BehaviorSubject(null));
    }
    this.entities.get(urn).error('Not found');
  }
}
