import { BehaviorSubject, Observable, of, Subject } from "rxjs";
import { map, tap } from "rxjs/operators";
import { Entity } from "./entity";
import { EntityService } from "./entity.service";
import { RequestOptions } from "./request-options";

/**
 * The Query Data keeps track of each query and associated reponses.
 * This includes the time the query expires, and all of the entities
 * that were returned from this query. This is used by the cache to
 * manage reqeat queries within the query's expiry time.
 *
 * @typeParam T The kind of entity returned by the query.
 */
class QueryData<T> {
  /**
   * The URI path used to query the server.
   */
  public pathKey: string;

  /**
   * The time that this query will expire.
   */
  public expireAt: Date;

  /**
   * The entity objects that were returned from the query.
   */
  public response: T | T[];

  /**
   * Creates a new QueryData object for the indicated path, time, and response.
   *
   * @param pathKey The URI path used to query the server.
   * @param ttl the time to live for the query.
   * @param data the response from the query
   */
  public constructor(pathKey: string, ttl: number, data: T | T[]) {
    this.pathKey = pathKey;
    this.expireAt = new Date(new Date().getTime() + ttl);
    this.response = data;
  }

  /**
   * Indicates if this query response data has passed its
   * cache duration.
   *
   * @returns false if the query data is still valid to use.
   */
  public get hasExpired() : boolean {
    // Using get time here for clarity...
    // The Query has expired if the current time is larger than the expire at time
    return new Date().getTime() > this.expireAt.getTime();
  }
}

/**
 * The Entity Cache is used to store the results of queries made to the server.
 * Each query made, and its response objects, will be stored in the cache. Repeating
 * a query within the cache's expiry time will return the cached response, and not
 * make the request to the server.
 *
 * @typeParam T The kind of entity stored in the cache.
 */
export class EntityCache<T extends Entity> {
  /**
   * The data store for the cache.
   */
  private cache: Map<string | number, T> = new Map<string | number, T>();

  /**
   * An array based copy of the data from the cache. Used to optimise the use
   * of the current values property.
   */
  private cacheArray: T[] = [];

  /**
   * All of the queries made to the server, and their associated responses.
   */
  private queryKeys: Map<string, QueryData<T>> = new Map<string, QueryData<T>>();

  /**
   * The time to live for all queries in the cache. This defaults to 24 hours.
   * Time is in milliseconds.
   */
  private cacheExpiryTime: number = 86400000; // 24 hours

  /**
   * The subject used to emit events that occur when the cache changes.
   */
  private cacheSubject: Subject<T[]> = new BehaviorSubject<T[]>( [] );

  /**
   * When true, dont announce via the cache subject, but do update the cache.
   */
  private dontAnnounce: boolean = false;

  /**
   * The time to live for all queries in the cache. This defaults to 24 hours.
   */
  public get cacheExpiryMilliseconds(): number {
    return this.cacheExpiryTime;
  }

  /**
   * Change the time to live for all future queries. This defaults to 24 hours.
   */
  public set cacheExpiryMilliseconds(value: number) {
    this.cacheExpiryTime = value;
  }

  /**
   * Fetch an Entity from the cache using its key.
   *
   * @param key the key for the entity
   * @returns the entity associated with the key, or undefined if not found.
   */
  public get(key: string | number) : T | undefined {
    return this.cache.get(key);
  }

  /**
   * Indicates if the cache has a value for the key.
   *
   * @param key the key for the entity to check.
   * @returns true if the cache contains an entity with that key
   */
  public has(key: string | number) : boolean {
    return this.cache.has(key);
  }

  /**
   * Add an entity to the cache.
   *
   * @param entity the entity to add to the cache.
   */
  public add(entity: T): void {
    this.set(entity.key, entity);
  }

  /**
   * Retrieve an object from the cache, or create it using the passed in data.
   *
   * @param key the key for the entity to find or create (must also be present in the data in case of object creation)
   * @param service the service associated with the creation of these entities
   * @param data the json data to pass to the object when created
   * @param options any request options needed to pass data to the entity construction process (eg constructorParams and mappingCompleteCallback)
   * @returns
   */
  public getOrCreate(key: string | number, service: EntityService<T>, data: object, options?: RequestOptions<T>): T {
    let entity: T;
    if ( this.has(key) ) {
      entity = this.get(key) as T;
      if (options?.updateOnCacheRead !== false) {
        entity.updateFromJson(data, service.mapping);
      }
    } else {
      // Create the instance with no request options, using the mapping parameters
      entity = service.buildInstance(data, options);
      this.set(key, entity);
    }

    return entity;
  }

  /**
   * Update the internal cache array and notify cache observers.
   */
  private updateCacheArray(notifyObservers: boolean = true): void {
    this.cacheArray = Array.from(this.cache.values());
    if (notifyObservers) {
      this.cacheSubject.next(this.currentValuesClone());
    }
  }

  /**
   * Return an observable that publishes all changes to the cache.
   *
   * This is a long running observable which will need to be unsubscribed!
   */
  public get values() : Observable<T[]> {
    return this.cacheSubject;
  }

  /**
   * Returns all values in the cache. Use @see currentValuesClone for a mutable array copy.
   *
   * @returns an immutable array with the contents of the cache.
   */
  public get currentValues(): readonly T[] {
    return this.cacheArray;
  }

