import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Entity } from './entity';
import { EntityCache } from './entity-cache';
import { EntityMapping } from './entity-mapping';

export interface RequestOptions<T extends Entity> {
  /**
   * Provides headers to be added to the HTTP request. See https://angular.io/guide/http.
   */
  headers?: HttpHeaders | { [header: string]: string | string[] };

  /**
   * The observe option specifies how much of the response to return. See https://angular.io/guide/http.
   */
  observe?: 'body' | undefined; // | 'events' | 'response';

  /**
   * Http query parameters to be added to the request. See https://angular.io/guide/http.
   */
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> }

  /**
   * Listen for progress events when transferring large amounts of data? See https://angular.io/guide/http.
   */
  reportProgress?: boolean;

  /**
   * Specifies the format in which to return data. See https://angular.io/guide/http.
   */
  responseType?: 'json' | undefined; // 'arraybuffer' | 'blob' | 'json' | 'text';

  /**
   * See https://angular.io/guide/http.
   */
  withCredentials?: boolean;

  /**
   * Use the alternate end point format to override the end point used.
   */
  endpointFormat?: string;

  /**
   * Data to be passed to the body of a `create` or `put` call.
   *
   * This will take precedence over any data provided via the `entity` or `pathIds` values.
   */
  body?: FormData | any;

  /**
   * Overrides the global cache for this particular request, if a cache is used. Results will
   * be saved back into this cache.
   *
   * If a `sourceCache` is provided, that will be used to find entities if an entity needs to be
   * created, the result would then be stored in into this cache. This allows responses to be
   * mapped to existing entities that exist elsewhere, and to establish relationships with
   * these existing entities.
   */
  cache?: EntityCache<T>;

  /**
   * Look for entities in this cache, if an instance needs to be built. This allows simple relationships
   * to be established where the object already exists within a cache. For examples, the recipients of a
   * message could be users. The json returns the id of the users, and the source cache can then be set
   * to the user cache to retrieve the user object to be stored within the authors cache.
   */
  sourceCache?: EntityCache<T>;

  /**
   * The entity to use in the call.
   *
   * By default the pathIds will be used as the Entity object, but when pathIds
   * does not come directly from the entity this option provides the ability to
   * provide the call with the entity to interact with. When a value is provided
   * this will override the provided pathIds value for handling of the response
   * and data passed in the response.
   */
  entity?: T;

  /**
   * The mapping data to use when mapping the response to the entity. This overrides the service's defaulty mapping data.
   */
  mapping?: EntityMapping<T>;

  /**
   * Ignore these keys during the mapping operation that converts the entity to json.
   */
  ignoreKeys?: string[];

  /**
   * When a query can be read from the cache, should the query return all entity objects from the
   * current cache or only the entity objects previously returned in the query? If nothing
   * is provided, the default response will return `all` values if there is no pathIds + parameters,
   * otherwise it will return those from the `previousQuery`.
   */
  onQueryCacheReturn?: 'all' | 'previousQuery';

  /**
   * This allows you to specify how a cache works in the context of a get reqiuest
   * where there are already entities in the cache.
   *
   * If set to `cacheQuery` then a get will use the query path to determine
   * what to return - if the query has not been run then it will make the get
   * request and return the result. If the query has been run then it will
   * return the result from the cache. This will mean that the get request
   * may occur even if the object is already in the cache.
   *
   * If set to `cacheEntity` then the get request will only occur if the
   * entity is not in the cache. Even if the specific get request has not
   * been performed.
   *
   * For example, if you `query` a cache and populate it with many objects
   * the behaviour of the cache will now differ if you get a single entity.
   * If you run `get(1)`, then with `cacheQuery` this will see that you have
   * not run the get request with the 1 parameter, and so it will perform the
   * get and update the cached entity with the response. When set to
   * `cacheEntity`, the entity will be returned from the cache and no additional
   * get request will be made.
   *
   * The default is `cacheEntity`.
   */
  cacheBehaviourOnGet?: 'cacheQuery' | 'cacheEntity';

  /**
   * Optional constructor parameters to be passed to entity object created from the call. This overrides
   * the constructorParams value from the EntityMapping.
   */
  constructorParams?: any;

  /**
   * Optional callback to call when each entity object mapping has completed. This is useful when using
   * asynchronous operations in the mapping process.
   */
  mappingCompleteCallback?: (entity: T) => void;

  /**
   * Optionally update the entity object with details from the json request in getOrCreate - defaults to true.
   * This is used to ensure that entity objects have the latest fetched details when we can get or create
   * the entity. This request will have the details to create an entity, and this can be used to update the
   * entity object from the cache when it already exists.
   */
  updateOnCacheRead?: boolean;
}
