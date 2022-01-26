import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';

import { UserService } from './model/user.service';
import { MessageService } from './model/message.service';
import { FormsModule } from "@angular/forms";
import { UserListComponent } from './components/user-list/user-list.component';
import { MessageListComponent } from './components/message-list/message-list.component';

@NgModule({
  declarations: [
    AppComponent,
    UserListComponent,
    MessageListComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    UserService,
    MessageService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
