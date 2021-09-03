Rails.application.routes.draw do
  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
  resources :messages, only: [:new, :create]
  mount CertainIceApi => '/'
  mount GrapeSwaggerRails::Engine => '/api/docs'
end
