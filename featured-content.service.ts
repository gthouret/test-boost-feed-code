import { filter, first, switchMap, mergeMap, skip, take } from 'rxjs/operators';
import { FeedsService } from './feeds.service';

export class FeaturedContentService {
  offset: number = -1;
  maximumOffset: number = 0;

  constructor(protected feedsService: FeedsService) {
    this.feedsService
      .setLimit(12)
      .setOffset(0)
      .setEndpoint('api/v2/boost/feed')
      .fetch();

    this.feedsService.feed.subscribe(feed => {
      /** RTODO: REmove debug line */
      console.log('BOOST feed.length: ' + feed.length);
      this.maximumOffset = feed.length - 1;
    });
  }

  async fetch() {
    if (this.offset++ >= this.maximumOffset) {
      this.offset = 0;
      this.fetchNextFeed();
    }

    return this.entityFromFeed();
  }

  protected async entityFromFeed() {
    return await this.feedsService.feed
      .pipe(
        filter(item => item.length > 0),
        first(),
        mergeMap(feed => feed),
        skip(this.offset),
        take(1),
        switchMap(async entity => {
          if (!entity) {
            return false;
          }
          return await entity.pipe(first()).toPromise();
        })
      )
      .toPromise();
  }

  protected fetchNextFeed() {
    if (!this.feedsService.inProgress.getValue()) {
      this.feedsService.clear();
      this.feedsService.fetch();
    }
  }
}
