import { Entity } from './entity';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestOptions } from './request-options';
import { EntityMapping } from './entity-mapping';

/**
 * ResourceService, responsible for the CRUD actions for all resources which inherit form it.
 * This is used to interact with the server, and create Entity objects that are returned for
 * use within the application.
 */
export abstract class EntityService<T extends Entity> {
  /**
   * Provide a string template for the endpoint URLs in the format
   * 'path/to/:id1:/other/:id2:' where ':id1:' and ':id2:' are placeholders for id values
   * passed into the CRUD methods.
   *
   * Use :id for simple cases eg: 'users/:id:'. This can then be shortcut to provide just the
   * value without needing to indicate the key to replace. eg UserService.get(1) instead of
   * UserService.get({id: 1}])
   *
   * @returns {string} The endpoint string format
   */
  protected abstract readonly endpointFormat: string;

  /**
   * The base url of the api associated with this entity service.
   */
  protected apiUrl: string;

  /**
   * Details the process for mapping the entity from and to json. This should be
   * setup in the child class constructors, and will be used to map data from json
   * during building of the entity, and to json when transferring the entity to the
   * server.
   */
  public mapping: EntityMapping<T> = new EntityMapping<T>();

  /**
   * Construct the EntityService with the passed in HttpClient and apiUrl. This should be the
   * base class for a Angular service.
   *
   * @param httpClient the reference to the http client used to make http requests.
   * @param apiUrl the base url
   */
  constructor(private httpClient: HttpClient, apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * Helper function to convert end point format strings to final path
   *
   * @param path the end point format string with id placeholders
   * @param object the object to get id values from for the placeholder.
   * @returns {string} The endpoint.
   */
  protected buildEndpoint(path: string, object?: object): string {
    // Replace any keys with provided values
    if ( object ?? false ) {
      // search for replacement strings /.../:key:/../:key.elem.id:/...
      const regex = /:(.*?):/g;
      const subRegex = /([a-zA-Z0-9_$]+)(?=\.)?/g;

      path = path.replace(regex, (match, group) => {
        if (group) {
          let result = object;
          const matches = (group as string).match(subRegex)?.forEach(value => {
            result = result ? result[value] : undefined;
          });

          return result ? encodeURIComponent(`${result}`) : '';
        } else {
          return "";
        }
      })
    } else {
      // Strip any missed keys
      path = path.replace(/:[\w-]*?:/, '');
    }

    return `${this.apiUrl}/${path}`;
  }

  /**
   * Get the body for this request.
   *
   * @param pathIds the pathIds for the request
   * @param options the request options
   * @returns the body to use for the http request
   */
  private bodyFor(pathIds: object | T | any, options?: RequestOptions<T>): FormData | object | undefined {
    const mapping = this.mappingFor(options);
    return options?.body || options?.entity?.toJson(mapping, options?.ignoreKeys) || (typeof pathIds.toJson === 'function' ? pathIds.toJson(mapping) : pathIds);
  }

  /**
   * Get the constructor / map params for a request.
   *
   * @param options the request options
   * @returns the map params from the options, or the default options
   */
  private mappingFor(options?: RequestOptions<T>): EntityMapping<T> {
    return options?.mapping || this.mapping;
  }

  /**
   * Convert accepted data to @class Entity object
   *
   * @param json The json data to convert to T
   * @param constructorParams the data to be passed to the object construcrtor when creating the entity.
   */
  protected abstract createInstanceFrom(json: any, constructorParams?: any): T;

  /**
   * Create and then initialise an entity object.
   *
   * @param json The json data used to initialise the entity
   * @param mapping An optional mapping to use for the entity. When no mapping is provided, the default mapping is used.
   * @param options Any request options - to get the constructor params or mapping callback functions.
   * @returns a new instance of the entity, initialised with the json data.
   */
  public buildInstance(json: object, options?: RequestOptions<T>): T {
    const cache = options?.sourceCache || options?.cache;
    var result: T;

    // Get the mapping, constructorParams, and mapping callback from the request options, or mapping
    const mapping = this.mappingFor(options);
    const mappingCompleteCallback = options?.mappingCompleteCallback || mapping.mappingCompleteCallback;

    if (cache && cache.has(this.keyForJson(json))) {
      result = cache.get(this.keyForJson(json)) as T;
    } else if (options?.entity) {
      // Use the entity passed in to the options - allows for user to pass in the object to use as the new entity
      result = options.entity;
    } else {
      const constructorParams = options?.constructorParams || mapping.constructorParams;

      // Create the entity
      result = this.createInstanceFrom(json, constructorParams);
    }

    // Perform the mapping
    result.updateFromJson(json, mapping, mappingCompleteCallback);
    return result;
  }

  /**
   * Make a get request to the end point, using the supplied parameters to determine path.
   *
   * @param pathIds Either the id, if a number and maps simple to ':id', otherwise an object
   *                with keys the match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   */
  public get(pathIds: number | string | object, options?: RequestOptions<T>): Observable<T>;
  public get(pathIds: any, options?: RequestOptions<T>): Observable<T> {
    let object = pathIds;
    if (typeof pathIds === 'number' || typeof pathIds === 'string') {
      object = { };
      object[this.keyName] = pathIds;
    }

    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, object);

    return this.httpClient
      .get(path, options)
      .pipe(
        map(
          (rawData) =>
            this.buildInstance(rawData, options)
        )
      ); // Turn the raw JSON returned into the object T
  }

