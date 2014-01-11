#!/bin/bash
git clone https://github.com/serhiy-yasko/bitstarter-fanbooker.git
cd bitstarter-fanbooker

npm install
npm install passport
npm install passport-local
npm install passport-facebook
npm install passport-twitter
npm install passport-google
npm install bcrypt-nodejs
npm install nodemailer
npm install simplesmtp
npm install mailparser

echo -e "\n\nNOW ENTER YOUR HEROKU PASSWORD"
# Set up heroku.
# - devcenter.heroku.com/articles/config-vars
# - devcenter.heroku.com/articles/heroku-postgresql
heroku login
heroku create
ssh-keygen -t rsa
heroku keys:add
heroku addons:add heroku-postgresql:dev
heroku pg:promote `heroku config | grep HEROKU_POSTGRESQL | cut -f1 -d':'`
heroku plugins:install git://github.com/ddollar/heroku-config.git

# Set up heroku configuration variables
# https://devcenter.heroku.com/articles/config-vars
# - Edit .env to include your own COINBASE_API_KEY and HEROKU_POSTGRES_URL.
# - Modify the .env.dummy file, and DO NOT check .env into the git repository.
# - See .env.dummy for details.
cp .env.dummy .env

# For local: setup postgres (one-time) and then run the local server
./pgsetup.sh
