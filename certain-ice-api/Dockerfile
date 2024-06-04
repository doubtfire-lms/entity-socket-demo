FROM ruby:3.3

WORKDIR /api

RUN gem install bundler


# Install the Gems
COPY ./Gemfile ./Gemfile.lock /api/
RUN bundle update
RUN bundle install

EXPOSE 3001

ENV RAILS_ENV development
ENV PORT 3001
CMD bundle install && bundle exec rake db:migrate && bundle exec rails s -p 3001 -b 0.0.0.0
