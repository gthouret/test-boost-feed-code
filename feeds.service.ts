import { EntitiesService } from './entities.service';
import { BlockListService } from './block-list.service';

import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { switchMap, map, tap, first } from 'rxjs/operators';

/**
 * Enables the grabbing of data through observable feeds.
 */
export class FeedsService {
  limit: BehaviorSubject<number> = new BehaviorSubject(12);
  offset: BehaviorSubject<number> = new BehaviorSubject(0);
  pageSize: Observable<number>;
  pagingToken: string = '';
  canFetchMore: boolean = true;
  endpoint: string = '';
  params: any = { sync: 1 };
  castToActivities: boolean = false;

  rawFeed: BehaviorSubject<Object[]> = new BehaviorSubject([]);
  feed: Observable<BehaviorSubject<Object>[]>;
  inProgress: BehaviorSubject<boolean> = new BehaviorSubject(true);
  hasMore: Observable<boolean>;

  response: any;

  constructor(
    protected entitiesService: EntitiesService,
    protected blockListService: BlockListService
  ) {
    this.pageSize = this.offset.pipe(
      map(offset => this.limit.getValue() + offset)
    );

    this.feed = this.rawFeed.pipe(
      tap(feed => {
        if (feed.length) this.inProgress.next(true);
      }),
      switchMap(async feed => {
        return feed.slice(0, await this.pageSize.pipe(first()).toPromise());
      }),
      switchMap(feed =>
        this.entitiesService
          .setCastToActivities(this.castToActivities)
          .getFromFeed(feed)
      ),
      tap(feed => {
        if (feed.length)
          // We should have skipped but..
          this.inProgress.next(false);
      })
    );

    this.hasMore = combineLatest(
      this.rawFeed,
      this.inProgress,
      this.offset
    ).pipe(
      map(values => {
        const feed = values[0];
        const inProgress = values[1];
        const offset = values[2];
        return inProgress || feed.length > offset;
      })
    );
  }

  /**
   * Sets the endpoint for this instance.
   * @param { string } endpoint - the endpoint for this instance. For example `api/v1/entities/owner`.
   */
  setEndpoint(endpoint: string): FeedsService {
    this.endpoint = endpoint;
    return this;
  }

  /**
   * Sets the limit to be returned per next() call.
   * @param { number } limit - the limit to retrieve.
   */
  setLimit(limit: number): FeedsService {
    this.limit.next(limit);
    return this;
  }

  /**
   * Sets parameters to be used.
   * @param { Object } params - parameters to be used.
   */
  setParams(params): FeedsService {
    this.params = params;
    if (!params.sync) {
      this.params.sync = 1;
    }
    return this;
  }

  /**
   * Sets the offset of the request
   * @param { number } offset - the offset of the request.
   */
  setOffset(offset: number): FeedsService {
    this.offset.next(offset);
    return this;
  }

  /**
   * Sets castToActivities
   * @param { boolean } cast - whether or not to set as_activities to true.
   */
  setCastToActivities(cast: boolean): FeedsService {
    this.castToActivities = cast;
    return this;
  }

  /**
   * Fetches the data.
   */
  fetch(): FeedsService {
    console.log('feedService fetch()');
    if (!this.offset.getValue()) {
      this.inProgress.next(true);
    }

    if (!this.offset.getValue()) {
      this.inProgress.next(false);
    }
    if (!this.response.entities && this.response.activity) {
      this.response.entities = this.response.activity;
    }
    if (this.response.entities.length) {
      this.rawFeed.next(this.rawFeed.getValue().concat(this.response.entities));
      this.pagingToken = this.response['load-next'];
    } else {
      this.canFetchMore = false;
    }

    return this;
  }

  /**
   * To be called upload loading more data
   */
  loadMore(): FeedsService {
    if (!this.inProgress.getValue()) {
      this.setOffset(this.limit.getValue() + this.offset.getValue());
      this.rawFeed.next(this.rawFeed.getValue());
    }
    return this;
  }

  /**
   * To clear data.
   */
  clear(): FeedsService {
    this.offset.next(0);
    this.pagingToken = '';
    this.rawFeed.next([]);
    return this;
  }

  /**
   * Set the mock client response
   */
  setResponse(response): FeedsService {
    this.response = response;
    return this;
  }

  async destroy() {}
}
