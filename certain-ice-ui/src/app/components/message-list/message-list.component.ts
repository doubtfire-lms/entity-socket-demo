import { HttpHeaders } from "@angular/common/http";
import { Component, NgModule, OnInit } from "@angular/core";
import { Message } from "src/app/model/message";
import { MessageService } from "src/app/model/message.service";
import * as ActionCable from 'actioncable';

@Component({
  selector: 'message-list',
  templateUrl: 'message-list.component.html',
  styleUrls: ['message-list.component.css'],
  providers:[MessageService],
})
export class MessageListComponent implements OnInit {
  messages: Message[] = new Array<Message>();
  private consumer: any;
  private channel: any; 
  user!: String;
  room!: String;
  editdata:any;
  messageArray:Array<{user:String, message:String}> = [];
  isEdit:boolean=false;
  constructor(
    private messageService: MessageService
  ) {
    this.messageService.newUserJoined('new user joined').subscribe(data =>this.messageArray.push(data));
  }
  join(){
    this.messageService.joinRoom('join',{user:this.user,room:this.room});
  }
  ngOnInit() 
  {
    this.consumer = ActionCable.createConsumer(`ws://localhost:3000/cable`);
    this.channel = this.consumer.subscriptions.create('ChatChannel', {
      connected() {
        console.log("connected");
      },
      disconnected() {
        console.log("disconnected");
      },
      received: (msgContent: any) => ( console.log(msgContent))
    });

    this.messageService.query().subscribe(
      (messages: Message[]) => {
        this.messages.push(...messages);
    });
    this.messageService.newUserJoined('message').subscribe((data: any)=>{
      console.log(data)
    })
  }

  public addMessage(content: string) 
  {
    const data = {
      content: content,
    }

    this.messageService.create(data).subscribe(
      (message: Message) => {
        this.messages.push(message);
    });
  }

  public deleteMessage(message: Message) 
  {
    this.messageService.delete(message).subscribe( (response : any) => { this.messages = this.messages.filter( (u: Message) => u.id != message.id ) } );
  }

  public editMessage(message: Message) 
  {
    this.isEdit=true;
    this.editdata=message;
  }

  public saveEditMessage(editdata:string){
    this.isEdit=false;
    this.editdata.content=editdata;
        const data = {
      content: editdata,
    }
       this.messageService.create(data).subscribe(
      (message: Message) => {
      }
    );
  }
}
