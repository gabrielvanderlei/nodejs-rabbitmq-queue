const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
const WebSocketServer = require('ws').Server;

const express = require('express')
const cors = require('cors')
const app = express()
const path = require('path');

app.use(express.json());
app.use(cors());

let channel, connection, queue;
let msgData = [];

const wss = new WebSocketServer({
    port: 8081,
    path: '/requests'
});

let wsList = [];
wss.on('connection', function (ws) {
    wsList.push(ws)
    
    msgData.map((msg) => {
        ws.send(msg)
    })
    
    ws.on('message', function (message) {
        console.log(message)
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    let msgList = []
    msgData.map((msg) => {
        try {
            var buf = Buffer.from(msg.content, 'ascii')
            console.log(buf)
            msgList.push(JSON.parse(buf))
        } catch(e) {
            console.log(e)
        }
    })

    res.send(msgList)
})


app.get("/request", async (req, res) => {
    const msg = {'id': Math.floor(Math.random() * 1000), 'email': 'user@domail.com', name: 'firstname lastname'};
    const exchange = 'user.signed_up';
    const routingKey = 'sign_up_email';
    await channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(msg)));

    res.send({
        message: 'OK'
    })
})

app.listen(process.env.PORT || 3000, async () => {
    console.log("App Listening")

    connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    queue = 'user.sign_up_email';
    
    channel = await connection.createChannel();
    channel.prefetch(10);
    
    process.once('SIGINT', async () => { 
        console.log('got sigint, closing connection');
        await channel.close();
        await connection.close(); 
        process.exit(0);
    });
    
    await channel.assertQueue(queue, {durable: true});
    await channel.consume(queue, async (msg) => {
            console.log('processing messages');      
            msgData.push(msg)
            wsList.map((ws) => {
                ws.send(msg);
            })
            await channel.ack(msg);
        }, 
        {
            noAck: false,
            consumerTag: 'email_consumer'
        }
    );
})