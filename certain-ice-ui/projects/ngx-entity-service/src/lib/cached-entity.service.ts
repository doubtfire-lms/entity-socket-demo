import { EntityService } from './entity.service';
import { Entity } from './entity';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { EntityCache } from './entity-cache';
import { RequestOptions } from './request-options';
import { HttpParams, HttpParamsOptions } from '@angular/common/http';

/**
 * The CachedEntityService provides wraps the EntityService and provides a cache that stores
 * previously fetched entity objects from the server. Objects within the cache are updated when
 * new values are fetched from the server.
 */
export abstract class CachedEntityService<T extends Entity> extends EntityService<T> {
  private globalCache: EntityCache<T> = new EntityCache<T>();

  /**
   * Retrieve the cache object to use for the request.
   *
   * @param options The options of the request.
   * @returns The cache object to use.
   */
  private cacheFor(options?: RequestOptions<T>) : EntityCache<T> {
    return options?.cache || this.globalCache;
  }

  /**
   * Access the global entity cache.
   */
  public get cache(): EntityCache<T> {
    return this.globalCache;
  }

  /**
   * This function is used to map the path ids to a unique key to locate the associated entity
   * within the cache.
   *
   * @param pathIds the pathIds used to determine the key
   * @returns       a unique key to identify the associated entity
   */
  private keyFromPathIds(pathIds: any): string {
    if (pathIds?.key) {
      return pathIds.key;
    } else if (typeof pathIds === 'object' && this.keyName in pathIds) {
      return pathIds[this.keyName];
    } else {
      return pathIds;
    }
  }

  /**
   * Create a key for a request, based on its path and parameters.
   *
   * @param pathIds the ids to embed in the uri
   * @param options the request options, with parameters and end point format
   * @returns a query string with the path and parameters
   */
  private queryKey(pathIds: any, options?: RequestOptions<T>): string {
    const object = { ...pathIds };
    if (typeof pathIds === 'number' || typeof pathIds === 'string') {
      object[this.keyName] = pathIds;
    }
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, object);

