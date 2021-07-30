require 'grape'

class UsersApi < Grape::API

  desc 'Allow creation of a user'
  params do
    requires :username, type: String, desc: 'The username used for login'
    requires :name, type: String, desc: 'The user\'s name'
    requires :password, type: String, desc: 'The in-no-way secure password'
  end
  post '/users' do
    user_parameters = ActionController::Parameters.new(params)
      .permit(
        :username,
        :name,
        :password
      )

    User.create!(user_parameters)
  end

  desc 'Allow updating of a user'
  params do
    optional :username, type: String, desc: 'The username used for login'
    optional :name, type: String, desc: 'The user\'s name'
    optional :password, type: String, desc: 'The in-no-way secure password'
  end
  put '/users/:id' do
    user_parameters = ActionController::Parameters.new(params)
      .permit(
        :username,
        :name,
        :password
      )

    User.find(params[:id]).update! user_parameters
  end

  get '/users' do
    User.all
  end
end