import { Injectable, NgZone } from '@angular/core';
import * as ActionCable from 'actioncable';

@Injectable({
  providedIn: 'root'
})
export class ActionCableService {
  private consumer: any;
  constructor() {}
  subscribeMe() {
    this.consumer = ActionCable.createConsumer(`ws://localhost:3334/cable`);
    console.log("Trying connection");
    this.consumer.subscriptions.create("ChatChannel", {
      connected() {
        console.log("Subscription is ready for use");
      },
      disconnected() {
        console.log("Service terminated by WB server");
      },
      received(data: any) {
        console.log("This is the data received: ", data);
      }
    })
  }
 
}