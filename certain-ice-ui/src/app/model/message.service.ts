import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EntityService } from 'ngx-entity-service';
import { Message } from './message';
import API_URL from './apiURL';
import {io} from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable()
export class MessageService extends EntityService<Message> {
  entityName: string = 'Message';
  protected readonly endpointFormat = 'messages/:id:';
  readonly URI: string = "http://localhost:3000/";
  socket = io(this.URI);
  constructor(
    httpClient: HttpClient,
  ) {
    super(httpClient, API_URL);
  }

  newUserJoined(eventName: string){
    let observable =  new Observable<{user:String,message:String}>((subscriber) =>{
        this.socket.on(eventName, (data: any)=>{
            subscriber.next(data);
        })
        return () => {this.socket.disconnect();}
    });
    return observable;
  }
  joinRoom(eventName:string , data: any){
    this.socket.emit(eventName, data);
  }

  protected createInstanceFrom(json: any, other?: any): Message {
    const message = new Message();
    message.updateFromJson(json);
    return message;
  }

  public keyForJson(json: any): string {
    return json.id;
  }
}