  /**
   * Make a query request (get all) to the end point, using the supplied parameters to determine path.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} which will be used to pass the resulting entity objects when the response is processed.
   */
  public query(pathIds?: object, options?: RequestOptions<T>): Observable<T[]> {
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, pathIds);
    return this.httpClient
      .get(path, options)
      .pipe(
        map(
          (rawData) => {
            const result = this.convertCollection(rawData instanceof Array ? rawData : [rawData], options)
            return result;
          }
        )
      );
  }

  /**
   * Make an update request to the endpoint, using the supplied object to identify which id to update.
   *
   * @param entity An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   *                When an entity is passed via options, this entity will be updated with the response from the call, and the entity
   *                parameter will be used for the request data.
   */
  public update(entity: object, options?: RequestOptions<T>): Observable<T>;
  public update(entity: T, options?: RequestOptions<T>): Observable<T> {
    // ensure that body is defined in options
    if (options === undefined) {
      options = {};
    }

    options.body = this.bodyFor(entity, options);

    // locate the entity in the request
    const responseEntity: T = options.entity || entity;

    // need to pass object through as path id and form data
    return this.put<T>(entity, options).pipe(
      map(
        (rawData) => {
          // Get the mapping, and mapping callback from the request options, or mapping
          const mapping = this.mappingFor(options);
          const mappingCompleteCallback = options?.mappingCompleteCallback || mapping.mappingCompleteCallback;

          responseEntity.updateFromJson(rawData, mapping, mappingCompleteCallback);
          return responseEntity;
        }
      )
    );
  }

  /**
   * Make an put request to the endpoint, indicating the type of data to be returned from the endpoint.
   * pathIds is used together with the endpointFormat to determine the path for the request. The body comes
   * from `options.body`, from calling `pathIds.toJson()`, or directly passing pathIds (in that order).
   *
   * @typeparam S The type of the data to be returned
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   */
  public put<S>(pathIds: object, options?: RequestOptions<T>): Observable<S> {
    const json = this.bodyFor(pathIds, options);
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, pathIds);

    return this.httpClient.put(path, json, options) as Observable<S>;
  }

  /**
   * Create a new entity by sending the supplied data to the endpoint, and converting the response to an
   * entity object. See `store` if you want to persist an entity object.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} a new cold observable with the newly created @type {T}
   */
  public create(pathIds: object, options?: RequestOptions<T>): Observable<T> {
    const json = this.bodyFor(pathIds, options);
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, pathIds);
    return this.httpClient.post(path, json, options)
      .pipe(
        map(
          (rawData) =>
            this.buildInstance(rawData, options)
        )
      );
  }

  /**
   * Save an entity by making a post request using the passed in entity. The response will be used to
   * update the entity.
   *
   * @param entity The entity object to be saved.
   * @param options Optional request options. This can be used to customise headers, parameters, or the body. Entity is ignored from the options.
   * @returns {Observable} a new cold observable with the newly created @type {T}
   */
  public store(entity: T, options?: RequestOptions<T>): Observable<T> {
    const json = this.bodyFor(entity, options);
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, entity);
    return this.httpClient.post(path, json, options)
      .pipe(
        map(
          (rawData) => {
            // Get the mapping, and mapping callback from the request options, or mapping
            const mapping = this.mappingFor(options);
            const mappingCompleteCallback = options?.mappingCompleteCallback || mapping.mappingCompleteCallback;

            entity.updateFromJson(rawData, mapping, mappingCompleteCallback);
            return entity;
          }
        )
      );
  }

  /**
   * Make a post request to create the passed in entity.
   *
   * @param pathIds An object with keys which match the placeholders within the endpointFormat string.
   * @param options Optional request options. This can be used to customise headers, parameters, body, or the associated entity object.
   * @returns {Observable} a new cold observable with the newly created @type {T}
   */
  public post<S>(pathIds: object, options?: RequestOptions<T>): Observable<S> {
    const json = this.bodyFor(pathIds, options);
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, pathIds);

    return this.httpClient.post(path, json, options) as Observable<S>;
  }

  /**
   * Make a delete request to the end point, using the supplied parameters to determine path.
   *
   * @param pathIds Either the id, if a number and maps simple to ':id', otherwise an object
   *                with keys the match the placeholders within the endpointFormat string.
   * @param options Optional http options
   */
  public delete<S>(pathIds: number | string | object, options?: RequestOptions<T>): Observable<S>;
  public delete<S>(pathIds: any, options?: RequestOptions<T>): Observable<S> {
    let object = pathIds;
    if (typeof pathIds === 'number' || typeof pathIds === 'string') {
      object = {}
      object[this.keyName] = pathIds;
    }
    const path = this.buildEndpoint(options?.endpointFormat || this.endpointFormat, object);

    return this.httpClient.delete<S>(path, options);
  }

  /**
   * Instantiates an array of elements as objects from the JSON returned
   * from the server.
   * @returns {T[]} The array of Objects
   */
  private convertCollection(collection: any, options?: RequestOptions<T>): T[] {
    return collection.map((
      data: any) => {
        if ( options?.cache && options.cache.has(this.keyForJson(data)) ) {
          const result = options.cache.get(this.keyForJson(data));
          result?.updateFromJson(data, this.mappingFor(options), options.mappingCompleteCallback);
        }
      const result = this.buildInstance(data, options);
      return result;
    });
  }

  /**
   * Gets the unique key for an entity of type @class Entity.
   * This is used to identify the object within a cache.
   * This uses `keyName` which defaults to 'id', but can
   * be overriden to change this behaviour.
   *
   * @param json The json object to get the key from
   * @returns string containing the unique key value
   */
  public keyForJson(json: any): string | number {
    return json[this.keyName];
  }

  /**
   * Gets the name of the property used for the unique key in the entity associated
   * with this service.
   */
  public get keyName(): string {
    return 'id';
  }
}
