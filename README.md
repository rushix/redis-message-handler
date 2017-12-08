# redis-message-handler
redis based cluster message producer/handler  
## How to install
```
npm install redis-message-handler
```
  or  
```
git clone this repo
```
## How to configure
if defaults does not suits your needs:  
```
cd path/to/package  
vim ./src/app.js
```
edit values of 'config' and/or 'createClientOptions'
## How to run
```
npm start
```
starts one worker instance  
```
npm run emulate
```
starts random number(< 15) of worker instances  
killing them one by one with delay  
after that starts worker instance with 'getErrors' arg
