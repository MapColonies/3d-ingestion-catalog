# 3d-ingestion-catalog
A RESTful API for querying 3d metadata

The Catalog service is responsible for managing and providing metadata for models within the system. It serves as a central repository of information about various models, allowing users to easily discover and access the metadata associated with each model.

----------------------------------------

## Run Migrations
Run migrations before you start the app

## Migrations Development
* Update metadata file or change DB details (fakeDB for example)
* npm run migration:create

### Shell
Run the following command:

```sh
npm run migration:run
```

### Docker
Build the migrations image:

```sh
docker build -t 3d-ingestion-catalog:latest -f migrations.Dockerfile .
```
Run image:
```sh
docker run -it --rm --network host 3d-ingestion-catalog:latest
```

If you want to change the connection properties you can do it via either:
1. Env variables
2. Inject a config file based on your environment


Via env variables:
```sh
docker run -it -e DB_USERNAME=VALUE  -e DB_PASSWORD=VALUE -e DB_NAME=VALUE -e DB_TYPE=VALUE -e DB_HOST=VALUE -e DB_PORT=VALUE --rm --network host 3d-ingestion-catalog:latest
```

Via injecting a config file, assuming you want to run the migrations on your production:

production.json:
```json
{
  "openapiConfig": {
    "filePath": "./openapi3.yaml",
    "basePath": "/docs",
    "rawPath": "/api",
    "uiPath": "/api"
  },
  "logger": {
    "level": "info"
  },
  "server": {
    "port": "8085"
  },
  "db": {
    "type": "postgres",
    "username": "postgres",
    "password": "postgres",
    "database": "catalog",
    "port": 5432
  }
}
```
```sh
docker run -it --rm -e NODE_ENV=production --network host -v /path/to/proudction.json:/usr/app/config/production.json 3d-ingestion-catalog:latest
```
-------------------------------------------------------

## Build and Run

```sh
npm install
npm start
```
## Test
### Integration:
Test against a postgres db

```sh
DB_TYPE=postgres DB_HOST=VALUE DB_PORT=VALUE DB_USERNAME=VALUE DB_NAME=VALUE DB_PASSWORD=VALUE npm run test:integration
```

### Unit:
```sh
npm run test:unit
```
