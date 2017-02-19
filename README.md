# Copher API #

Running on Node.js, this app exposes an API for the Copher app

### How do I get set up? ###
* clone this repo
* install yarn (or npm)
* install node 7.5.0
* run `yarn install`
* create a `config/config.env` file (see structure below)
* run `yarn start`

#### config.env ####
```
ENV=development
PORT=3011
SSH_KEY_PATH=
PROD_HOST=
PROD_USER=
PROD_PATH=
```

### Deployment ###
```
shipit production deploy
```

### Who do I talk to? ###
guy.br7@gmail.com
