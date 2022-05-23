import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message, MessageKind } from '../model/message';
import API_URL from './apiURL';
import { CachedEntityService, Entity, EntityMapping } from 'projects/ngx-entity-service/src/public-api';

@Injectable()
export class MessageService extends CachedEntityService<Message> {
  protected readonly endpointFormat = 'messages/:id:';

  constructor(
    httpClient: HttpClient,
  ) {
    super(httpClient, API_URL);

    this.mapping.jsonCase = 'snake';

    this.mapping.addKeys(
      'id',
      'content',
      'messageColor',
      {
        keys: ['kind', 'message_kind'],
        toJsonFn: (entity: Entity, key: string, params?: any) => {
          const message = entity as Message;
          return message.kind?.id || null;
        },
        toEntityFn: (data: object, key: string, entity: Entity, params?: any) => {
          const kindStore: Map<string, MessageKind> = params as Map<string, MessageKind>;
          return kindStore.get(data['message_kind']);
        }
      }
    );
  }

  protected override createInstanceFrom(json: any, other?: any): Message {
    const message = new Message();
    return message;
  }

  public keyForJson(json: any): string {
    return json.id;
  }
}
