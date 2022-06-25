import express, { json } from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';


dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db('batePapoUol');
});

const batePapoUolServer = express();
batePapoUolServer.use(cors());
batePapoUolServer.use(json());

const userSchema = joi.object({
    name: joi.string().required()
})

const headersSchema = joi.object({
    user: joi.string().required()
})

const sendMessageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required(),
})

batePapoUolServer.post('/participants', async (request, response) => {
    const validation = userSchema.validate(request.body, { abortEarly: true });
    if (validation.error) {
        response.sendStatus(422);
        return;
    }
    try {
        const participants = await db.collection('participants').find().toArray();
        validateOnlineParticipant(request, response, participants)
 
    } catch (error) {
        response.status(500);
    }
})

async function validateOnlineParticipant(request, response, participants) {
    const messageTime = dayjs().format('HH:mm:ss')
    const person = {
        name: request.body.name,
        lastStatus: Date.now()
    }
    const message = {
        from: request.body.name, to: 'todos', text: 'entra na sala...', type: 'status', time: messageTime
    }

    if (participants.find(participante => participante.name === request.body.name)) {
         return response.status(409).send('Usuário já está online'); 
    }
    try {
        const insertedPerson = await db.collection('participants').insertOne(person);
        const insertedMessage = await db.collection('messages').insertOne(message);
        response.status(201).send([insertedPerson, insertedMessage]);
        
    } catch (error) {
        response.status(500)
    }
}

batePapoUolServer.get('/participants', async (request, response) => {
    try {
        const participants = await db.collection('participants').find().toArray();
        response.status(200).send(participants);
    } catch (error) {
        response.status(500).send(error);
    }
})

batePapoUolServer.get('/messages', async (request, response) => {
    const { user } = request.headers;
    const { limit } = request.query;
    
    const validation = headersSchema.validate( {user: user} );
    if (validation.error) {
        response.sendStatus(422);
        return;
    }
    try {
        const messages = await db.collection('messages').find().toArray();
        const filteredMessages = messages.filter(message => message.to === 'Todos' || message.to === 'todos' || message.to === request.headers.user || message.from === request.headers.user);
        const start = filteredMessages.length - limit;
        const slicedMessages = filteredMessages.slice(start, filteredMessages.length);
        response.status(200).send(slicedMessages);
    } catch (error) {
        response.status(500).send(error);
    }
})

batePapoUolServer.post('/messages', async (request, response) => {
    const validation = sendMessageSchema.validate(request.body, { abortEarly: true });
    if (validation.error) {
        response.sendStatus(422);
        return;
    }
    try {
        const participants = await db.collection('participants').find().toArray();
        validateMessage(request, response, participants)
    } catch (error) {
        response.status(422).send(error);
    }
})

async function validateMessage(request, response, participants) {
    const { to, text, type } = request.body;
    const { user } = request.headers;
    const messageTime = dayjs().format('HH:mm:ss')
    const message = {
        from: user, to: to, text: text, type: type, time: messageTime
    }
    if (!participants.find(participante => participante.name === user)) {
        return response.status(422).send('Usuário não está online');
    }    
    try {
        const insertMessage = await db.collection('messages').insertOne(message);
        response.status(201).send(insertMessage);
    } catch (error) {
        response.status(500)          
    }   
}

batePapoUolServer.post('/status', async (request, response) => {
    const { user } = request.headers;
    const validation = headersSchema.validate( {user: user} );
    if (validation.error) {
        response.sendStatus(422);
        return;
    } 
    try {
        const participants = await db.collection('participants').find().toArray();
        validateStatus(user, response, participants)
        
    } catch (error) {
        response.status(500).send(error);
        return;
    }
})

async function validateStatus(user, response, participants) {
    const userLastStatus = Date.now()
    if (!participants.find(participante => participante.name === user)) {
        return response.status(404).send('Usuário não está online');
    }
    try {
        const participantsCollection = db.collection('participants');
        const updateStatus = await participantsCollection.updateOne({ name: user }, { $set: { lastStatus: userLastStatus } });
        response.status(200).send(updateStatus);
    } catch (error) {
        response.status(500).send(error);            
    }
}

async function removeUsers() {
    const rightNow = Date.now();
    try {
        const participantsCollection = db.collection('participants');
        const participants = await participantsCollection.find().toArray();
        participants.forEach(participant => {
            if (rightNow - participant.lastStatus > 10000) {
                participantsCollection.deleteOne({ name: participant.name });
            }
        })
    } catch (error) {
        console.log(chalk.bold.redBright(error));
    }
}

setInterval(removeUsers, 15000);

batePapoUolServer.listen(5000, () => {
    console.log(chalk.bold.yellow("Rodando em http:localhost:5000"));
})