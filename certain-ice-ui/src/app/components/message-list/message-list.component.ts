import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Message } from 'src/app/model/message';
import { MessageService } from 'src/app/model/message.service';
import * as ActionCable from 'actioncable';
import { CachedEntityService } from 'src/app/model/cached-entity.service';

@Component({
  selector: 'message-list',
  templateUrl: 'message-list.component.html',
  styleUrls: ['message-list.component.css'],
})
export class MessageListComponent implements OnInit {
  messages: Message[] = new Array<Message>();
  private consumer: any;
  // private cable: ActionCable.Cable;
  // private subscription: ActionCable.Channel.ActionchatChannel;
  public channel: any;
  public msgCount = 0;
  public sender = false;
  constructor(public messageService: MessageService) { }

  ngOnInit() {
    this.consumer = ActionCable.createConsumer(`ws://localhost:3000/cable`);
    this.channel = this.consumer.subscriptions.create('ActionchatChannel', {
      connected() {
      },
      disconnected() {
      },
      received: (msgContent: any) => this.retrieveMessages(msgContent),
    });
  }

  ngAfterViewInit() {
    this.messageService.query().subscribe((messages: Message[]) => {
      this.msgCount = messages.length;
      this.messages.push(...messages);
    });
  }

  public addMessage(content: object) {
    this.messageService
      .create(undefined, content)
      .subscribe((message: Message) => {
        this.messages.push(message);
      });
  }

  public retrieveMessages(msgContent: any) {
      this.addMessage(msgContent);
  }

  public sendMessage(msgContent: string) {
    this.sender = true;
    this.channel.send({ content: msgContent });
  }

  public deleteMessage(message: Message) {
    this.messageService.delete(message).subscribe((response: any) => {
      this.messages = this.messages.filter((u: Message) => u.id != message.id);
    });
  }
}
