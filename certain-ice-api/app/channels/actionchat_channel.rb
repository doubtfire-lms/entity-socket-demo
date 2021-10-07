class ActionchatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "actionchat_channel"
  end
  
  def receive(message)
    ActionCable.server.broadcast("actionchat_channel", message)
    end
  
  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end
end
