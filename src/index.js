import express, {json} from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

const batePapoUolServer = express();
batePapoUolServer.use(cors());
batePapoUolServer.use(json());

batePapoUolServer.post('/participants', async (request, response) => {
    try {
        await mongoClient.connect();
        const db = mongoClient.db('batePapoUol');
        const participantsCollection = db.collection('participants');
        const participants = await participantsCollection.find().toArray();
        validateParticipant(request, response, participantsCollection, participants)
 
    } catch (error) {
        response.status(409).send(error);
    }
})

async function validateParticipant(request, response, participantsCollection, participants) {
    const person = {
        name: request.body.name,
        lastStatus: Date.now()
    }
    const message = {
        from: request.body.name, to: 'todos', text: 'entra na sala...', type: 'status', time: new Date().toLocaleTimeString()
    }

    if (!request.body.name || request.body.name === '') {
        return response.status(422).send('Nome é obrigatório');
    } else if (participants.find(participante => participante.name === request.body.name)) {
        return response.status(409).send('Usuário já está online'); 
    } else {
        try {
            console.log('foi?')
            const insertPerson = await participantsCollection.insertOne(person);
            await mongoClient.connect();
            const db = mongoClient.db('batePapoUol');
            const messagesCollection = db.collection('messages');
            const insertStatusMessage = await messagesCollection.insertOne(message);
            
        } catch (error) {
            response.status(500).send(error);
        }
        response.status(201).send(person);
    }
}

batePapoUolServer.get('/participants', async (request, response) => {
    try {
        await mongoClient.connect();
        const db = mongoClient.db('batePapoUol');
        const participantsCollection = db.collection('participants');
        const participants = await participantsCollection.find().toArray();
        response.status(200).send(participants);
    } catch (error) {
        response.status(500).send(error);
    }
})

batePapoUolServer.get('/messages', async (request, response) => {
    try {
        await mongoClient.connect();
        const db = mongoClient.db('batePapoUol');
        const messagesCollection = db.collection('messages');
        const messages = await messagesCollection.find().toArray();
        response.status(200).send(messages);
    } catch (error) {
        response.status(500).send(error);
    }
})

batePapoUolServer.post('/messages', async (request, response) => {
    const { to, text, type } = request.body;
    const { user } = request.headers;
    console.log(chalk.bold.red(request.headers, request.body));
    try {
        await mongoClient.connect();
        const db = mongoClient.db('batePapoUol');
        const participantsCollection = db.collection('participants');
        const participants = await participantsCollection.find().toArray();
        validateMessage(request, response, participantsCollection, participants)
    } catch (error) {
        response.status(422).send(error);
        return;
    }
    response.status(201).send('Mensagem criada');
})

async function validateMessage(request, response, participantsCollection, participants) {
    const { to, text, type } = request.body;
    const { user } = request.headers;
    const message = {
        from: user, to: to, text: text, type: type, time: new Date().toLocaleTimeString()
    }
    if (!to || to === '') {
        return response.status(422).send('Destinatário é obrigatório');
    } else if (!text || text === '') {
        return response.status(422).send('Mensagem é obrigatória');
    } else if (!type || (type !== 'message' && type !== 'private_message')) {
        return response.status(422).send('Tipo de mensagem é obrigatório');
    } else if (!user || user === '' || !participants.find(participante => participante.name === user)) {
        return response.status(422).send('Usuário não está online');
    } else {
        try {
            await mongoClient.connect();
            const db = mongoClient.db('batePapoUol');
            const messagesCollection = db.collection('messages');
            const insertMessage = await messagesCollection.insertOne(message);
            response.status(201).send("Mensagem enviada");
        } catch (error) {
            response.status(500).send(error);            
        }
    }
}

batePapoUolServer.post('/status', async (request, response) => {
    
    try {
        await mongoClient.connect();
        const db = mongoClient.db('batePapoUol');
        const participantsCollection = db.collection('participants');
        const participants = await participantsCollection.find().toArray();
        validateStatus(request, response, participantsCollection, participants)
        
    } catch (error) {
        response.status(404).send(error);
        return;
    }
})

async function validateStatus(request, response, participantsCollection, participants) {
    const { user } = request.headers;
    const userLastStatus = Date.now()
    if (!user || user === '' || !participants.find(participante => participante.name === user)) {
        return response.status(422).send('Usuário não está online');
    } else {
        try {
            await mongoClient.connect();
            const db = mongoClient.db('batePapoUol');
            const participantsCollection = db.collection('participants');
            const updateStatus = await participantsCollection.updateOne({ name: user }, { $set: { lastStatus: userLastStatus } });
            response.status(200).send('Status atualizado');
        } catch (error) {
            response.status(500).send(error);            
        }
    }
}

batePapoUolServer.listen(5000, () => {
    console.log(chalk.bold.yellow("Rodando em http:localhost:5000"));
})