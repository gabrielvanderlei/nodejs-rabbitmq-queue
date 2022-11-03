const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
const WebSocketServer = require('ws').Server;

const express = require('express')
const cors = require('cors')
const app = express()
const path = require('path');

let pendingRequestChannel, doneRequestChannel, sendMessageChannel, connection, queue;

let msgData = [];
let index = 0;

let wsList = [];
let authorized = [];

const wss = new WebSocketServer({
    port: 8080,
    path: '/requests'
});

wss.on('connection', function (ws) {
    wsList.push(ws)
    
    msgData.map((msg) => {
        ws.send(msg)
    })
    
    ws.on('message', async function (message) {
        let completeMessage = JSON.parse(message.toString());
        console.log(completeMessage)

        if(completeMessage.command == 'CREATE_REQUEST'){
            createPendingRequest();
        }

        if(completeMessage.command == 'REQUEST_DONE'){
            createDoneRequest(completeMessage.msg)
        }
    });
});

let createPendingRequest = async () => {
    console.log("CREATING REQUEST")
    const msg = {'id': Math.floor(Math.random() * 1000), 'data': 'Simple request'};
    const queue = 'requests.pending';
    await sendMessageChannel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
}

let createDoneRequest = async (msg) => {
    const queue = 'requests.done';
    await sendMessageChannel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
}

let readingPendingChannel = async () => {
    queue = 'requests.pending';
    pendingRequestChannel = await connection.createChannel();
    pendingRequestChannel.prefetch(10);

    await pendingRequestChannel.assertQueue(queue, {durable: true});
    await pendingRequestChannel.consume(queue, async (msg) => {
            let data = msg.content.toString();
            data = JSON.stringify({ ...JSON.parse(data), status: 'pending' });

            msgData.push(data)
            
            wsList.map((ws) => {
                ws.send(data);
            })
            
            await pendingRequestChannel.ack(msg);
        }, 
        {
            noAck: false,
            consumerTag: 'request_pending_consumer'
        }
    );
}

let readingDoneChannel = async () => {
    queue = 'requests.done';
    doneRequestChannel.prefetch(10);
    
    await doneRequestChannel.assertQueue(queue, {durable: true});
    await doneRequestChannel.consume(queue, async (msg) => {
            let data = msg.content.toString();
            data = JSON.stringify({ ...JSON.parse(data), status: 'done' });
            
            msgData.push(data)
            
            wsList.map((ws) => {
                ws.send(data);
            })
            
            await doneRequestChannel.ack(msg);
        }, 
        {
            noAck: false,
            consumerTag: 'request_done_consumer'
        }
    );
}

(async () => {
    connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    
    pendingRequestChannel = await connection.createChannel();
    doneRequestChannel = await connection.createChannel();
    sendMessageChannel = await connection.createChannel();

    console.log("STARTING CONSUMERS")
    await readingPendingChannel();
    await readingDoneChannel();
})()

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(process.env.PORT || 3000, async () => {
    console.log("App Listening")
})