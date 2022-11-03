# RabbitMQ Example
Used the following repository as base for docker implementation: https://github.com/geshan/nodejs-rabbitmq-docker

## How to use
You can test the code with the following command:
```bash
docker compose up --build
```

## How it's working?
In a brief, the code has a Websocket connected to two consumers:
- The first consumer reads the queue 'requests.pending'
- The second consumer reads the queue 'requests.done'
- The producers are all working with the Websocket server, but they can be structured to work in separated applications (connected with the same RabbitMQ server).

The data is managed with the following mechanism:
- When the user click in 'Create request' a new request will be sent in 'requests.pending'queue
- When the user click in 'Request done' the request data will be created in 'requests.done' queue
- The frontend is showing only the requests not marked as done

## References
- https://geshan.com.np/blog/2021/07/rabbitmq-docker-nodejs/