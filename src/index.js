import express, {json} from 'express';
import cors from 'cors';
import chalk from 'chalk';

const batePapoUolServer = express();
batePapoUolServer.use(cors());
batePapoUolServer.use(json());

const participantes = [
    {name: 'xxx', lastStatus: Date.now()},
]
const mensages = [
    {from: 'João', to: 'Todos', text: 'entra na sala...', type: 'status', time: '20:04:30'}, 
    {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'},  
]

batePapoUolServer.post('/participants', (request, response) => {
    if (!request.body.name || request.body.name === '') {
        response.status(409).send('Nome é obrigatório');
        return;
    } else if(participantes.find(participante => participante.name === request.body.name)) {
        response.status(409).send('Usuário já está online');
        return;    
    }
    participantes.push(request.body);
    response.status(201).send('Usuário criado');
})

batePapoUolServer.get('/participants', (request, response) => {
    response.send(participantes);
})

batePapoUolServer.post('messages', (request, response) => {
    const { to, text, type } = request.body;
    const { user } = request.headers;
    try {
        if (!to || to === '') 
            throw 'Destinatário é obrigatório';
        if (!text || text === '')    
            throw 'Mensagem é obrigatória';
        if (!type || type !== 'message' || type !== 'private_message')
            throw 'Tipo de mensagem é obrigatório';
        if (!user || user === '' || !participantes.find(participante => participante.name === user))
            throw 'Usuário não está online';
    } catch (error) {
        response.status(422).send(error);
        return;
    }
    response.status(201).send('Mensagem criada');
})

batePapoUolServer.get('/messages', (request, response) => {
    response.send(mensages);   
})

batePapoUolServer.post('/status', (request, response) => {
    const { user } = request.headers;
    const userLastStatus = Date.now()
    try {
        if (!user || user === '' || !participantes.find(participante => participante.name === user))
            throw 'Usuário não está online';
    } catch (error) {
        response.status(404).send(error);
        return;
    }
    participantes.find(participante => participante.name === user).lastStatus = userLastStatus;
    response.status(200).send('Status atualizado');
})

batePapoUolServer.listen(5000, () => {
    console.log(chalk.bold.yellow("Rodando em http://localhost:5000"));
})