  /**
   * Returns a mutable clone of the current values in the cache. Where possible consider using
   * @see currentValues instead.
   *
   * @returns a clone of the current values from the cache.
   */
  public currentValuesClone(): T[] {
    return Array.from(this.cacheArray);
  }

  /**
   * Stores or updates an entity within the cache.
   *
   * @param key the key for the entity to store
   * @param entity the entity to store in the cache
   */
  public set(key: string | number, entity: T): void {
    this.cache.set(key, entity);

    if ( !this.dontAnnounce ) {
      this.updateCacheArray();
    }
  }

  /**
   * Remove an entity from the cache, based on its key.
   *
   * @param entity is either the key of entity, or the entity itself, to remove from cache
   * @returns true on success
   */
  public delete(entity: string | number | T) : boolean {
    let key: string | number;
    if ( typeof entity === "string" || typeof entity === "number" ) {
      key = entity;
    } else {
      key = entity.key;
    }

    const result = this.cache.delete(key);
    if (result && !this.dontAnnounce) {
      this.updateCacheArray();
    }

    return result;
  }

  /**
   * Returns the number of entities in the cache.
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Clears the cache and all of its queries.
   */
  public clear() : void {
    this.cache.clear();
    this.queryKeys.clear();
    this.cacheArray = [];
    this.cacheSubject.next([]);
  }

  /**
   * Registers a query with the cache. The query values will be stored in the cache along
   * with the query details. If the query is run again then the previous response will be returned.
   *
   * @param pathKey the path for the query
   * @param response the observer of the data returned from the query
   * @returns the observer of the response
   */
  public registerQuery(pathKey: string, response: Observable<T[]>, options?: RequestOptions<T>): Observable<T[]> {
    return response.pipe(
      tap((entityList) => {
        // Dont announce all intermediate changes... just the final one.
        this.dontAnnounce = true;
        this.queryKeys.set(pathKey, new QueryData(pathKey, this.cacheExpiryTime, entityList));

        entityList.forEach((entity) => {
          this.set(entity.key, entity);
        });

        // Finished... so now announce all changes.
        this.dontAnnounce = false;
        this.updateCacheArray();
      }),

      // Map the response based on the cache hit return value
      map((entityList) => {
        if ( options?.onQueryCacheReturn === "all" ) {
          return this.currentValuesClone();
        } else {
          return entityList;
        }
      })
    );
  }

  /**
   * Registers a get query with the cache. The query values will be stored in the cache along
   * with the query details. If the query is run again then the previous response will be returned.
   *
   * @param pathKey the path for the query
   * @param response the observer of the data returned from the query
   * @returns the observer of the response
   */
   public registerGetQuery(pathKey: string, response: Observable<T>): Observable<T> {
    return response.pipe(
      tap((entity) => {
        this.queryKeys.set(pathKey, new QueryData(pathKey, this.cacheExpiryTime, entity));

        this.set(entity.key, entity);
      })
    );
  }

  /**
   * Has this query been run already?
   *
   * @param pathKey the query path
   * @returns true if the query has been run, and has not expired.
   */
  public ranQuery(pathKey: string): boolean {
    if ( this.queryKeys.has(pathKey) ) {
      const data : QueryData<T> | undefined = this.queryKeys.get(pathKey);
      if ( data?.hasExpired ) {
        this.queryKeys.delete(pathKey);
        return false;
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Creates a observable response for an array of values from the cache.
   *
   * This uses `onCacheHitReturn` to determine if all objects from the cache are returned, or only those that were in the
   * original query. By default, all are returned if there are no query parameters in the original request (eg. /api/campus vs /api/campus?name=fred).
   *
   * @param queryKey the query
   * @param options any options the accompany the query
   * @returns an observer with the required objects
   */
  public observerFor(queryKey: string, options?: RequestOptions<T>, onCompleteCallback?: (entity: T) => void): Observable<T[]> {
    const data : QueryData<T> | undefined = this.queryKeys.get(queryKey);
    const cache = this.cache;
    var response: T[];

    if (options?.onQueryCacheReturn === 'all' || (options?.onQueryCacheReturn === undefined && !options?.params?.toString().length)) {
      response = [...cache.values()];
    } else {
      response = data?.response as T[];
    }

    // Perform callback for all entities in response
    if ( onCompleteCallback ) {
      for(const entity of response) {
        onCompleteCallback(entity);
      }
    }

    return of(response);
  }

  /**
   * Creates a observable response for a value in the cache.
   *
   * @param queryKey the query
   * @param options any options the accompany the query
   * @returns an observer with the required objects
   */
   public observerForGet(queryKey: string, onCompleteCallback?: (entity: T) => void ): Observable<T> {
    const data : QueryData<T> | undefined = this.queryKeys.get(queryKey);

    // Mapping is complete as we have entity in cache
    if (onCompleteCallback) {
      onCompleteCallback(data?.response as T);
    }

    return of(data?.response as T);
  }

  /**
   * Iterate over all of the elements in the cache.
   *
   * @param fn the function to call for each element in the cache
   * @param thisArg Value to use as `this` when executing callback.
   */
  public forEach(fn: (value: T, key: string | number, map: Map<string | number, T>) => void, thisArg?: any): void {
    return this.cache.forEach(fn, thisArg)
  }
}