    const params = options?.params ? `?${new HttpParams({fromObject: options?.params} as HttpParamsOptions).toString()}` : '';
    return path + params;
  }

  /**
   * Make an update request to the endpoint, using the supplied object to identify which id to update.
   * If updated, the cache is updated ot set with the entity.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   */
  public update(pathIds: object | T, options?: RequestOptions<T>): Observable<T>;
  public update(pathIds: any, options?: RequestOptions<T>): Observable<T> {
    const cache = this.cacheFor(options);
    return super
      .update(pathIds, options)
      .pipe(tap((updatedEntity) => cache.set(updatedEntity.key, updatedEntity)));
  }

  /**
   * Make a query request (fetch all) to the end point, using the supplied parameters to determine path.
   * Caches all returned entities. This will **not** read Entities from the cache, instead you should
   * use `query` to query from the cache where possible. Use `fetchAll` in cases where you want to force
   * bypassing of the cache.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} an observable through which the response will be returned when complete
   */
   public fetchAll(pathIds?: object, options?: RequestOptions<T>): Observable<T[]> {
    const cache = this.cacheFor(options);
    return cache.registerQuery(this.queryKey(pathIds, options), super.query(pathIds, options), options);
  }

  /**
   * Retrieve entities from the cache, or make a query request (get all) to the end point using the supplied parameters to determine path.
   * Caches all returned entities. This will read values from the cache where the query has been made before. For example, if you do a
   * query with no parameters, then the first time this will make the request and subsequent calls will return from the cache. If you then
   * make a get request for a different query path, or a query with parameters, then get request will be made even if there is a related object
   * in the cache. This ensures that differences in calls are respected. Query can get a list of entities with minimal details, and then
   * a specific get request can be made to get the full details of a single entity (even though it is in the cache).
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} an observable through which the response will be returned when complete
   */
  public query(pathIds?: object, options?: RequestOptions<T>): Observable<T[]> {
    const cache = this.cacheFor(options);
    const queryKey = this.queryKey(pathIds, options);

    if (!options) {
      options = {};
    }
    // Set cache - will be this cache or cache from options (ensure object creation uses cache)
    options.cache = cache;

    if (cache.ranQuery(queryKey) ) {
      // Ensure callback on get from cache
      const onCompleteCallback = options?.mappingCompleteCallback || this.mapping.mappingCompleteCallback;
      return cache.observerFor(queryKey, options, onCompleteCallback);
    } else {
      return this.fetchAll(pathIds, options);
    }
  }

  /**
   * Bypass the cache and "fetch" the data from the server. This returns the Entity from the server and ensuring it is within the
   * cache. Use get to check for the object in the cache, and potentially avoid a get request to the server.
   *
   * @param pathIds Either the id, if a number and maps simple to ':id', otherwise an object
   *                with keys the match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   */
  public fetch(pathIds: number | string | Entity | object, options?: RequestOptions<T>): Observable<T>;
  public fetch(pathIds: any, options?: RequestOptions<T>): Observable<T> {
    const key: string = this.keyFromPathIds(pathIds);
    const cache = this.cacheFor(options);

    if (!options) {
      options = {};
    }
    // Set cache - will be this cache or cache from options (ensure object creation uses cache)
    options.cache = cache;

    return super.get(pathIds, options).pipe(tap((entity: T) => cache.set(entity.key, entity)));
  }

  /**
   * How to deal with get requests where there is an entity already in the cache.
   * When set to `cacheEntity` the entity will be returned from the cache, and no get request performed.
   * When set to `cacheQuery` it will check if that specific query has been made before, and then either
   * return the cached query response, or make a get request to the server.
   */
  protected cacheBehaviourOnGet: 'cacheQuery' | 'cacheEntity' = 'cacheEntity';

  private cacheBehaviourOnGetFor(options?: RequestOptions<T>): 'cacheQuery' | 'cacheEntity' {
    return options?.cacheBehaviourOnGet || this.cacheBehaviourOnGet;
  }

  /**
   * First, tries to retrieve from cache, the object with the id, or id field from the pathIds.
   * If found, return the item from cache, otherwise make a get request to the end point,
   * using the supplied parameters to determine path. Caches the returned object
   *
   * @param pathIds Either the id, if a number and maps simple to ':id', otherwise an object
   *                with keys the match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   */
  public get(pathIds: number | string | object, options?: RequestOptions<T>): Observable<T>;
  public get(pathIds: any, options?: RequestOptions<T>): Observable<T> {
    const cache = this.cacheFor(options);
    const queryKey = this.queryKey(pathIds, options);
    const behaviour = this.cacheBehaviourOnGetFor(options);
    const key: string = this.keyFromPathIds(pathIds);

    const onCompleteCallback = options?.mappingCompleteCallback || this.mapping.mappingCompleteCallback;

    // Have we run this query?
    if (behaviour === 'cacheQuery' && cache.ranQuery(queryKey)) {
      // Return the cached result
      return cache.observerForGet(queryKey, onCompleteCallback);
    } else if (behaviour === 'cacheEntity' && cache.has(key)) {
      const entity: T = cache.get(key) as T;

      // Assume the mapping is complete as we have entity in cache
      if (onCompleteCallback) {
        onCompleteCallback(entity);
      }

      return of(entity);
    } else {
      // We haven't run this query, so run it and cache the result
      // We must make sure the cache is set
      if (!options) {
        options = {};
      }
      // Set cache - will be this cache or cache from options
      options.cache = cache;

      return cache.registerGetQuery(
        queryKey,
        super.get(pathIds, options).pipe(
          map((responseEntity: T) => {
            // We have a new response object... but is it already in the cache?
            // this will happen if we are expanding an object that is already in the cache
            // in which case it is in the cache, but we have not run the query and using
            // `cacheQuery` behaviour.
            if (cache.has(responseEntity.key)) {
              // Dont use response entity! We want to return the cached version.
              const cachedEntity = cache.get(responseEntity.key) as T;
              // Update the cached version with the details from the response.
              Object.assign(cachedEntity, responseEntity);
              return cachedEntity;
            } else {
              cache.add(responseEntity);
              return responseEntity;
            }
          })
        )
      );
    }
  }

  /**
   * Make a create request to the endpoint, using the supplied parameters to determine the path.
   * The results of the request are cached using the key of the entity.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} a new cold observable with the newly created @type {T}
   */
  public create(pathIds: object, options?: RequestOptions<T>): Observable<T> {
    const cache = this.cacheFor(options);
    return super.create(pathIds, options).pipe(tap((entity) => cache.set(entity.key, entity)));
  }

  /**
   * Make a post request to the endpoint, using the details from the supplied entity to determine the path.
   * The results of the request are cached using the key of the entity.
   *
   * @param entity An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} a new cold observable with the newly created @type {T}
   */
   public store(entity: T, options?: RequestOptions<T>): Observable<T> {
    const cache = this.cacheFor(options);
    return super.store(entity, options).pipe(tap((reponseEntity) => cache.set(reponseEntity.key, reponseEntity)));
  }

  /**
   * Make a delete request to the end point, using the supplied parameters to determine path.
   * If deleted, the object is removed from the cache.
   *
   * @param pathIds Either the id, if a number and maps simple to ':id', otherwise an object
   *                with keys the match the placeholders within the endpointFormat string.
   * @param options Optional http options
   */
  public delete<S>(pathIds: number | object, options?: RequestOptions<T>): Observable<S>;
  public delete<S>(pathIds: any, options?: RequestOptions<T>): Observable<S> {
    const key: string = this.keyFromPathIds(pathIds);
    const cache = this.cacheFor(options);

    return super.delete<S>(pathIds, options).pipe(
      // Tap performs a side effect on Observable, but return it identical to the source.
      tap((response: S) => {
        if (cache.has(key)) {
          cache.delete(key);
        }
      })
    );
  }
}
